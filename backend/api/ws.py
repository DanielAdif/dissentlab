import asyncio
import json
import os

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from storage.db import get_db
from storage.repositories.sessions import SessionRepository
from storage.repositories.personas import PersonaRepository
from storage.repositories.settings import SettingsRepository
from storage.repositories.messages import MessageRepository
from storage.repositories.checkpoints import CheckpointRepository
from storage.repositories.reports import ReportRepository
from models.gateway import ModelConfig
from graph.graph import build_graph
from graph.state import CouncilState
from security.encryption import decrypt

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/sessions/{session_id}")
async def debate_websocket(websocket: WebSocket, session_id: str):
    await websocket.accept()
    event_queue: asyncio.Queue = asyncio.Queue()

    async def send_event(event: dict):
        try:
            await websocket.send_json(event)
        except Exception:
            pass

    async def drain_queue():
        while True:
            try:
                event = event_queue.get_nowait()
                await send_event(event)
            except asyncio.QueueEmpty:
                break

    try:
        async with get_db() as db:
            session_repo = SessionRepository(db)
            persona_repo = PersonaRepository(db)
            settings_repo = SettingsRepository(db)
            msg_repo = MessageRepository(db)
            cp_repo = CheckpointRepository(db)
            rpt_repo = ReportRepository(db)

            session = await session_repo.get(session_id)
            if not session:
                await websocket.send_json(
                    {"type": "error", "payload": {"message": "Session not found"}, "timestamp": ""}
                )
                await websocket.close()
                return

            await persona_repo.seed_defaults()
            personas_raw = await persona_repo.list_active()
            personas = [
                {
                    "id": p["id"],
                    "name": p["name"],
                    "role": p["role"],
                    "system_prompt": p["system_prompt"],
                    "enabled": bool(p["enabled"]),
                    "model_provider": p["model_provider"],
                    "model_name": p["model_name"],
                    "tools_enabled": (
                        json.loads(p["tool_permissions"])
                        if isinstance(p["tool_permissions"], str)
                        else p["tool_permissions"]
                    ),
                }
                for p in personas_raw
            ]

            provider = (
                session["model_summary"].split("/")[0]
                if "/" in session["model_summary"]
                else "openai"
            )
            model_name = (
                session["model_summary"].split("/", 1)[1]
                if "/" in session["model_summary"]
                else "gpt-4o-mini"
            )
            api_key_enc = await settings_repo.get(f"{provider}_api_key")
            api_key = decrypt(api_key_enc) if api_key_enc else None

            if api_key is None and provider not in ("huggingface", "ollama"):
                from models.providers.huggingface import _is_downloaded
                if _is_downloaded():
                    provider = "huggingface"
                    model_name = "Qwen3-0.6B"
                else:
                    await websocket.send_json({
                        "type": "error",
                        "payload": {"message": "No API key configured. Download Qwen3-0.6B in Settings → Models or add an API key."},
                        "timestamp": "",
                    })
                    await websocket.close()
                    return

            ollama_url = await settings_repo.get("ollama_url") or os.environ.get(
                "OLLAMA_URL", "http://host.docker.internal:11434"
            )

            model_config = {
                "provider": provider,
                "model_name": model_name,
                "api_key": api_key,
                "base_url": ollama_url if provider == "ollama" else None,
            }

            intensity = session["debate_intensity"]
            max_rounds_map = {"quick": 1, "standard": 5, "deep_dive": 15}

            initial_state: CouncilState = {
                "session_id": session_id,
                "user_question": session["question"],
                "task_brief": "",
                "debate_intensity": intensity,
                "personas": personas,
                "sources": [],
                "persona_findings": [],
                "debate_messages": [],
                "observer_checkpoints": [],
                "round_count": 0,
                "max_rounds": max_rounds_map.get(intensity, 5),
                "consensus_threshold": 0.75,
                "final_report": None,
                "status": "pending",
                "user_stop_requested": False,
                "model_config": model_config,
                "error": None,
                "_event_queue": event_queue,  # type: ignore[typeddict-unknown-key]
            }

            await session_repo.update_status(session_id, "running")

            async def run_graph():
                graph = build_graph()
                result = await graph.ainvoke(initial_state)
                return result

            async def handle_client():
                while True:
                    try:
                        data = await asyncio.wait_for(websocket.receive_json(), timeout=1.0)
                        if data.get("type") == "user.stop":
                            event_queue.put_nowait({"_stop": True})
                    except asyncio.TimeoutError:
                        pass
                    except WebSocketDisconnect:
                        break

            graph_task = asyncio.create_task(run_graph())
            client_task = asyncio.create_task(handle_client())

            while not graph_task.done():
                await drain_queue()
                await asyncio.sleep(0.05)

            client_task.cancel()
            await drain_queue()

            result = graph_task.result()

            for msg in result.get("debate_messages", []):
                await msg_repo.create(
                    session_id=session_id,
                    round_number=msg["round_number"],
                    persona_id=msg["persona_id"],
                    content=msg["content"],
                    cited_source_ids=msg.get("cited_sources", []),
                    confidence=msg.get("confidence", "Medium"),
                )

            for cp in result.get("observer_checkpoints", []):
                await cp_repo.create(
                    session_id=session_id,
                    round_number=cp["round_number"],
                    consensus_score=cp["consensus_score"],
                    repetition_score=cp["repetition_score"],
                    agreements=cp["agreements"],
                    disagreements=cp["disagreements"],
                    should_continue=cp["should_continue"],
                    reason=cp["reason"],
                )

            if result.get("final_report"):
                report_text = result["final_report"]
                first_line = (
                    report_text.split("\n")[1] if "\n" in report_text else report_text[:100]
                )
                last_cp = (
                    result["observer_checkpoints"][-1] if result["observer_checkpoints"] else {}
                )
                confidence = "Medium"
                if last_cp.get("consensus_score", 0) >= 0.75:
                    confidence = "High"
                elif last_cp.get("consensus_score", 0) < 0.4:
                    confidence = "Low"
                await rpt_repo.create(
                    session_id=session_id,
                    content_markdown=report_text,
                    confidence=confidence,
                    recommendation=first_line,
                )
                await session_repo.update_preview(session_id, first_line[:200])

            final_status = result.get("status", "completed")
            await session_repo.update_status(session_id, final_status)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        await send_event({"type": "error", "payload": {"message": str(e)}, "timestamp": ""})
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
