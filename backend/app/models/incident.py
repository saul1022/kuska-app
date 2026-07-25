from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class IncidentStatus(StrEnum):
    PROCESSING = "processing"
    NEEDS_REVIEW = "needs_review"
    VALIDATED = "validated"
    PROCESSING_FAILED = "processing_failed"


class Priority(StrEnum):
    ALTA = "alta"
    MEDIA = "media"
    BAJA = "baja"


class IncidentType(StrEnum):
    COLAPSO_ESTRUCTURAL = "colapso_estructural"
    GRIETAS = "grietas"
    INCENDIO = "incendio"
    PERSONA_ATRAPADA = "persona_atrapada"
    VIA_BLOQUEADA = "via_bloqueada"
    OTRO = "otro"


class DamageLevel(StrEnum):
    LEVE = "leve"
    MODERADO = "moderado"
    SEVERO = "severo"
    CRITICO = "critico"


class GemmaResult(BaseModel):
    # Enums, no str libre: sin esto Gemma inventa etiquetas distintas en cada llamada
    # ("colapso de estructura", "total") y el dashboard no puede filtrar ni colorear.
    type: IncidentType
    damage_level: DamageLevel
    trapped_people_possible: bool
    secondary_risks: list[str] = Field(default_factory=list)
    priority: Priority
    explanation: str
    confidence: float = Field(default=1.0, ge=0, le=1)


class IncidentCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    description: str = Field(min_length=10, max_length=2_000)
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    client_id: UUID
    created_at_client: datetime


class BatchSyncItem(IncidentCreate):
    photo_urls: list[str] = Field(default_factory=list)
    video_url: str | None = None

    @field_validator("photo_urls")
    @classmethod
    def validate_photo_urls(cls, values: list[str]) -> list[str]:
        for value in values:
            if not value.startswith(("https://", "http://")):
                raise ValueError("photo_urls solo admite URLs HTTP accesibles por el backend")
        return values

    @field_validator("video_url")
    @classmethod
    def validate_video_url(cls, value: str | None) -> str | None:
        if value is not None and not value.startswith(("https://", "http://")):
            raise ValueError("video_url debe ser una URL HTTP accesible por el backend")
        return value


class BatchSyncRequest(BaseModel):
    incidents: list[BatchSyncItem] = Field(min_length=1, max_length=50)

    @model_validator(mode="after")
    def unique_client_ids(self) -> "BatchSyncRequest":
        ids = [item.client_id for item in self.incidents]
        if len(ids) != len(set(ids)):
            raise ValueError("client_id no puede repetirse dentro del mismo lote")
        return self


class IncidentAccepted(BaseModel):
    incident_id: UUID
    client_id: UUID
    status: IncidentStatus


class SyncResult(IncidentAccepted):
    created: bool


class IncidentListItem(BaseModel):
    id: UUID
    client_id: UUID
    lat: float
    lon: float
    priority: Priority | None = None
    type: str | None = None
    status: IncidentStatus
    created_at: datetime
    thumbnail_url: str | None = None


class IncidentDetail(IncidentListItem):
    description: str
    photos: list[str] = Field(default_factory=list)
    video_url: str | None = None
    created_at_client: datetime
    gemma_result: GemmaResult | None = None
