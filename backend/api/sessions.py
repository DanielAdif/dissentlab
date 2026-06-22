from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from storage.db import get_db
from storage.repositories.sessions import SessionRepository
from storage.repositories.messages import MessageRepository
from storage.repositories.checkpoints import CheckpointRepository
from storage.repositories.reports import ReportRepository
from storage.repositories.personas import PersonaRepository

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


class CreateSessionRequest(BaseModel):
    question: str
    intensity: str = "standard"
    model_provider: str = "openai"
    model_name: str = "gpt-4o-mini"


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_session(req: CreateSessionRequest):
    async with get_db() as db:
        repo = SessionRepository(db)
        persona_repo = PersonaRepository(db)
        await persona_repo.seed_defaults()
        model_summary = f"{req.model_provider}/{req.model_name}"
        session = await repo.create(req.question, req.intensity, model_summary)
        return session


@router.get("")
async def list_sessions():
    async with get_db() as db:
        repo = SessionRepository(db)
        return await repo.list()


@router.get("/{session_id}")
async def get_session(session_id: str):
    async with get_db() as db:
        repo = SessionRepository(db)
        session = await repo.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        msg_repo = MessageRepository(db)
        cp_repo = CheckpointRepository(db)
        rpt_repo = ReportRepository(db)
        messages = await msg_repo.list_for_session(session_id)
        checkpoints = await cp_repo.list_for_session(session_id)
        report = await rpt_repo.get_for_session(session_id)
        return {**session, "messages": messages, "checkpoints": checkpoints, "report": report}


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: str):
    async with get_db() as db:
        repo = SessionRepository(db)
        session = await repo.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        await repo.delete(session_id)
