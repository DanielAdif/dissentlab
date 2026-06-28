import os
import json
import asyncio

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from storage.db import get_db
from storage.repositories.settings import SettingsRepository
from security.encryption import encrypt, decrypt
from models.gateway import ModelGateway, ModelConfig

router = APIRouter(prefix="/api/models", tags=["models"])

PROVIDERS = ["openai", "anthropic", "gemini", "moonshot", "openrouter", "ollama"]


class SetKeyRequest(BaseModel):
    key: str


@router.get("/providers")
async def list_providers():
    async with get_db() as db:
        repo = SettingsRepository(db)
        result = []
        for provider in PROVIDERS:
            if provider == "ollama":
                result.append({"provider": provider, "configured": True})
                continue
            key_val = await repo.get(f"{provider}_api_key")
            has_key = key_val is not None
            result.append({"provider": provider, "configured": has_key})
        ollama_url = await repo.get("ollama_url") or os.environ.get(
            "OLLAMA_URL", "http://host.docker.internal:11434"
        )
        return {"providers": result, "ollama_url": ollama_url}


@router.post("/keys/{provider}", status_code=200)
async def set_api_key(provider: str, req: SetKeyRequest):
    if provider not in PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")
    async with get_db() as db:
        repo = SettingsRepository(db)
        encrypted = encrypt(req.key)
        await repo.set(f"{provider}_api_key", encrypted)
        masked = req.key[:4] + "****" if len(req.key) > 4 else "****"
        return {"provider": provider, "masked": masked}


@router.delete("/keys/{provider}", status_code=204)
async def delete_api_key(provider: str):
    async with get_db() as db:
        repo = SettingsRepository(db)
        await repo.delete(f"{provider}_api_key")


@router.get("/ollama/models")
async def list_ollama_models():
    async with get_db() as db:
        repo = SettingsRepository(db)
        ollama_url = await repo.get("ollama_url") or os.environ.get(
            "OLLAMA_URL", "http://host.docker.internal:11434"
        )
        import httpx
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                r = await client.get(f"{ollama_url}/api/tags")
                r.raise_for_status()
                data = r.json()
                models = [m["name"] for m in data.get("models", [])]
                return {"models": models}
        except Exception:
            return {"models": []}


@router.get("/test/{provider}")
async def test_provider(provider: str):
    async with get_db() as db:
        repo = SettingsRepository(db)
        if provider == "ollama":
            ollama_url = await repo.get("ollama_url") or os.environ.get(
                "OLLAMA_URL", "http://host.docker.internal:11434"
            )
            import httpx
            try:
                async with httpx.AsyncClient(timeout=5) as client:
                    r = await client.get(f"{ollama_url}/api/tags")
                    r.raise_for_status()
                return {"ok": True, "message": f"Ollama reachable at {ollama_url}"}
            except Exception as e:
                return {"ok": False, "message": str(e)}
        key_val = await repo.get(f"{provider}_api_key")
        if not key_val:
            return {"ok": False, "message": "No API key configured"}
        try:
            api_key = decrypt(key_val)
            gateway = ModelGateway()
            default_models = {
                "openai": "gpt-4o-mini",
                "anthropic": "claude-haiku-4-5-20251001",
                "gemini": "gemini-2.0-flash",
                "moonshot": "moonshot-v1-8k",
                "openrouter": "openai/gpt-4o-mini",
            }
            model_name = default_models.get(provider, "gpt-4o-mini")
            config = ModelConfig(provider=provider, model_name=model_name, api_key=api_key)
            result = await gateway.generate(
                [{"role": "user", "content": "Reply with exactly: ok"}], config
            )
            return {"ok": True, "message": f"Connected. Response: {result[:50]}"}
        except Exception as e:
            return {"ok": False, "message": str(e)}


