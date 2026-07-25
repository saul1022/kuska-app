from threading import Lock
from uuid import UUID, uuid4

from app.models import BatchSyncItem, GemmaResult, IncidentCreate, IncidentDetail, IncidentStatus


class IncidentRepository:
    """Repositorio temporal en memoria; conserva el contrato que usará Supabase."""

    def __init__(self) -> None:
        self._by_id: dict[UUID, IncidentDetail] = {}
        self._id_by_client: dict[UUID, UUID] = {}
        self._lock = Lock()

    def create(
        self,
        payload: IncidentCreate,
        photos: list[str] | None = None,
        video_url: str | None = None,
    ) -> tuple[IncidentDetail, bool]:
        with self._lock:
            existing_id = self._id_by_client.get(payload.client_id)
            if existing_id is not None:
                return self._by_id[existing_id], False

            incident_id = uuid4()
            photo_urls = photos or []
            incident = IncidentDetail(
                id=incident_id,
                client_id=payload.client_id,
                description=payload.description,
                lat=payload.lat,
                lon=payload.lon,
                status=IncidentStatus.PROCESSING,
                created_at=payload.created_at_client,
                created_at_client=payload.created_at_client,
                photos=photo_urls,
                video_url=video_url,
                thumbnail_url=photo_urls[0] if photo_urls else None,
            )
            self._by_id[incident_id] = incident
            self._id_by_client[payload.client_id] = incident_id
            return incident, True

    def create_from_batch(self, payload: BatchSyncItem) -> tuple[IncidentDetail, bool]:
        return self.create(payload, payload.photo_urls, payload.video_url)

    def list(self, status: IncidentStatus | None = None) -> list[IncidentDetail]:
        incidents = list(self._by_id.values())
        if status is not None:
            incidents = [incident for incident in incidents if incident.status == status]
        return sorted(incidents, key=lambda incident: incident.created_at, reverse=True)

    def get(self, incident_id: UUID) -> IncidentDetail | None:
        return self._by_id.get(incident_id)

    def get_by_client_id(self, client_id: UUID) -> IncidentDetail | None:
        incident_id = self._id_by_client.get(client_id)
        return self._by_id.get(incident_id) if incident_id is not None else None

    def save_analysis(
        self,
        incident_id: UUID,
        result: GemmaResult,
        status: IncidentStatus = IncidentStatus.VALIDATED,
    ) -> IncidentDetail:
        with self._lock:
            incident = self._by_id[incident_id]
            incident.gemma_result = result
            incident.type = result.type
            incident.priority = result.priority
            incident.status = status
            return incident

    def mark_processing_failed(self, incident_id: UUID) -> IncidentDetail:
        with self._lock:
            incident = self._by_id[incident_id]
            incident.status = IncidentStatus.PROCESSING_FAILED
            return incident


_repository = None


def get_incident_repository():
    global _repository
    if _repository is not None:
        return _repository

    from app.config import get_settings
    from app.repositories.supabase_incidents import SupabaseIncidentRepository
    from supabase import create_client

    settings = get_settings()
    if settings.supabase_url and settings.supabase_service_key:
        client = create_client(settings.supabase_url, settings.supabase_service_key)
        _repository = SupabaseIncidentRepository(client, settings.supabase_storage_bucket)
        return _repository

    _repository = IncidentRepository()
    return _repository
