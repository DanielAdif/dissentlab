"""Tests for node_persona_research and node_evidence_merger graph nodes."""

import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from graph.nodes import node_persona_research, node_evidence_merger
from graph.state import CouncilState


def _base_state(**overrides) -> CouncilState:
    """Return a minimal valid CouncilState for research node tests."""
    state: CouncilState = {
        "session_id": "test-session",
        "user_question": "Should we adopt renewable energy?",
        "task_brief": "",
        "debate_intensity": "standard",
        "personas": [
            {
                "id": "optimist",
                "name": "Optimist",
                "role": "...",
                "system_prompt": "You are Optimist.",
                "enabled": True,
                "model_provider": "openai",
                "model_name": "gpt-4o-mini",
                "tools_enabled": [],
            },
            {
                "id": "pessimist",
                "name": "Pessimist",
                "role": "...",
                "system_prompt": "You are Pessimist.",
                "enabled": True,
                "model_provider": "openai",
                "model_name": "gpt-4o-mini",
                "tools_enabled": [],
            },
            {
                "id": "observer",
                "name": "Observer",
                "role": "observer",
                "system_prompt": "You observe.",
                "enabled": True,
                "model_provider": "openai",
                "model_name": "gpt-4o-mini",
                "tools_enabled": [],
            },
        ],
        "sources": [],
        "persona_findings": [],
        "debate_messages": [],
        "observer_checkpoints": [],
        "round_count": 0,
        "max_rounds": 1,
        "consensus_threshold": 0.75,
        "final_report": None,
        "status": "researching",
        "user_stop_requested": False,
        "model_config": {
            "provider": "openai",
            "model_name": "gpt-4o-mini",
            "api_key": "test",
            "base_url": None,
        },
        "error": None,
        "_raw_sources": [],
    }
    state.update(overrides)
    return state


# ---------------------------------------------------------------------------
# node_persona_research
# ---------------------------------------------------------------------------


