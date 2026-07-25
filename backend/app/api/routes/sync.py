from typing import Annotated

from fastapi import APIRouter, Depends

from app.config import get_settings
from app.models import BatchSyncRequest, IncidentStatus, SyncResult
from app.repositories import IncidentRepository, get_incident_repository
from app.services import IncidentAnalyzer, get_incident_analyzer

router = APIRouter(prefix="/sync", tags=["sync"])
Repository = Annotated[IncidentRepository, Depends(get_incident_repository)]
Analyzer = Annotated[IncidentAnalyzer, Depends(get_incident_analyzer)]


@router.post("/batch", response_model=list[SyncResult])
async def sync_batch(
    payload: BatchSyncRequest,
    repository: Repository,
    analyzer: Analyzer,
) -> list[SyncResult]:
    results: list[SyncResult] = []
    for item in payload.incidents:
        incident, created = repository.create_from_batch(item)
        if created:
            media_paths = [*item.photo_urls, *([item.video_url] if item.video_url else [])]
            try:
                result = await analyzer(media_paths, item.description)
                analysis_status = (
                    IncidentStatus.NEEDS_REVIEW
                    if result.confidence < get_settings().gemini_review_threshold
                    else IncidentStatus.VALIDATED
                )
                incident = repository.save_analysis(incident.id, result, analysis_status)
            except Exception:
                incident = repository.mark_processing_failed(incident.id)
        results.append(
            SyncResult(
                incident_id=incident.id,
                client_id=incident.client_id,
                status=incident.status,
                created=created,
            )
        )
    return results
