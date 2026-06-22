import os

from fastapi import APIRouter
from pydantic import BaseModel
from storage.db import get_db
from storage.repositories.settings import SettingsRepository

router = APIRouter(prefix="/api/settings", tags=["settings"])


class PatchSettingsRequest(BaseModel):
    ollama_url: str | None = None
    default_intensity: str | None = None


@router.get("")
async def get_settings():
    async with get_db() as db:
        repo = SettingsRepository(db)
        ollama_url = await repo.get("ollama_url") or os.environ.get(
            "OLLAMA_URL", "http://host.docker.internal:11434"
        )
        default_intensity = await repo.get("default_intensity") or "standard"
        return {"ollama_url": ollama_url, "default_intensity": default_intensity}


@router.patch("")
async def patch_settings(req: PatchSettingsRequest):
    async with get_db() as db:
        repo = SettingsRepository(db)
        if req.ollama_url is not None:
            await repo.set("ollama_url", req.ollama_url)
        if req.default_intensity is not None:
            await repo.set("default_intensity", req.default_intensity)
    return await get_settings()
