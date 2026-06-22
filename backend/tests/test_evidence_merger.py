import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import aiosqlite

from research.evidence_merger import EvidenceMerger
from storage.db import run_migrations
from storage.repositories.sources import SourceRepository


class TestEvidenceMerger:
    """Tests for evidence merger functionality."""

    @pytest.fixture
    def db_and_repo(self, tmp_path):
        """Create in-memory database and repository for testing."""
        import asyncio

        async def _create_db_and_repo():
            db_path = str(tmp_path / "test.db")
            db = await aiosqlite.connect(db_path)
            await run_migrations(db)
            repo = SourceRepository(db)
            return db, repo

        db, repo = asyncio.run(_create_db_and_repo())
        yield db, repo

    @pytest.mark.asyncio
    async def test_merge_and_deduplicate_removes_duplicates(self):
        """Test that merge removes duplicate URLs."""
        merger = EvidenceMerger(MagicMock())

        sources = [
            {
                "title": "Article 1",
                "url": "https://example.com/article1",
                "summary": "Content about topic A",
                "score": 0.9,
            },
            {
                "title": "Article 1 Again",
                "url": "https://example.com/article1",
                "summary": "Same content",
                "score": 0.8,
            },
            {
                "title": "Article 2",
                "url": "https://example.com/article2",
                "summary": "Content about topic B",
                "score": 0.7,
            },
        ]

        result = merger.merge_and_deduplicate(sources, "What is the topic?")

        assert len(result) == 2
        # Should have only one of the duplicate articles
        urls = [r["url"] for r in result]
        assert len(set(urls)) == 2

    @pytest.mark.asyncio
    async def test_merge_and_deduplicate_scores_relevance(self):
        """Test that merge scores sources by relevance."""
        merger = EvidenceMerger(MagicMock())

        sources = [
            {
                "title": "Climate Article",
                "url": "https://example.com/climate",
                "summary": "Discussion of global warming and climate change impacts",
            },
            {
                "title": "Random Article",
                "url": "https://example.com/random",
                "summary": "A completely unrelated topic about cooking",
            },
        ]

        result = merger.merge_and_deduplicate(
            sources, "What is climate change?"
        )

        assert len(result) == 2
        assert "relevance_score" in result[0]
        assert "relevance_score" in result[1]
        # First result should have a relevance_score attribute
        assert isinstance(result[0]["relevance_score"], float)

    @pytest.mark.asyncio
    async def test_merge_and_deduplicate_sorted_by_relevance(self):
        """Test that results are sorted by relevance (highest first)."""
        merger = EvidenceMerger(MagicMock())

        sources = [
            {
                "title": "Less relevant",
                "url": "https://example.com/less",
                "summary": "Irrelevant content",
            },
            {
                "title": "More relevant",
                "url": "https://example.com/more",
                "summary": "About artificial intelligence and machine learning",
            },
        ]

        result = merger.merge_and_deduplicate(
            sources, "What is artificial intelligence?"
        )

        assert len(result) == 2
        # Higher scoring should come first
        assert result[0]["relevance_score"] >= result[1]["relevance_score"]

    @pytest.mark.asyncio
    async def test_store_sources_creates_new_records(self, db_and_repo):
        """Test that store_sources creates new source records."""
        db, repo = db_and_repo
        merger = EvidenceMerger(repo)

        sources = [
            {
                "title": "Article 1",
                "url": "https://example.com/1",
                "summary": "Summary 1",
                "relevance_score": 0.95,
            },
            {
                "title": "Article 2",
                "url": "https://example.com/2",
                "summary": "Summary 2",
                "relevance_score": 0.85,
            },
        ]

        stored = await merger.store_sources(
            session_id="test-session",
            sources=sources,
            discovered_by="persona-1",
        )

        assert len(stored) == 2
        assert stored[0]["title"] == "Article 1"
        assert stored[1]["title"] == "Article 2"
        assert stored[0]["relevance_score"] == 0.95
        assert stored[1]["relevance_score"] == 0.85

    @pytest.mark.asyncio
    async def test_store_sources_skips_duplicates(self, db_and_repo):
        """Test that store_sources skips already-stored URLs."""
        db, repo = db_and_repo
        merger = EvidenceMerger(repo)

        # Store first source
        first_source = {
            "title": "Article 1",
            "url": "https://example.com/1",
            "summary": "Summary 1",
            "relevance_score": 0.95,
        }
        await merger.store_sources(
            session_id="test-session",
            sources=[first_source],
            discovered_by="persona-1",
        )

        # Try to store the same source again (should be skipped)
        duplicate = {
            "title": "Article 1 Updated",
            "url": "https://example.com/1",
            "summary": "Updated summary",
            "relevance_score": 0.90,
        }
        stored = await merger.store_sources(
            session_id="test-session",
            sources=[duplicate],
            discovered_by="persona-2",
        )

        assert len(stored) == 0  # Should have been skipped

    @pytest.mark.asyncio
    async def test_store_sources_allows_different_sessions(
        self, db_and_repo
    ):
        """Test that same URL can be stored in different sessions."""
        db, repo = db_and_repo
        merger = EvidenceMerger(repo)

        source = {
            "title": "Article",
            "url": "https://example.com/same",
            "summary": "Content",
            "relevance_score": 0.9,
        }

        # Store in session 1
        stored1 = await merger.store_sources(
            session_id="session-1",
            sources=[source],
            discovered_by="persona-1",
        )
        assert len(stored1) == 1

        # Store same URL in session 2 (should succeed)
        stored2 = await merger.store_sources(
            session_id="session-2",
            sources=[source],
            discovered_by="persona-2",
        )
        assert len(stored2) == 1

    @pytest.mark.asyncio
    async def test_extract_domain_from_url(self):
        """Test domain extraction from URLs."""
        merger = EvidenceMerger(MagicMock())

        test_cases = [
            ("https://example.com/path/to/article", "example.com"),
            ("https://subdomain.example.com/article", "subdomain.example.com"),
            ("http://example.com:8080/article", "example.com:8080"),
            ("https://example.com", "example.com"),
        ]

        for url, expected_domain in test_cases:
            domain = merger._extract_domain(url)
            assert domain == expected_domain

    @pytest.mark.asyncio
    async def test_store_sources_extracts_domain(self, db_and_repo):
        """Test that store_sources correctly extracts domain."""
        db, repo = db_and_repo
        merger = EvidenceMerger(repo)

        sources = [
            {
                "title": "Article",
                "url": "https://subdomain.example.com/article",
                "summary": "Content",
                "relevance_score": 0.9,
            },
        ]

        stored = await merger.store_sources(
            session_id="test-session",
            sources=sources,
            discovered_by="persona-1",
        )

        assert stored[0]["domain"] == "subdomain.example.com"

    @pytest.mark.asyncio
    async def test_merge_empty_sources_list(self):
        """Test merging an empty sources list."""
        merger = EvidenceMerger(MagicMock())

        result = merger.merge_and_deduplicate([], "What is the topic?")

        assert result == []

    @pytest.mark.asyncio
    async def test_merge_single_source(self):
        """Test merging a single source."""
        merger = EvidenceMerger(MagicMock())

        sources = [
            {
                "title": "Article",
                "url": "https://example.com/article",
                "summary": "Content about the topic",
            },
        ]

        result = merger.merge_and_deduplicate(
            sources, "What is the topic?"
        )

        assert len(result) == 1
        assert result[0]["title"] == "Article"
        assert "relevance_score" in result[0]