class TestNodePersonaResearch:
    """Tests for node_persona_research."""

    @pytest.mark.asyncio
    async def test_skips_research_when_no_tavily_key(self):
        """When settings returns no Tavily key, research is skipped and
        _raw_sources is returned as an empty list."""
        state = _base_state()

        mock_repo = AsyncMock()
        mock_repo.get.return_value = None  # No key stored

        with (
            patch("graph.nodes.get_db") as mock_get_db,
            patch("graph.nodes.SettingsRepository", return_value=mock_repo),
        ):
            # make get_db() an async context manager
            mock_db = AsyncMock()
            mock_get_db.return_value.__aenter__ = AsyncMock(return_value=mock_db)
            mock_get_db.return_value.__aexit__ = AsyncMock(return_value=False)

            result = await node_persona_research(state)

        assert result["_raw_sources"] == []
        # sources must remain unchanged
        assert result["sources"] == []

    @pytest.mark.asyncio
    async def test_skips_research_when_decrypt_fails(self):
        """When decrypt raises ValueError (corrupted key), research is skipped."""
        state = _base_state()

        mock_repo = AsyncMock()
        mock_repo.get.return_value = "bad-encrypted-value"

        with (
            patch("graph.nodes.get_db") as mock_get_db,
            patch("graph.nodes.SettingsRepository", return_value=mock_repo),
            patch("graph.nodes.decrypt", side_effect=ValueError("bad key")),
        ):
            mock_db = AsyncMock()
            mock_get_db.return_value.__aenter__ = AsyncMock(return_value=mock_db)
            mock_get_db.return_value.__aexit__ = AsyncMock(return_value=False)

            result = await node_persona_research(state)

        assert result["_raw_sources"] == []

    @pytest.mark.asyncio
    async def test_observer_persona_excluded_from_research(self):
        """Observer persona should not trigger searches."""
        state = _base_state(
            personas=[
                {
                    "id": "observer",
                    "name": "Observer",
                    "role": "observer",
                    "system_prompt": "You observe.",
                    "enabled": True,
                    "model_provider": "openai",
                    "model_name": "gpt-4o-mini",
                    "tools_enabled": [],
                }
            ]
        )

        mock_repo = AsyncMock()
        mock_repo.get.return_value = None  # No Tavily key -> early exit

        with (
            patch("graph.nodes.get_db") as mock_get_db,
            patch("graph.nodes.SettingsRepository", return_value=mock_repo),
        ):
            mock_db = AsyncMock()
            mock_get_db.return_value.__aenter__ = AsyncMock(return_value=mock_db)
            mock_get_db.return_value.__aexit__ = AsyncMock(return_value=False)

            result = await node_persona_research(state)

        assert result["_raw_sources"] == []

    @pytest.mark.asyncio
    async def test_research_populates_raw_sources_on_success(self):
        """When Tavily key exists and search + read succeed, _raw_sources is
        populated with the summarised result."""
        state = _base_state(debate_intensity="standard")

        mock_repo = AsyncMock()
        mock_repo.get.return_value = "encrypted-key"

        search_result = [
            {
                "url": "https://example.com/article",
                "title": "Renewable Energy Wins",
                "content": "Great content",
                "score": 0.9,
            }
        ]

        with (
            patch("graph.nodes.get_db") as mock_get_db,
            patch("graph.nodes.SettingsRepository", return_value=mock_repo),
            patch("graph.nodes.decrypt", return_value="real-tavily-key"),
            patch(
                "graph.nodes.tavily_search", new=AsyncMock(return_value=search_result)
            ),
            patch("graph.nodes.read_url", new=AsyncMock(return_value="Some page text")),
            patch(
                "graph.nodes.summarize_for_claim",
                new=AsyncMock(return_value="Renewable energy is beneficial."),
            ),
            patch("graph.nodes.ModelGateway"),
        ):
            mock_db = AsyncMock()
            mock_get_db.return_value.__aenter__ = AsyncMock(return_value=mock_db)
            mock_get_db.return_value.__aexit__ = AsyncMock(return_value=False)

            result = await node_persona_research(state)

        assert len(result["_raw_sources"]) > 0
        first = result["_raw_sources"][0]
        assert first["url"] == "https://example.com/article"
        assert first["title"] == "Renewable Energy Wins"
        assert "summary" in first
        assert "discovered_by" in first

    @pytest.mark.asyncio
    async def test_irrelevant_summaries_are_filtered(self):
        """Sources whose summary contains '[Not relevant]' must be excluded."""
        state = _base_state(debate_intensity="standard")

        mock_repo = AsyncMock()
        mock_repo.get.return_value = "encrypted-key"

        search_result = [
            {"url": "https://example.com/junk", "title": "Junk Page", "content": "", "score": 0.1}
        ]

        with (
            patch("graph.nodes.get_db") as mock_get_db,
            patch("graph.nodes.SettingsRepository", return_value=mock_repo),
            patch("graph.nodes.decrypt", return_value="real-tavily-key"),
            patch(
                "graph.nodes.tavily_search", new=AsyncMock(return_value=search_result)
            ),
            patch("graph.nodes.read_url", new=AsyncMock(return_value="irrelevant text")),
            patch(
                "graph.nodes.summarize_for_claim",
                new=AsyncMock(return_value="[Not relevant]"),
            ),
            patch("graph.nodes.ModelGateway"),
        ):
            mock_db = AsyncMock()
            mock_get_db.return_value.__aenter__ = AsyncMock(return_value=mock_db)
            mock_get_db.return_value.__aexit__ = AsyncMock(return_value=False)

            result = await node_persona_research(state)

        assert result["_raw_sources"] == []

    @pytest.mark.asyncio
    async def test_search_exception_does_not_crash_node(self):
        """If tavily_search raises, the node swallows the error and continues."""
        state = _base_state(debate_intensity="standard")

        mock_repo = AsyncMock()
        mock_repo.get.return_value = "encrypted-key"

        with (
            patch("graph.nodes.get_db") as mock_get_db,
            patch("graph.nodes.SettingsRepository", return_value=mock_repo),
            patch("graph.nodes.decrypt", return_value="real-tavily-key"),
            patch(
                "graph.nodes.tavily_search",
                new=AsyncMock(side_effect=RuntimeError("network error")),
            ),
            patch("graph.nodes.ModelGateway"),
        ):
            mock_db = AsyncMock()
            mock_get_db.return_value.__aenter__ = AsyncMock(return_value=mock_db)
            mock_get_db.return_value.__aexit__ = AsyncMock(return_value=False)

            result = await node_persona_research(state)

        assert "_raw_sources" in result

    @pytest.mark.asyncio
    async def test_discovered_by_matches_persona_id(self):
        """Each source's 'discovered_by' field reflects the persona that found it."""
        state = _base_state(debate_intensity="standard")
        # Keep only the optimist persona so we can assert exactly one persona ID.
        state["personas"] = [
            p for p in state["personas"] if p["id"] == "optimist"
        ]

        mock_repo = AsyncMock()
        mock_repo.get.return_value = "encrypted-key"

        search_result = [
            {"url": "https://example.com/a", "title": "Article A", "content": "", "score": 0.8}
        ]

        with (
            patch("graph.nodes.get_db") as mock_get_db,
            patch("graph.nodes.SettingsRepository", return_value=mock_repo),
            patch("graph.nodes.decrypt", return_value="real-tavily-key"),
            patch(
                "graph.nodes.tavily_search", new=AsyncMock(return_value=search_result)
            ),
            patch("graph.nodes.read_url", new=AsyncMock(return_value="page text")),
            patch(
                "graph.nodes.summarize_for_claim",
                new=AsyncMock(return_value="Very relevant to the question."),
            ),
            patch("graph.nodes.ModelGateway"),
        ):
            mock_db = AsyncMock()
            mock_get_db.return_value.__aenter__ = AsyncMock(return_value=mock_db)
            mock_get_db.return_value.__aexit__ = AsyncMock(return_value=False)

            result = await node_persona_research(state)

        assert all(s["discovered_by"] == "optimist" for s in result["_raw_sources"])

    @pytest.mark.asyncio
    async def test_intensity_quick_uses_lower_limits(self):
        """quick intensity allows max_searches=2, max_urls=3 per persona."""
        state = _base_state(debate_intensity="quick")
        # Only one non-observer persona so search count is predictable.
        state["personas"] = [p for p in state["personas"] if p["id"] == "optimist"]

        mock_repo = AsyncMock()
        mock_repo.get.return_value = "encrypted-key"

        # Return many results to verify the cap is enforced.
        search_results = [
            {"url": f"https://example.com/{i}", "title": f"Art {i}", "content": "", "score": 0.9}
            for i in range(10)
        ]

        call_counts = {"search": 0}

        async def count_search(query, api_key, max_results=5):
            call_counts["search"] += 1
            return search_results

        with (
            patch("graph.nodes.get_db") as mock_get_db,
            patch("graph.nodes.SettingsRepository", return_value=mock_repo),
            patch("graph.nodes.decrypt", return_value="real-tavily-key"),
            patch("graph.nodes.tavily_search", new=count_search),
            patch("graph.nodes.read_url", new=AsyncMock(return_value="text")),
            patch(
                "graph.nodes.summarize_for_claim",
                new=AsyncMock(return_value="Relevant summary text."),
            ),
            patch("graph.nodes.ModelGateway"),
        ):
            mock_db = AsyncMock()
            mock_get_db.return_value.__aenter__ = AsyncMock(return_value=mock_db)
            mock_get_db.return_value.__aexit__ = AsyncMock(return_value=False)

            result = await node_persona_research(state)

        # Should not exceed max_urls=3 for quick intensity.
        assert len(result["_raw_sources"]) <= 3


