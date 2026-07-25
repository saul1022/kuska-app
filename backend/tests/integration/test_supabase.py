import asyncio
import base64
import os
from datetime import UTC, datetime
from io import BytesIO
from uuid import uuid4

import pytest
from fastapi import UploadFile
from starlette.datastructures import Headers

from app.config import get_settings
from app.models import IncidentCreate
from app.repositories.supabase_incidents import SupabaseIncidentRepository
from app.services.evidence_storage import SupabaseEvidenceStorage
from app.services.gemma_processor import GemmaIncidentAnalyzer
from supabase import create_client

pytestmark = pytest.mark.integration

ONE_PIXEL_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


def require_supabase_integration() -> None:
    if os.getenv("RUN_SUPABASE_INTEGRATION") != "1":
        pytest.skip("Activa RUN_SUPABASE_INTEGRATION=1 para usar Supabase real")


def test_supabase_persistence_storage_and_idempotency() -> None:
    require_supabase_integration()
    settings = get_settings()
    assert settings.supabase_url and settings.supabase_service_key
    client = create_client(settings.supabase_url, settings.supabase_service_key)
    repository = SupabaseIncidentRepository(client, settings.supabase_storage_bucket)
    storage = SupabaseEvidenceStorage(client, settings.supabase_storage_bucket)
    client_id = uuid4()
    incident_id = None
    stored_path = None

    try:
        file = UploadFile(
            file=BytesIO(b"\xff\xd8\xffintegration-image"),
            filename="integration.jpg",
            headers=Headers({"content-type": "image/jpeg"}),
        )
        stored = asyncio.run(storage.upload(client_id, file, "photo"))
        stored_path = stored.path
        payload = IncidentCreate(
            client_id=client_id,
            description="Prueba permanente de integración con Supabase.",
            lat=-12.0464,
            lon=-77.0428,
            created_at_client=datetime.now(UTC),
        )

        first, created = repository.create(payload, [stored.path])
        incident_id = first.id
        second_repository = SupabaseIncidentRepository(client, settings.supabase_storage_bucket)
        persisted = second_repository.get(first.id)
        duplicate, duplicate_created = second_repository.create(payload, [stored.path])

        assert created is True
        assert persisted is not None
        assert persisted.client_id == client_id
        assert len(persisted.photos) == 1
        assert duplicate_created is False
        assert duplicate.id == first.id
    finally:
        if stored_path:
            storage.remove([stored_path])
        if incident_id:
            client.table("incidents").delete().eq("id", str(incident_id)).execute()


def test_gemma_with_real_evidence() -> None:
    if os.getenv("RUN_GEMMA_INTEGRATION") != "1":
        pytest.skip("Activa RUN_GEMMA_INTEGRATION=1 para consumir cuota de Gemma")
    settings = get_settings()
    assert settings.genai_api_key and settings.supabase_url and settings.supabase_service_key
    client = create_client(settings.supabase_url, settings.supabase_service_key)
    storage = SupabaseEvidenceStorage(client, settings.supabase_storage_bucket)
    stored_path = None

    try:
        file = UploadFile(
            file=BytesIO(ONE_PIXEL_PNG),
            filename="gemma.png",
            headers=Headers({"content-type": "image/png"}),
        )
        stored = asyncio.run(storage.upload(uuid4(), file, "photo"))
        stored_path = stored.path
        analyzer = GemmaIncidentAnalyzer(
            settings.genai_api_key,
            settings.gemini_model,
            client,
            settings.supabase_storage_bucket,
        )
        result = asyncio.run(analyzer([stored.path], "Edificio con daños visibles."))

        assert 0 <= result.confidence <= 1
        assert result.explanation
    finally:
        if stored_path:
            storage.remove([stored_path])
