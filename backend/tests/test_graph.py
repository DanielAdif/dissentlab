import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from graph.graph import build_graph
from graph.state import CouncilState


@pytest.mark.asyncio
async def test_graph_compiles():
    graph = build_graph()
    assert graph is not None


@pytest.mark.asyncio
async def test_graph_runs_quick_mode():
    graph = build_graph()
    initial_state: CouncilState = {
        "session_id": "test-session",
        "user_question": "Should I build a startup?",
        "task_brief": "",
        "debate_intensity": "quick",
        "personas": [
            {"id": "optimist", "name": "Optimist", "role": "...", "system_prompt": "You are Optimist. Output JSON: {\"position\": \"test\", \"argument\": \"test\", \"evidence_used\": [], \"challenge_to_others\": \"none\", \"confidence\": \"Medium\"}", "enabled": True, "model_provider": "openai", "model_name": "gpt-4o-mini", "tools_enabled": []},
            {"id": "pessimist", "name": "Pessimist", "role": "...", "system_prompt": "You are Pessimist. Output JSON: {\"position\": \"test\", \"argument\": \"test\", \"evidence_used\": [], \"challenge_to_others\": \"none\", \"confidence\": \"Medium\"}", "enabled": True, "model_provider": "openai", "model_name": "gpt-4o-mini", "tools_enabled": []},
        ],
        "sources": [],
        "persona_findings": [],
        "debate_messages": [],
        "observer_checkpoints": [],
        "round_count": 0,
        "max_rounds": 1,
        "consensus_threshold": 0.75,
        "final_report": None,
        "status": "pending",
        "user_stop_requested": False,
        "model_config": {"provider": "openai", "model_name": "gpt-4o-mini", "api_key": "test", "base_url": None},
        "error": None,
    }

    mock_generate = AsyncMock(return_value='{"position": "good idea", "argument": "market exists", "evidence_used": [], "challenge_to_others": "none", "confidence": "Medium"}')
    observer_response = AsyncMock(return_value='{"consensus_score": 0.8, "repetition_score": 0.1, "agreements": ["market exists"], "disagreements": [], "should_continue": false, "reason": "consensus reached"}')
    final_report_response = AsyncMock(return_value="## Direct Answer\nProceed with caution.")

    call_count = {"n": 0}

    async def mock_gen(messages, config):
        call_count["n"] += 1
        if call_count["n"] <= 2:
            return await mock_generate(messages, config)
        elif call_count["n"] == 3:
            return await observer_response(messages, config)
        else:
            return await final_report_response(messages, config)

    with patch("graph.nodes.ModelGateway") as MockGateway:
        instance = MockGateway.return_value
        instance.generate = mock_gen
        result = await graph.ainvoke(initial_state)

    assert result["status"] in ("completed", "error")
    assert result["round_count"] >= 1
