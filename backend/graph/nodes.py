import json
import uuid
import asyncio
from datetime import datetime, timezone
from models.gateway import ModelGateway, ModelConfig
from agents.base import (
    build_debate_prompt,
    build_observer_checkpoint_prompt,
    build_final_report_prompt,
)
from graph.state import CouncilState
from storage.db import get_db
from storage.repositories.settings import SettingsRepository
from storage.chroma_client import ChromaClient
from security.encryption import decrypt
from tools.search import tavily_search
from tools.reader import read_url
from tools.summarizer import summarize_for_claim

_MAX_ROUNDS = {"quick": 1, "standard": 5, "deep_dive": 15}
_CONSENSUS_THRESHOLD = 0.75
_REPETITION_THRESHOLD = 0.85


def _get_model_config(state: CouncilState) -> ModelConfig:
    mc = state["model_config"]
    return ModelConfig(
        provider=mc["provider"],
        model_name=mc["model_name"],
        api_key=mc.get("api_key"),
        base_url=mc.get("base_url"),
    )


def _emit(state: CouncilState, event_type: str, payload: dict) -> None:
    queue: asyncio.Queue | None = state.get("_event_queue")
    if queue:
        event = {
            "type": event_type,
            "payload": payload,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        queue.put_nowait(event)


async def node_validate_input(state: CouncilState) -> CouncilState:
    active = [p for p in state["personas"] if p["enabled"]]
    if len(active) < 2:
        return {**state, "status": "error", "error": "At least 2 active personas required."}
    intensity = state["debate_intensity"]
    max_rounds = _MAX_ROUNDS.get(intensity, 5)
    _emit(state, "session.started", {"session_id": state["session_id"], "intensity": intensity})
    return {**state, "status": "researching", "max_rounds": max_rounds}


async def node_task_brief(state: CouncilState) -> CouncilState:
    question = state["user_question"]
    brief = (
        f"The council will investigate: {question}\n"
        f"Each persona researches from their own perspective and debates the others."
    )
    return {**state, "task_brief": brief}


async def node_initial_positions(state: CouncilState) -> CouncilState:
    gateway = ModelGateway()
    config = _get_model_config(state)
    active_personas = [p for p in state["personas"] if p["enabled"] and p["id"] != "observer"]
    new_messages = list(state["debate_messages"])

    _emit(state, "status.update", {"message": "Personas are forming initial positions..."})

    for persona in active_personas:
        messages = build_debate_prompt(
            system_prompt=persona["system_prompt"],
            question=state["user_question"],
            round_messages=[],
            evidence_pool=state["sources"],
            persona_name=persona["name"],
            round_number=0,
        )
        try:
            raw = await gateway.generate(messages, config)
            try:
                parsed = json.loads(raw)
                content = parsed.get("argument", raw)
                confidence = parsed.get("confidence", "Medium")
                cited = parsed.get("evidence_used", [])
            except json.JSONDecodeError:
                content = raw
                confidence = "Medium"
                cited = []
        except Exception as e:
            content = f"[Error generating position: {e}]"
            confidence = "Low"
            cited = []

        msg = {
            "round_number": 0,
            "persona_id": persona["id"],
            "persona_name": persona["name"],
            "content": content,
            "cited_sources": cited,
            "confidence": confidence,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        new_messages.append(msg)
        _emit(state, "persona.position", {
            "persona_id": persona["id"],
            "persona_name": persona["name"],
            "content": content,
            "confidence": confidence,
        })

    return {**state, "debate_messages": new_messages, "status": "debating"}


async def node_debate_round(state: CouncilState) -> CouncilState:
    gateway = ModelGateway()
    config = _get_model_config(state)
    round_num = state["round_count"] + 1
    active_personas = [p for p in state["personas"] if p["enabled"] and p["id"] != "observer"]
    new_messages = list(state["debate_messages"])

    _emit(state, "status.update", {"message": f"Round {round_num} in progress..."})

    for persona in active_personas:
        messages = build_debate_prompt(
            system_prompt=persona["system_prompt"],
            question=state["user_question"],
            round_messages=new_messages,
            evidence_pool=state["sources"],
            persona_name=persona["name"],
            round_number=round_num,
        )
        try:
            raw = await gateway.generate(messages, config)
            try:
                parsed = json.loads(raw)
                content = parsed.get("argument", raw)
                confidence = parsed.get("confidence", "Medium")
                cited = parsed.get("evidence_used", [])
            except json.JSONDecodeError:
                content = raw
                confidence = "Medium"
                cited = []
        except Exception as e:
            content = f"[Error: {e}]"
            confidence = "Low"
            cited = []

        msg = {
            "round_number": round_num,
            "persona_id": persona["id"],
            "persona_name": persona["name"],
            "content": content,
            "cited_sources": cited,
            "confidence": confidence,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        new_messages.append(msg)
        _emit(state, "debate.message", {
            "round_number": round_num,
            "persona_id": persona["id"],
            "persona_name": persona["name"],
            "content": content,
            "confidence": confidence,
            "cited_sources": cited,
        })

    return {**state, "debate_messages": new_messages, "round_count": round_num}


async def node_observer_checkpoint(state: CouncilState) -> CouncilState:
    gateway = ModelGateway()
    config = _get_model_config(state)
    observer_persona = next(
        (p for p in state["personas"] if p["id"] == "observer"), None
    )
    system_prompt = observer_persona["system_prompt"] if observer_persona else ""
    messages = build_observer_checkpoint_prompt(
        question=state["user_question"],
        all_messages=state["debate_messages"],
        round_number=state["round_count"],
    )
    if system_prompt:
        messages = [{"role": "system", "content": system_prompt}] + messages

    try:
        raw = await gateway.generate(messages, config)
        parsed = json.loads(raw)
        consensus_score = float(parsed.get("consensus_score", 0.5))
        repetition_score = float(parsed.get("repetition_score", 0.0))
        agreements = parsed.get("agreements", [])
        disagreements = parsed.get("disagreements", [])
        observer_should_continue = bool(parsed.get("should_continue", True))
        reason = parsed.get("reason", "")
    except Exception:
        consensus_score = 0.5
        repetition_score = 0.0
        agreements = []
        disagreements = []
        observer_should_continue = True
        reason = "Observer could not evaluate — continuing."

    checkpoint = {
        "round_number": state["round_count"],
        "consensus_score": consensus_score,
        "repetition_score": repetition_score,
        "agreements": agreements,
        "disagreements": disagreements,
        "should_continue": observer_should_continue,
        "reason": reason,
    }
    new_checkpoints = list(state["observer_checkpoints"]) + [checkpoint]

    _emit(state, "observer.checkpoint", {
        "round_number": state["round_count"],
        "consensus_score": consensus_score,
        "agreements": agreements,
        "disagreements": disagreements,
        "should_continue": observer_should_continue,
        "reason": reason,
    })

    return {**state, "observer_checkpoints": new_checkpoints}


def should_continue(state: CouncilState) -> str:
    if state.get("user_stop_requested"):
        return "final_report"
    if state.get("status") == "error":
        return "final_report"

    checkpoints = state["observer_checkpoints"]
    if not checkpoints:
        return "debate_round" if state["round_count"] < state["max_rounds"] else "final_report"

    latest = checkpoints[-1]
    if latest["consensus_score"] >= _CONSENSUS_THRESHOLD:
        return "final_report"
    if state["round_count"] >= state["max_rounds"]:
        return "final_report"
    if len(checkpoints) >= 2:
        prev = checkpoints[-2]
        if (latest["repetition_score"] >= _REPETITION_THRESHOLD and
                prev["repetition_score"] >= _REPETITION_THRESHOLD):
            return "final_report"
    if not latest["should_continue"]:
        return "final_report"
    return "debate_round"


async def node_persona_research(state: CouncilState) -> CouncilState:
    """Conduct per-persona web research using Tavily and URL reader.

    Retrieves the Tavily API key from settings (encrypted), builds
    persona-specific search angles, and populates ``_raw_sources`` with
    summarised sources for each active (non-observer) persona.

    Skips silently when no Tavily key is configured.
    """
    gateway = ModelGateway()
    config = _get_model_config(state)

    intensity_limits = {
        "quick": (2, 3),
        "standard": (4, 6),
        "deep_dive": (8, 12),
    }
    max_searches, max_urls = intensity_limits.get(state["debate_intensity"], (4, 6))

    # Retrieve and decrypt the Tavily key stored in settings.
    tavily_key: str | None = None
    async with get_db() as db:
        repo = SettingsRepository(db)
        enc_key = await repo.get("tavily_api_key")
        if enc_key:
            try:
                tavily_key = decrypt(enc_key)
            except ValueError:
                tavily_key = None

    if not tavily_key:
        _emit(
            state,
            "status.update",
            {"message": "No Tavily key configured — skipping web research."},
        )
        return {**state, "_raw_sources": []}

    active_personas = [
        p for p in state["personas"] if p["enabled"] and p["id"] != "observer"
    ]
    persona_search_angles: dict[str, str] = {
        "optimist": f"opportunities advantages success {state['user_question']}",
        "pessimist": f"risks failures problems costs {state['user_question']}",
        "contrarian": (
            f"counterarguments assumptions alternative perspectives {state['user_question']}"
        ),
    }

    all_raw_sources: list[dict] = []
    total_searches = 0
    total_urls = 0

    for persona in active_personas:
        if total_searches >= 30:
            break
        angle = persona_search_angles.get(persona["id"], state["user_question"])
        _emit(
            state,
            "research.begun",
            {"persona_id": persona["id"], "persona_name": persona["name"]},
        )

        persona_searches = 0
        persona_urls = 0

        while persona_searches < max_searches and total_searches < 30:
            try:
                results = await tavily_search(angle, tavily_key, max_results=5)
            except Exception:
                break

            persona_searches += 1
            total_searches += 1

            for r in results:
                if total_urls >= 50 or persona_urls >= max_urls:
                    break
                url = r.get("url", "")
                if not url:
                    continue
                try:
                    text = await read_url(url)
                except Exception:
                    continue
                persona_urls += 1
                total_urls += 1

                try:
                    summary = await summarize_for_claim(
                        text, state["user_question"], gateway, config
                    )
                except Exception:
                    summary = ""

                if "[Not relevant]" in summary or not summary:
                    continue

                parsed = url.split("/")
                domain = parsed[2] if len(parsed) > 2 else url
                raw_src = {
                    "url": url,
                    "title": r.get("title", url),
                    "domain": domain,
                    "summary": summary,
                    "discovered_by": persona["id"],
                    "claims": [],
                }
                all_raw_sources.append(raw_src)
                _emit(
                    state,
                    "source.found",
                    {
                        "title": raw_src["title"],
                        "url": url,
                        "persona_id": persona["id"],
                    },
                )

    return {**state, "_raw_sources": all_raw_sources}


async def node_evidence_merger(state: CouncilState) -> CouncilState:
    """Deduplicate and score raw sources, then store them in state.

    Reads ``_raw_sources`` populated by ``node_persona_research``, deduplicates
    by URL with relevance scoring via ``ChromaClient``, and stores the final
    list in ``state["sources"]`` (max 50 entries).
    """
    raw_sources: list[dict] = state.get("_raw_sources", [])  # type: ignore[assignment]
    if not raw_sources:
        return state

    chroma = ChromaClient()
    deduped = chroma.deduplicate(raw_sources, state["user_question"])

    sources: list[dict] = []
    for s in deduped[:50]:
        sources.append({
            "id": str(uuid.uuid4())[:8],
            "title": s["title"],
            "url": s["url"],
            "domain": s["domain"],
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
            "summary": s["summary"],
            "discovered_by": s["discovered_by"],
            "relevance_score": s.get("relevance_score", 0.5),
            "claims": s.get("claims", []),
        })

    _emit(
        state,
        "status.update",
        {"message": f"Evidence pool ready: {len(sources)} sources"},
    )
    return {**state, "sources": sources}


async def node_final_report(state: CouncilState) -> CouncilState:
    gateway = ModelGateway()
    config = _get_model_config(state)
    observer_persona = next(
        (p for p in state["personas"] if p["id"] == "observer"), None
    )
    system_prompt = observer_persona["system_prompt"] if observer_persona else ""
    messages = build_final_report_prompt(
        question=state["user_question"],
        all_messages=state["debate_messages"],
        checkpoints=state["observer_checkpoints"],
        sources=state["sources"],
    )
    if system_prompt:
        messages = [{"role": "system", "content": system_prompt}] + messages

    _emit(state, "status.update", {"message": "Observer is generating final report..."})

    try:
        report = await gateway.generate(messages, config)
    except Exception as e:
        report = f"## Error\nFailed to generate final report: {e}"

    _emit(state, "final_report.done", {"content": report})

    return {**state, "final_report": report, "status": "completed"}
