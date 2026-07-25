from collections.abc import Iterator
from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models import GemmaResult, IncidentStatus, Priority
from app.repositories import IncidentRepository, get_incident_repository
from app.services import StoredEvidence, get_evidence_storage, get_incident_analyzer


class FakeEvidenceStorage:
    def __init__(self) -> None:
        self.removed: list[str] = []

    async def upload(self, client_id, file, media_type: str) -> StoredEvidence:
        del client_id, media_type
        content = await file.read()
        return StoredEvidence(
            path=file.filename or "evidence",
            content_type=file.content_type or "application/octet-stream",
            size_bytes=len(content),
        )

    def remove(self, paths: list[str]) -> None:
        self.removed.extend(paths)


@pytest.fixture
def repository() -> IncidentRepository:
    return IncidentRepository()


@pytest.fixture
def client(repository: IncidentRepository) -> Iterator[TestClient]:
    app.dependency_overrides[get_incident_repository] = lambda: repository
    app.dependency_overrides[get_evidence_storage] = FakeEvidenceStorage
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def incident_form(**overrides: str) -> dict[str, str]:
    data = {
        "client_id": str(uuid4()),
        "description": "Edificio con grietas visibles tras el sismo.",
        "lat": "-12.0464",
        "lon": "-77.0428",
        "created_at_client": datetime.now(UTC).isoformat(),
    }
    data.update(overrides)
    return data


def photo_files() -> list[tuple[str, tuple[str, bytes, str]]]:
    return [("photos", ("evidence.jpg", b"image-content", "image/jpeg"))]


def create_incident(client: TestClient, **overrides: str):
    return client.post(
        "/incidents",
        data=incident_form(**overrides),
        files=photo_files(),
    )


def batch_item(**overrides: object) -> dict[str, object]:
    item: dict[str, object] = {
        "client_id": str(uuid4()),
        "description": "Una vía quedó bloqueada por escombros.",
        "lat": -12.065,
        "lon": -75.204,
        "created_at_client": datetime.now(UTC).isoformat(),
        "photo_urls": ["https://storage.example/evidence/photo.jpg"],
    }
    item.update(overrides)
    return item


