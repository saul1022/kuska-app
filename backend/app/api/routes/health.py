from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health", summary="Comprobar disponibilidad")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}