class TestChromaClientIntegration:
    """Tests for Chroma client relevance scoring."""

    @pytest.mark.asyncio
    async def test_score_relevance_empty_text(self):
        """Test scoring with empty text returns 0.0."""
        from storage.chroma_client import ChromaClient

        client = ChromaClient()
        score = client.score_relevance("", "What is AI?")

        assert score == 0.0

    @pytest.mark.asyncio
    async def test_score_relevance_whitespace_text(self):
        """Test scoring with whitespace-only text returns 0.0."""
        from storage.chroma_client import ChromaClient

        client = ChromaClient()
        score = client.score_relevance("   \n  ", "What is AI?")

        assert score == 0.0

    @pytest.mark.asyncio
    async def test_score_relevance_valid_text(self):
        """Test scoring with valid text returns a float between 0 and 1."""
        from storage.chroma_client import ChromaClient

        client = ChromaClient()
        score = client.score_relevance(
            "Artificial intelligence is a field of computer science",
            "What is AI?",
        )

        assert isinstance(score, float)
        assert 0.0 <= score <= 1.0


class TestFileCacheIntegration:
    """Tests for file cache functionality."""

    @pytest.mark.asyncio
    async def test_cache_set_and_get(self, tmp_path):
        """Test setting and getting cache values."""
        import os
        from storage.file_cache import cache_set, cache_get

        original_cache = os.environ.get("CACHE_PATH")
        os.environ["CACHE_PATH"] = str(tmp_path)

        try:
            cache_set("test_key", "test_value")
            result = cache_get("test_key")

            assert result == "test_value"
        finally:
            if original_cache is not None:
                os.environ["CACHE_PATH"] = original_cache
            elif "CACHE_PATH" in os.environ:
                del os.environ["CACHE_PATH"]

    @pytest.mark.asyncio
    async def test_cache_get_nonexistent(self, tmp_path):
        """Test getting a non-existent cache value."""
        import os
        from storage.file_cache import cache_get

        original_cache = os.environ.get("CACHE_PATH")
        os.environ["CACHE_PATH"] = str(tmp_path)

        try:
            result = cache_get("nonexistent_key")

            assert result is None
        finally:
            if original_cache is not None:
                os.environ["CACHE_PATH"] = original_cache
            elif "CACHE_PATH" in os.environ:
                del os.environ["CACHE_PATH"]

    @pytest.mark.asyncio
    async def test_cache_expiration(self, tmp_path):
        """Test that cached values expire after TTL."""
        import os
        from datetime import datetime, timezone, timedelta
        from storage.file_cache import cache_set, cache_get, _cache_path
        import json

        original_cache = os.environ.get("CACHE_PATH")
        os.environ["CACHE_PATH"] = str(tmp_path)

        try:
            cache_set("test_key", "test_value")

            # Manually modify cache file to set stored_at to past
            path = _cache_path("test_key")
            old_time = (
                datetime.now(timezone.utc) - timedelta(hours=25)
            ).isoformat()
            with open(path, "w") as f:
                json.dump({"stored_at": old_time, "value": "test_value"}, f)

            # Try to get - should return None and delete file
            result = cache_get("test_key")

            assert result is None
            assert not os.path.exists(path)
        finally:
            if original_cache is not None:
                os.environ["CACHE_PATH"] = original_cache
            elif "CACHE_PATH" in os.environ:
                del os.environ["CACHE_PATH"]