def test_healthcheck(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_incident_accepts_multipart(client: TestClient) -> None:
    client_id = str(uuid4())

    response = create_incident(client, client_id=client_id)

    assert response.status_code == 201
    assert response.json()["client_id"] == client_id
    assert response.json()["status"] == "validated"
    UUID(response.json()["incident_id"])


def test_list_and_get_incident_detail(client: TestClient) -> None:
    created = create_incident(client)
    incident_id = created.json()["incident_id"]

    listed = client.get("/incidents")
    detail = client.get(f"/incidents/{incident_id}")

    assert listed.status_code == 200
    assert len(listed.json()) == 1
    assert listed.json()[0]["id"] == incident_id
    assert listed.json()[0]["thumbnail_url"] == "evidence.jpg"
    assert detail.status_code == 200
    assert detail.json()["description"] == "Edificio con grietas visibles tras el sismo."
    assert detail.json()["photos"] == ["evidence.jpg"]
    assert detail.json()["priority"] == "baja"
    assert detail.json()["type"] == "otro"
    assert detail.json()["gemma_result"]["damage_level"] == "leve"


def test_unknown_incident_returns_404(client: TestClient) -> None:
    response = client.get(f"/incidents/{uuid4()}")

    assert response.status_code == 404


def test_list_incidents_filters_by_status_and_priority(
    client: TestClient,
    repository: IncidentRepository,
) -> None:
    created = create_incident(client)
    incident = repository.get(UUID(created.json()["incident_id"]))
    assert incident is not None
    incident.status = IncidentStatus.VALIDATED
    incident.priority = Priority.ALTA

    matching = client.get(
        "/incidents",
        params={"status": "validated", "priority": "alta"},
    )
    wrong_status = client.get("/incidents", params={"status": "processing"})
    wrong_priority = client.get("/incidents", params={"priority": "baja"})

    assert matching.status_code == 200
    assert [item["id"] for item in matching.json()] == [created.json()["incident_id"]]
    assert wrong_status.json() == []
    assert wrong_priority.json() == []


def test_list_incidents_filters_by_bbox(client: TestClient) -> None:
    client_id = str(uuid4())
    response = client.post(
        "/sync/batch",
        json={"incidents": [batch_item(client_id=client_id, lat=-12.0464, lon=-77.0428)]},
    )
    assert response.status_code == 200

    inside = client.get("/incidents", params={"bbox": "-77.10,-12.10,-77.00,-12.00"})
    outside = client.get("/incidents", params={"bbox": "-76.90,-12.10,-76.80,-12.00"})

    assert inside.status_code == 200
    assert [item["client_id"] for item in inside.json()] == [client_id]
    assert outside.status_code == 200
    assert outside.json() == []


@pytest.mark.parametrize(
    "bbox",
    [
        "-77,-12,-76",
        "west,south,east,north",
        "-181,-12,-76,-11",
        "-77,-91,-76,-11",
        "-76,-11,-77,-12",
    ],
)
def test_list_incidents_rejects_invalid_bbox(client: TestClient, bbox: str) -> None:
    response = client.get("/incidents", params={"bbox": bbox})

    assert response.status_code == 422


@pytest.mark.parametrize(
    ("overrides", "omit_files"),
    [
        ({"description": "corta"}, False),
        ({"lat": "91"}, False),
        ({"lon": "181"}, False),
        ({"client_id": "not-a-uuid"}, False),
        ({"created_at_client": "not-a-date"}, False),
        ({}, True),
    ],
)
def test_create_incident_rejects_invalid_input(
    client: TestClient,
    overrides: dict[str, str],
    omit_files: bool,
) -> None:
    response = client.post(
        "/incidents",
        data=incident_form(**overrides),
        files=None if omit_files else photo_files(),
    )

    assert response.status_code == 422


def test_batch_rejects_duplicate_client_ids_in_same_request(client: TestClient) -> None:
    client_id = str(uuid4())
    response = client.post(
        "/sync/batch",
        json={"incidents": [batch_item(client_id=client_id), batch_item(client_id=client_id)]},
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("photo_urls", ["local://evidence/photo.jpg"]),
        ("video_url", "file:///mobile/video.mp4"),
    ],
)
def test_batch_rejects_local_media_references(
    client: TestClient,
    field: str,
    value: object,
) -> None:
    response = client.post(
        "/sync/batch",
        json={"incidents": [batch_item(**{field: value})]},
    )

    assert response.status_code == 422


def test_create_incident_is_idempotent_by_client_id(client: TestClient) -> None:
    client_id = str(uuid4())

    first = create_incident(client, client_id=client_id)
    second = create_incident(client, client_id=client_id)
    listed = client.get("/incidents")

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["incident_id"] == second.json()["incident_id"]
    assert len(listed.json()) == 1


def test_batch_sync_is_idempotent(client: TestClient) -> None:
    client_id = str(uuid4())
    payload = {"incidents": [batch_item(client_id=client_id)]}

    first = client.post("/sync/batch", json=payload)
    second = client.post("/sync/batch", json=payload)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()[0]["created"] is True
    assert second.json()[0]["created"] is False
    assert first.json()[0]["incident_id"] == second.json()[0]["incident_id"]
    assert second.json()[0]["client_id"] == client_id


def test_simulated_processor_classifies_incident(client: TestClient) -> None:
    created = create_incident(
        client,
        description="Hay una persona atrapada dentro del edificio.",
    )
    detail = client.get(f"/incidents/{created.json()['incident_id']}")

    assert created.json()["status"] == "validated"
    assert detail.json()["type"] == "persona_atrapada"
    assert detail.json()["priority"] == "alta"
    assert detail.json()["gemma_result"] == {
        "type": "persona_atrapada",
        "damage_level": "critico",
        "trapped_people_possible": True,
        "secondary_risks": [],
            "priority": "alta",
            "explanation": "La descripción indica una posible persona atrapada.",
            "confidence": 1.0,
        }


