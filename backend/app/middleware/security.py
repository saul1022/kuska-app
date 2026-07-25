from collections import defaultdict, deque
from collections.abc import Awaitable, Callable
from time import monotonic

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int) -> None:
        super().__init__(app)
        self._limit = requests_per_minute
        self._requests: dict[str, deque[float]] = defaultdict(deque)

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        if self._limit <= 0 or not request.url.path.startswith(("/incidents", "/sync")):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = monotonic()
        timestamps = self._requests[client_ip]
        while timestamps and now - timestamps[0] >= 60:
            timestamps.popleft()
        if len(timestamps) >= self._limit:
            return Response(
                content='{"detail":"Demasiadas solicitudes; inténtalo nuevamente en un minuto"}',
                status_code=429,
                media_type="application/json",
                headers={"Retry-After": "60"},
            )
        timestamps.append(now)
        return await call_next(request)
