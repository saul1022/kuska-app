from dataclasses import dataclass
from functools import lru_cache
from typing import Protocol
from uuid import UUID, uuid4

from fastapi import HTTPException, UploadFile

from app.config import get_settings
from supabase import Client, create_client

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/quicktime",
}
MAX_FILE_SIZE = 50 * 1024 * 1024
EXTENSIONS_BY_CONTENT_TYPE = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
}


def content_matches_type(content: bytes, content_type: str) -> bool:
    if content_type == "image/jpeg":
        return content.startswith(b"\xff\xd8\xff")
    if content_type == "image/png":
        return content.startswith(b"\x89PNG\r\n\x1a\n")
    if content_type == "image/webp":
        return len(content) >= 12 and content.startswith(b"RIFF") and content[8:12] == b"WEBP"
    if content_type in {"video/mp4", "video/quicktime"}:
        return len(content) >= 12 and content[4:8] == b"ftyp"
    return False


@dataclass(frozen=True)
class StoredEvidence:
    path: str
    content_type: str
    size_bytes: int


class EvidenceStorage(Protocol):
    async def upload(
        self,
        client_id: UUID,
        file: UploadFile,
        media_type: str,
    ) -> StoredEvidence: ...

    def remove(self, paths: list[str]) -> None: ...


class SupabaseEvidenceStorage:
    def __init__(self, client: Client, bucket: str) -> None:
        self._bucket = client.storage.from_(bucket)

    async def upload(self, client_id: UUID, file: UploadFile, media_type: str) -> StoredEvidence:
        content_type = file.content_type or "application/octet-stream"
        if content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=415,
                detail=f"Tipo de archivo no permitido: {content_type}",
            )

        content = await file.read(MAX_FILE_SIZE + 1)
        if not content:
            raise HTTPException(status_code=422, detail="El archivo de evidencia está vacío")
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="El archivo supera el límite de 50 MB")
        if not content_matches_type(content, content_type):
            raise HTTPException(
                status_code=415,
                detail="El contenido del archivo no coincide con su tipo declarado",
            )

        suffix = EXTENSIONS_BY_CONTENT_TYPE[content_type]
        path = f"{client_id}/{media_type}/{uuid4()}{suffix}"
        self._bucket.upload(path, content, {"content-type": content_type, "upsert": "false"})
        return StoredEvidence(path=path, content_type=content_type, size_bytes=len(content))

    def remove(self, paths: list[str]) -> None:
        if paths:
            self._bucket.remove(paths)


@lru_cache
def get_evidence_storage() -> EvidenceStorage:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_key:
        raise RuntimeError("Supabase Storage no está configurado")
    client = create_client(settings.supabase_url, settings.supabase_service_key)
    return SupabaseEvidenceStorage(client, settings.supabase_storage_bucket)