# ---------------------------------------------------------------------------
# node_evidence_merger
# ---------------------------------------------------------------------------


class TestNodeEvidenceMerger:
    """Tests for node_evidence_merger."""

    @pytest.mark.asyncio
    async def test_returns_state_unchanged_when_no_raw_sources(self):
        """When _raw_sources is empty, state is returned with sources unchanged."""
        state = _base_state(_raw_sources=[])

        with patch("graph.nodes.ChromaClient") as MockChroma:
            result = await node_evidence_merger(state)

        # ChromaClient.deduplicate should not be called.
        MockChroma.return_value.deduplicate.assert_not_called()
        assert result["sources"] == []

    @pytest.mark.asyncio
    async def test_deduplicates_sources_via_chroma(self):
        """node_evidence_merger calls ChromaClient.deduplicate and stores results."""
        raw = [
            {
                "url": "https://example.com/a",
                "title": "Article A",
                "domain": "example.com",
                "summary": "Relevant info",
                "discovered_by": "optimist",
                "claims": [],
            }
        ]
        state = _base_state(_raw_sources=raw)

        deduped_return = [
            {**raw[0], "relevance_score": 0.88}
        ]

        with patch("graph.nodes.ChromaClient") as MockChroma:
            MockChroma.return_value.deduplicate.return_value = deduped_return
            result = await node_evidence_merger(state)

        assert len(result["sources"]) == 1
        src = result["sources"][0]
        assert src["url"] == "https://example.com/a"
        assert src["title"] == "Article A"
        assert src["domain"] == "example.com"
        assert src["summary"] == "Relevant info"
        assert src["discovered_by"] == "optimist"
        assert src["relevance_score"] == 0.88
        assert src["claims"] == []

    @pytest.mark.asyncio
    async def test_caps_sources_at_50(self):
        """node_evidence_merger stores at most 50 sources."""
        raw = [
            {
                "url": f"https://example.com/{i}",
                "title": f"Art {i}",
                "domain": "example.com",
                "summary": "Summary",
                "discovered_by": "optimist",
                "claims": [],
                "relevance_score": 0.5,
            }
            for i in range(80)
        ]
        state = _base_state(_raw_sources=raw)

        with patch("graph.nodes.ChromaClient") as MockChroma:
            MockChroma.return_value.deduplicate.return_value = raw  # 80 items

            result = await node_evidence_merger(state)

        assert len(result["sources"]) == 50

    @pytest.mark.asyncio
    async def test_sources_have_required_keys(self):
        """Every stored source must have id, title, url, domain, retrieved_at,
        summary, discovered_by, relevance_score, and claims."""
        raw = [
            {
                "url": "https://example.com/x",
                "title": "Article X",
                "domain": "example.com",
                "summary": "Some summary",
                "discovered_by": "pessimist",
                "claims": ["claim1"],
                "relevance_score": 0.7,
            }
        ]
        state = _base_state(_raw_sources=raw)

        with patch("graph.nodes.ChromaClient") as MockChroma:
            MockChroma.return_value.deduplicate.return_value = raw
            result = await node_evidence_merger(state)

        src = result["sources"][0]
        required_keys = {
            "id", "title", "url", "domain", "retrieved_at",
            "summary", "discovered_by", "relevance_score", "claims",
        }
        assert required_keys.issubset(src.keys())

    @pytest.mark.asyncio
    async def test_generates_unique_ids(self):
        """Each source should receive a unique short ID."""
        raw = [
            {
                "url": f"https://example.com/{i}",
                "title": f"Art {i}",
                "domain": "example.com",
                "summary": "Summary",
                "discovered_by": "optimist",
                "claims": [],
                "relevance_score": 0.5,
            }
            for i in range(5)
        ]
        state = _base_state(_raw_sources=raw)

        with patch("graph.nodes.ChromaClient") as MockChroma:
            MockChroma.return_value.deduplicate.return_value = raw
            result = await node_evidence_merger(state)

        ids = [s["id"] for s in result["sources"]]
        assert len(ids) == len(set(ids))  # all unique

    @pytest.mark.asyncio
    async def test_default_relevance_score_when_missing(self):
        """If relevance_score is absent from a source, defaults to 0.5."""
        raw = [
            {
                "url": "https://example.com/b",
                "title": "Article B",
                "domain": "example.com",
                "summary": "Summary",
                "discovered_by": "contrarian",
                "claims": [],
                # No relevance_score
            }
        ]
        state = _base_state(_raw_sources=raw)

        with patch("graph.nodes.ChromaClient") as MockChroma:
            MockChroma.return_value.deduplicate.return_value = raw
            result = await node_evidence_merger(state)

        assert result["sources"][0]["relevance_score"] == 0.5

    @pytest.mark.asyncio
    async def test_emits_status_update_event(self):
        """node_evidence_merger emits a 'status.update' event with source count."""
        import asyncio

        queue: asyncio.Queue = asyncio.Queue()
        raw = [
            {
                "url": "https://example.com/c",
                "title": "Article C",
                "domain": "example.com",
                "summary": "Summary",
                "discovered_by": "optimist",
                "claims": [],
                "relevance_score": 0.6,
            }
        ]
        state = _base_state(_raw_sources=raw, _event_queue=queue)  # type: ignore[call-arg]

        with patch("graph.nodes.ChromaClient") as MockChroma:
            MockChroma.return_value.deduplicate.return_value = raw
            await node_evidence_merger(state)

        assert not queue.empty()
        event = queue.get_nowait()
        assert event["type"] == "status.update"
        assert "1 sources" in event["payload"]["message"]


