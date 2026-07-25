from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.models import BatchSyncItem, GemmaResult, IncidentCreate, IncidentDetail, IncidentStatus
from supabase import Client


class SupabaseIncidentRepository:
    def __init__(self, client: Client, bucket: str) -> None:
        self._client = client
        self._bucket = client.storage.from_(bucket)

    def _media_urls(self, incident_id: UUID) -> tuple[list[str], str | None]:
        response = (
            self._client.table("incident_media")
            .select("media_type,storage_path,public_url")
            .eq("incident_id", str(incident_id))
            .order("created_at")
            .execute()
        )
        photos: list[str] = []
        video_url: str | None = None
        for media in response.data:
            url = media.get("public_url")
            if not url:
                signed = self._bucket.create_signed_url(media["storage_path"], 3600)
                url = signed.get("signedURL") or signed.get("signed_url")
            if media["media_type"] == "photo":
                photos.append(url)
            else:
                video_url = url
        return photos, video_url

    def _to_detail(self, row: dict) -> IncidentDetail:
        photos, video_url = self._media_urls(UUID(row["id"]))
        return IncidentDetail(
            id=row["id"],
            client_id=row["client_id"],
            description=row["description"],
            lat=row["lat"],
            lon=row["lon"],
            status=row["status"],
            priority=row.get("priority"),
            type=row.get("incident_type"),
            created_at=row["created_at"],
            created_at_client=row["created_at_client"],
            photos=photos,
            video_url=video_url,
            thumbnail_url=photos[0] if photos else None,
            gemma_result=row.get("gemma_result"),
        )

    def get_by_client_id(self, client_id: UUID) -> IncidentDetail | None:
        response = (
            self._client.table("incidents")
            .select("*")
            .eq("client_id", str(client_id))
            .limit(1)
            .execute()
        )
        return self._to_detail(response.data[0]) if response.data else None

    def create(
        self,
        payload: IncidentCreate,
        photos: list[str] | None = None,
        video_url: str | None = None,
    ) -> tuple[IncidentDetail, bool]:
        existing = self.get_by_client_id(payload.client_id)
        if existing is not None:
            return existing, False

        incident_id = uuid4()
        row = {
            "id": str(incident_id),
            "client_id": str(payload.client_id),
            "description": payload.description,
            "lat": payload.lat,
            "lon": payload.lon,
            "status": IncidentStatus.PROCESSING,
            "created_at": datetime.now(UTC).isoformat(),
            "created_at_client": payload.created_at_client.isoformat(),
        }
        inserted = self._client.table("incidents").insert(row).execute().data[0]
        media_rows: list[dict] = []
        for index, reference in enumerate(photos or []):
            is_external = reference.startswith(("http://", "https://"))
            media_rows.append(
                {
                    "incident_id": str(incident_id),
                    "media_type": "photo",
                    "storage_path": (
                        f"external/{incident_id}/photo-{index}" if is_external else reference
                    ),
                    "public_url": reference if is_external else None,
                }
            )
        if video_url:
            is_external = video_url.startswith(("http://", "https://"))
            media_rows.append(
                {
                    "incident_id": str(incident_id),
                    "media_type": "video",
                    "storage_path": f"external/{incident_id}/video" if is_external else video_url,
                    "public_url": video_url if is_external else None,
                }
            )
        if media_rows:
            try:
                self._client.table("incident_media").insert(media_rows).execute()
            except Exception:
                self._client.table("incidents").delete().eq("id", str(incident_id)).execute()
                raise
        return self._to_detail(inserted), True

    def create_from_batch(self, payload: BatchSyncItem) -> tuple[IncidentDetail, bool]:
        return self.create(payload, payload.photo_urls, payload.video_url)

    def list(self, status: IncidentStatus | None = None) -> list[IncidentDetail]:
        query = self._client.table("incidents").select("*")
        if status is not None:
            query = query.eq("status", status.value)
        response = query.order("created_at", desc=True).execute()
        return [self._to_detail(row) for row in response.data]

    def get(self, incident_id: UUID) -> IncidentDetail | None:
        response = (
            self._client.table("incidents")
            .select("*")
            .eq("id", str(incident_id))
            .limit(1)
            .execute()
        )
        return self._to_detail(response.data[0]) if response.data else None

    def save_analysis(
        self,
        incident_id: UUID,
        result: GemmaResult,
        status: IncidentStatus = IncidentStatus.VALIDATED,
    ) -> IncidentDetail:
        response = (
            self._client.table("incidents")
            .update(
                {
                    "gemma_result": result.model_dump(mode="json"),
                    "incident_type": result.type.value,
                    "priority": result.priority.value,
                    "status": status.value,
                }
            )
            .eq("id", str(incident_id))
            .execute()
        )
        return self._to_detail(response.data[0])

    def mark_processing_failed(self, incident_id: UUID) -> IncidentDetail:
        response = (
            self._client.table("incidents")
            .update({"status": IncidentStatus.PROCESSING_FAILED.value})
            .eq("id", str(incident_id))
            .execute()
        )
        return self._to_detail(response.data[0])
