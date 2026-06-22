from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from storage.db import get_db
from storage.repositories.personas import PersonaRepository

router = APIRouter(prefix="/api/personas", tags=["personas"])


class CreatePersonaRequest(BaseModel):
    name: str
    role: str
    system_prompt: str


class UpdatePersonaRequest(BaseModel):
    name: str | None = None
    role: str | None = None
    system_prompt: str | None = None
    enabled: bool | None = None


@router.get("")
async def list_personas():
    async with get_db() as db:
        repo = PersonaRepository(db)
        await repo.seed_defaults()
        async with db.execute(
            "SELECT * FROM personas ORDER BY is_default DESC, created_at ASC"
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_persona(req: CreatePersonaRequest):
    async with get_db() as db:
        repo = PersonaRepository(db)
        return await repo.create(req.name, req.role, req.system_prompt)


@router.patch("/{persona_id}")
async def update_persona(persona_id: str, req: UpdatePersonaRequest):
    async with get_db() as db:
        repo = PersonaRepository(db)
        await repo.seed_defaults()
        fields = {k: v for k, v in req.model_dump().items() if v is not None}
        result = await repo.update(persona_id, **fields)
        if not result:
            raise HTTPException(status_code=404, detail="Persona not found")
        return result


@router.delete("/{persona_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_persona(persona_id: str):
    async with get_db() as db:
        repo = PersonaRepository(db)
        await repo.seed_defaults()
        persona = await repo.get(persona_id)
        if not persona:
            raise HTTPException(status_code=404, detail="Persona not found")
        if persona["id"] == "observer":
            raise HTTPException(status_code=400, detail="Observer cannot be deleted")
        if persona["is_default"]:
            raise HTTPException(
                status_code=400,
                detail="Default personas cannot be deleted — disable instead",
            )
        await repo.delete(persona_id)


@router.post("/restore-defaults")
async def restore_defaults():
    async with get_db() as db:
        repo = PersonaRepository(db)
        await repo.restore_defaults()
        return {"ok": True}