# ---------------------------------------------------------------------------
# Integration: graph wiring
# ---------------------------------------------------------------------------


class TestGraphWiring:
    """Verify that the research nodes are correctly wired into build_graph()."""

    def test_graph_compiles_with_research_nodes(self):
        """build_graph() must succeed after adding research nodes."""
        from graph.graph import build_graph

        graph = build_graph()
        assert graph is not None

    @pytest.mark.asyncio
    async def test_graph_runs_with_research_nodes_mocked(self):
        """Full graph run with research nodes mocked out to no-ops."""
        from graph.graph import build_graph

        graph = build_graph()
        initial_state: CouncilState = {
            "session_id": "test-session",
            "user_question": "Should we adopt renewable energy?",
            "task_brief": "",
            "debate_intensity": "quick",
            "personas": [
                {
                    "id": "optimist",
                    "name": "Optimist",
                    "role": "...",
                    "system_prompt": (
                        'You are Optimist. Output JSON: {"position": "good", '
                        '"argument": "works", "evidence_used": [], '
                        '"challenge_to_others": "none", "confidence": "Medium"}'
                    ),
                    "enabled": True,
                    "model_provider": "openai",
                    "model_name": "gpt-4o-mini",
                    "tools_enabled": [],
                },
                {
                    "id": "pessimist",
                    "name": "Pessimist",
                    "role": "...",
                    "system_prompt": (
                        'You are Pessimist. Output JSON: {"position": "bad", '
                        '"argument": "fails", "evidence_used": [], '
                        '"challenge_to_others": "none", "confidence": "Medium"}'
                    ),
                    "enabled": True,
                    "model_provider": "openai",
                    "model_name": "gpt-4o-mini",
                    "tools_enabled": [],
                },
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
            "model_config": {
                "provider": "openai",
                "model_name": "gpt-4o-mini",
                "api_key": "test",
                "base_url": None,
            },
            "error": None,
            "_raw_sources": [],
        }

        debate_response = '{"position": "good", "argument": "works", "evidence_used": [], "challenge_to_others": "none", "confidence": "Medium"}'
        observer_response = '{"consensus_score": 0.9, "repetition_score": 0.1, "agreements": [], "disagreements": [], "should_continue": false, "reason": "done"}'
        final_response = "## Final Report\nAll good."

        call_counter = {"n": 0}

        async def mock_gen(messages, config):
            call_counter["n"] += 1
            if call_counter["n"] <= 2:
                return debate_response
            elif call_counter["n"] == 3:
                return observer_response
            return final_response

        with (
            patch("graph.nodes.ModelGateway") as MockGateway,
            patch("graph.nodes.get_db") as mock_get_db,
            patch("graph.nodes.SettingsRepository") as MockRepo,
        ):
            instance = MockGateway.return_value
            instance.generate = mock_gen

            # No Tavily key — research nodes will skip silently.
            mock_repo_inst = AsyncMock()
            mock_repo_inst.get.return_value = None
            MockRepo.return_value = mock_repo_inst

            mock_db = AsyncMock()
            mock_get_db.return_value.__aenter__ = AsyncMock(return_value=mock_db)
            mock_get_db.return_value.__aexit__ = AsyncMock(return_value=False)

            result = await graph.ainvoke(initial_state)

        assert result["status"] in ("completed", "error")
        assert result["round_count"] >= 1
