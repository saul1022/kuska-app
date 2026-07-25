from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.api.router import api_router
from app.config import get_settings
from app.middleware import RateLimitMiddleware, SecurityHeadersMiddleware


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        debug=settings.app_debug,
        description="API para registrar y consultar evidencia ciudadana post-sismo.",
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.allowed_hosts,
    )
    application.add_middleware(SecurityHeadersMiddleware)
    application.add_middleware(
        RateLimitMiddleware,
        requests_per_minute=settings.app_rate_limit_per_minute,
    )
    application.include_router(api_router)
    return application


app = create_app()
