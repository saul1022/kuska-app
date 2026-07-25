import asyncio
from io import BytesIO
from uuid import uuid4

import pytest
from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.testclient import TestClient
from starlette.datastructures import Headers

from app.config import Settings
from app.main import app
from app.middleware import RateLimitMiddleware
from app.services.evidence_storage import SupabaseEvidenceStorage, content_matches_type


class FakeBucket:
    def __init__(self) -> None:
        self.uploaded: list[tuple[str, bytes, dict]] = []

    def upload(self, path: str, content: bytes, options: dict) -> None:
        self.uploaded.append((path, content, options))

    def remove(self, paths: list[str]) -> None:
        del paths


class FakeStorage:
    def __init__(self, bucket: FakeBucket) -> None:
        self._bucket = bucket

    def from_(self, name: str) -> FakeBucket:
        del name
        return self._bucket


class FakeSupabaseClient:
    def __init__(self, bucket: FakeBucket) -> None:
        self.storage = FakeStorage(bucket)


def upload_file(content: bytes, content_type: str) -> UploadFile:
    return UploadFile(
        file=BytesIO(content),
        filename="untrusted.exe",
        headers=Headers({"content-type": content_type}),
    )


def test_storage_validates_content_and_uses_safe_extension() -> None:
    bucket = FakeBucket()
    storage = SupabaseEvidenceStorage(FakeSupabaseClient(bucket), "evidence")

    result = asyncio.run(
        storage.upload(uuid4(), upload_file(b"\xff\xd8\xffimage", "image/jpeg"), "photo")
    )

    assert result.path.endswith(".jpg")
    assert not result.path.endswith(".exe")
    assert bucket.uploaded[0][1] == b"\xff\xd8\xffimage"


def test_storage_rejects_spoofed_content_type() -> None:
    bucket = FakeBucket()
    storage = SupabaseEvidenceStorage(FakeSupabaseClient(bucket), "evidence")

    with pytest.raises(HTTPException) as error:
        asyncio.run(storage.upload(uuid4(), upload_file(b"not-an-image", "image/jpeg"), "photo"))

    assert error.value.status_code == 415


def test_storage_rejects_disallowed_content_type() -> None:
    bucket = FakeBucket()
    storage = SupabaseEvidenceStorage(FakeSupabaseClient(bucket), "evidence")

    with pytest.raises(HTTPException) as error:
        file = upload_file(b"executable", "application/x-msdownload")
        asyncio.run(storage.upload(uuid4(), file, "photo"))

    assert error.value.status_code == 415


@pytest.mark.parametrize(
    ("content", "content_type"),
    [
        (b"\xff\xd8\xffdata", "image/jpeg"),
        (b"\x89PNG\r\n\x1a\ndata", "image/png"),
        (b"RIFF0000WEBPdata", "image/webp"),
        (b"0000ftypisomdata", "video/mp4"),
    ],
)
def test_supported_file_signatures(content: bytes, content_type: str) -> None:
    assert content_matches_type(content, content_type)


def test_security_headers_and_trusted_hosts() -> None:
    client = TestClient(app)

    response = client.get("/health")
    untrusted = client.get("/health", headers={"host": "attacker.example"})

    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "no-referrer"
    assert untrusted.status_code == 400


def test_cors_only_allows_configured_origins() -> None:
    client = TestClient(app)

    allowed = client.options(
        "/incidents",
        headers={
            "origin": "http://localhost:3000",
            "access-control-request-method": "GET",
        },
    )
    denied = client.options(
        "/incidents",
        headers={
            "origin": "https://attacker.example",
            "access-control-request-method": "GET",
        },
    )

    assert allowed.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert "access-control-allow-origin" not in denied.headers


def test_production_rejects_wildcard_cors() -> None:
    with pytest.raises(ValueError, match="CORS"):
        Settings(app_env="production", app_cors_origins="*", _env_file=None)


def test_rate_limit_returns_429() -> None:
    limited_app = FastAPI()
    limited_app.add_middleware(RateLimitMiddleware, requests_per_minute=2)

    @limited_app.get("/incidents/check")
    async def check() -> dict[str, bool]:
        return {"ok": True}

    client = TestClient(limited_app)

    assert client.get("/incidents/check").status_code == 200
    assert client.get("/incidents/check").status_code == 200
    limited = client.get("/incidents/check")
    assert limited.status_code == 429
    assert limited.headers["retry-after"] == "60"


def test_secret_files_are_ignored_by_git() -> None:
    patterns = set(open(".gitignore", encoding="utf-8").read().splitlines())

    assert ".env" in patterns
    assert ".env.local" in patterns