def test_processor_receives_media_and_runs_once_on_multipart_retry(
    client: TestClient,
) -> None:
    calls: list[tuple[list[str], str]] = []

    async def analyzer(media_paths: list[str], description: str) -> GemmaResult:
        calls.append((media_paths, description))
        return GemmaResult(
            type="grietas",
            damage_level="moderado",
            trapped_people_possible=False,
            priority=Priority.MEDIA,
            explanation="Resultado controlado de prueba.",
        )

    app.dependency_overrides[get_incident_analyzer] = lambda: analyzer
    client_id = str(uuid4())

    first = create_incident(client, client_id=client_id)
    second = create_incident(client, client_id=client_id)

    assert first.json()["incident_id"] == second.json()["incident_id"]
    assert calls == [(["evidence.jpg"], "Edificio con grietas visibles tras el sismo.")]


def test_processor_failure_marks_incident_as_failed(client: TestClient) -> None:
    async def failing_analyzer(media_paths: list[str], description: str) -> GemmaResult:
        del media_paths, description
        raise RuntimeError("simulated failure")

    app.dependency_overrides[get_incident_analyzer] = lambda: failing_analyzer

    created = create_incident(client)
    detail = client.get(f"/incidents/{created.json()['incident_id']}")

    assert created.status_code == 201
    assert created.json()["status"] == "processing_failed"
    assert detail.json()["status"] == "processing_failed"
    assert detail.json()["gemma_result"] is None


def test_low_confidence_result_requires_review(client: TestClient) -> None:
    async def uncertain_analyzer(media_paths: list[str], description: str) -> GemmaResult:
        del media_paths, description
        return GemmaResult(
            type="otro",
            damage_level="leve",
            trapped_people_possible=False,
            priority=Priority.BAJA,
            explanation="La evidencia no permite una clasificación segura.",
            confidence=0.25,
        )

    app.dependency_overrides[get_incident_analyzer] = lambda: uncertain_analyzer

    created = create_incident(client)
    detail = client.get(f"/incidents/{created.json()['incident_id']}")

    assert created.json()["status"] == "needs_review"
    assert detail.json()["status"] == "needs_review"
    assert detail.json()["gemma_result"]["confidence"] == 0.25


def test_batch_processes_only_new_incidents(client: TestClient) -> None:
    calls = 0

    async def analyzer(media_paths: list[str], description: str) -> GemmaResult:
        nonlocal calls
        del media_paths, description
        calls += 1
        return GemmaResult(
            type="via_bloqueada",
            damage_level="moderado",
            trapped_people_possible=False,
            priority=Priority.MEDIA,
            explanation="Resultado controlado de prueba.",
        )

    app.dependency_overrides[get_incident_analyzer] = lambda: analyzer
    payload = {"incidents": [batch_item()]}

    first = client.post("/sync/batch", json=payload)
    second = client.post("/sync/batch", json=payload)

    assert first.json()[0]["status"] == "validated"
    assert second.json()[0]["created"] is False
    assert calls == 1


def test_uploaded_files_are_removed_when_persistence_fails(client: TestClient) -> None:
    class FailingRepository:
        def get_by_client_id(self, client_id):
            del client_id
            return None

        def create(self, payload, photos, video_url):
            del payload, photos, video_url
            raise RuntimeError("database unavailable")

    storage = FakeEvidenceStorage()
    app.dependency_overrides[get_incident_repository] = FailingRepository
    app.dependency_overrides[get_evidence_storage] = lambda: storage
    failure_client = TestClient(app, raise_server_exceptions=False)

    response = create_incident(failure_client)

    assert response.status_code == 500
    assert storage.removed == ["evidence.jpg"]
