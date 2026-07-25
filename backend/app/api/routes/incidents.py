import logging
from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status

from app.config import get_settings
from app.models import (
    IncidentAccepted,
    IncidentCreate,
    IncidentDetail,
    IncidentListItem,
    IncidentStatus,
    Priority,
)
from app.repositories import IncidentRepository, get_incident_repository
from app.services import (
    EvidenceStorage,
    IncidentAnalyzer,
    get_evidence_storage,
    get_incident_analyzer,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/incidents", tags=["incidents"])
Repository = Annotated[IncidentRepository, Depends(get_incident_repository)]
Analyzer = Annotated[IncidentAnalyzer, Depends(get_incident_analyzer)]
Storage = Annotated[EvidenceStorage, Depends(get_evidence_storage)]


def parse_bbox(value: str) -> tuple[float, float, float, float]:
    try:
        coordinates = tuple(float(part.strip()) for part in value.split(","))
    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail="bbox debe contener cuatro coordenadas numéricas",
        ) from error

    if len(coordinates) != 4:
        raise HTTPException(
            status_code=422,
            detail="bbox debe usar el formato min_lon,min_lat,max_lon,max_lat",
        )

    min_lon, min_lat, max_lon, max_lat = coordinates
    if not (-180 <= min_lon <= 180 and -180 <= max_lon <= 180):
        raise HTTPException(
            status_code=422,
            detail="Las longitudes de bbox deben estar entre -180 y 180",
        )
    if not (-90 <= min_lat <= 90 and -90 <= max_lat <= 90):
        raise HTTPException(
            status_code=422,
            detail="Las latitudes de bbox deben estar entre -90 y 90",
        )
    if min_lon > max_lon or min_lat > max_lat:
        raise HTTPException(
            status_code=422,
            detail="Los valores mínimos de bbox no pueden superar a los máximos",
        )

    return min_lon, min_lat, max_lon, max_lat


@router.post("", response_model=IncidentAccepted, status_code=status.HTTP_201_CREATED)
async def create_incident(
    repository: Repository,
    analyzer: Analyzer,
    storage: Storage,
    photos: Annotated[list[UploadFile], File()],
    description: Annotated[str, Form(min_length=10, max_length=2_000)],
    lat: Annotated[float, Form(ge=-90, le=90)],
    lon: Annotated[float, Form(ge=-180, le=180)],
    client_id: Annotated[UUID, Form()],
    created_at_client: Annotated[datetime, Form()],
    video: Annotated[UploadFile | str | None, File()] = None,
) -> IncidentAccepted:
    # Swagger UI envía "" cuando "Send empty value" queda marcado en un archivo opcional.
    if isinstance(video, str):
        video = None
    if not photos:
        raise HTTPException(status_code=422, detail="Se requiere al menos una fotografía")
    if len(photos) > 5:
        raise HTTPException(status_code=422, detail="Se permiten como máximo cinco fotografías")
    payload = IncidentCreate(
        description=description,
        lat=lat,
        lon=lon,
        client_id=client_id,
        created_at_client=created_at_client,
    )
    existing = repository.get_by_client_id(client_id)
    if existing is not None:
        return IncidentAccepted(
            incident_id=existing.id,
            client_id=existing.client_id,
            status=existing.status,
        )

    uploaded_paths: list[str] = []
    try:
        stored_photos = [await storage.upload(client_id, photo, "photo") for photo in photos]
        uploaded_paths.extend(item.path for item in stored_photos)
        stored_video = await storage.upload(client_id, video, "video") if video else None
        if stored_video:
            uploaded_paths.append(stored_video.path)
        incident, created = repository.create(
            payload,
            [item.path for item in stored_photos],
            stored_video.path if stored_video else None,
        )
    except Exception:
        storage.remove(uploaded_paths)
        raise

    if created:
        try:
            result = await analyzer(uploaded_paths, description)
            analysis_status = (
                IncidentStatus.NEEDS_REVIEW
                if result.confidence < get_settings().gemini_review_threshold
                else IncidentStatus.VALIDATED
            )
            incident = repository.save_analysis(incident.id, result, analysis_status)
        except Exception:
            logger.exception("Fallo el analisis del incidente %s", incident.id)
            incident = repository.mark_processing_failed(incident.id)
    return IncidentAccepted(
        incident_id=incident.id,
        client_id=incident.client_id,
        status=incident.status,
    )


@router.get("", response_model=list[IncidentListItem])
async def list_incidents(
    repository: Repository,
    incident_status: Annotated[IncidentStatus | None, Query(alias="status")] = None,
    priority: Priority | None = None,
    bbox: str | None = None,
) -> list[IncidentListItem]:
    incidents = repository.list(incident_status)
    if priority is not None:
        incidents = [item for item in incidents if item.priority == priority]
    if bbox is not None:
        min_lon, min_lat, max_lon, max_lat = parse_bbox(bbox)
        incidents = [
            item
            for item in incidents
            if min_lon <= item.lon <= max_lon and min_lat <= item.lat <= max_lat
        ]
    return [IncidentListItem(**item.model_dump()) for item in incidents]


@router.get("/{incident_id}", response_model=IncidentDetail)
async def get_incident(incident_id: UUID, repository: Repository) -> IncidentDetail:
    incident = repository.get(incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incidente no encontrado")
    return incident
