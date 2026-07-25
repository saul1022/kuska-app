import mimetypes

import httpx
from google import genai
from google.genai import types

from app.models import GemmaResult
from supabase import Client

PROMPT = """Eres un sistema de apoyo a la respuesta ante desastres post-sismo.
Analiza la evidencia y la descripción del ciudadano. Clasifica el incidente con prudencia.

Usa EXACTAMENTE uno de estos valores en cada campo, sin inventar etiquetas nuevas:
- type: colapso_estructural | grietas | incendio | persona_atrapada | via_bloqueada | otro
- damage_level: leve | moderado | severo | critico
- priority: alta | media | baja

La confianza debe estar entre 0 y 1; usa un valor bajo si la evidencia es ambigua.
Descripción del ciudadano: {description}
"""


class GemmaIncidentAnalyzer:
    def __init__(
        self,
        api_key: str,
        model: str,
        supabase_client: Client,
        bucket: str,
    ) -> None:
        self._client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=30_000),
        )
        self._model = model
        self._bucket = supabase_client.storage.from_(bucket)

    async def _load_media(self, reference: str) -> tuple[bytes, str]:
        if reference.startswith(("http://", "https://")):
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(reference)
                response.raise_for_status()
                mime_type = response.headers.get("content-type", "application/octet-stream")
                return response.content, mime_type.split(";", 1)[0]

        content = self._bucket.download(reference)
        mime_type = mimetypes.guess_type(reference)[0] or "application/octet-stream"
        return content, mime_type

    async def __call__(self, media_paths: list[str], description: str) -> GemmaResult:
        prompt = PROMPT.format(description=description)
        parts: list[types.Part] = [types.Part.from_text(text=prompt)]
        for reference in media_paths:
            content, mime_type = await self._load_media(reference)
            parts.append(types.Part.from_bytes(data=content, mime_type=mime_type))

        response = await self._client.aio.models.generate_content(
            model=self._model,
            contents=types.UserContent(parts=parts),
            config=types.GenerateContentConfig(
                temperature=0.1,
                response_mime_type="application/json",
                response_schema=GemmaResult,
            ),
        )
        if isinstance(response.parsed, GemmaResult):
            return response.parsed
        if response.parsed is not None:
            return GemmaResult.model_validate(response.parsed)
        if not response.text:
            raise ValueError("Gemma devolvió una respuesta vacía")
        return GemmaResult.model_validate_json(response.text)
