import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import aiosqlite

from tools.search import tavily_search
from tools.reader import read_url
from tools.summarizer import summarize_for_claim
from storage.db import run_migrations
from storage.repositories.sources import SourceRepository


class TestTavilySearch:
    """Tests for Tavily search functionality."""

    @pytest.mark.asyncio
    async def test_tavily_search_success(self):
        """Test successful Tavily search."""
        with patch("tools.search.TavilyClient") as mock_client_class:
            mock_client = MagicMock()
            mock_client_class.return_value = mock_client
            mock_client.search.return_value = {
                "results": [
                    {
                        "title": "Test Article",
                        "url": "https://example.com/article",
                        "content": "This is test content",
                        "score": 0.95,
                    }
                ]
            }

            result = await tavily_search("test query", "fake-api-key", max_results=5)

            assert len(result) == 1
            assert result[0]["title"] == "Test Article"
            assert result[0]["url"] == "https://example.com/article"
            assert result[0]["score"] == 0.95
            mock_client.search.assert_called_once_with(
                query="test query", max_results=5, include_raw_content=False
            )

    @pytest.mark.asyncio
    async def test_tavily_search_empty_results(self):
        """Test Tavily search with no results."""
        with patch("tools.search.TavilyClient") as mock_client_class:
            mock_client = MagicMock()
            mock_client_class.return_value = mock_client
            mock_client.search.return_value = {"results": []}

            result = await tavily_search("no results query", "fake-api-key")

            assert result == []

    @pytest.mark.asyncio
    async def test_tavily_search_multiple_results(self):
        """Test Tavily search with multiple results."""
        with patch("tools.search.TavilyClient") as mock_client_class:
            mock_client = MagicMock()
            mock_client_class.return_value = mock_client
            mock_client.search.return_value = {
                "results": [
                    {"title": "Article 1", "url": "https://example1.com", "score": 0.9},
                    {"title": "Article 2", "url": "https://example2.com", "score": 0.8},
                    {"title": "Article 3", "url": "https://example3.com", "score": 0.7},
                ]
            }

            result = await tavily_search("multi query", "fake-api-key", max_results=3)

            assert len(result) == 3
            assert result[0]["title"] == "Article 1"
            assert result[1]["title"] == "Article 2"
            assert result[2]["title"] == "Article 3"


class TestURLReader:
    """Tests for URL reading functionality."""

    @pytest.mark.asyncio
    async def test_read_url_from_cache(self, tmp_path):
        """Test reading URL from cache."""
        import os
        from tools.reader import _cache_path

        original_cache = os.environ.get("CACHE_PATH")
        os.environ["CACHE_PATH"] = str(tmp_path)

        try:
            # Create cache file
            url = "https://example.com/cached"
            cache_file = _cache_path(url)
            os.makedirs(os.path.dirname(cache_file), exist_ok=True)
            with open(cache_file, "w") as f:
                f.write("Cached content")

            result = await read_url(url)

            assert result == "Cached content"
        finally:
            if original_cache is not None:
                os.environ["CACHE_PATH"] = original_cache
            elif "CACHE_PATH" in os.environ:
                del os.environ["CACHE_PATH"]

    @pytest.mark.asyncio
    async def test_read_url_robots_blocked(self, tmp_path):
        """Test URL reading when robots.txt blocks access."""
        import os

        original_cache = os.environ.get("CACHE_PATH")
        os.environ["CACHE_PATH"] = str(tmp_path)

        try:
            with patch("tools.reader._check_robots", new_callable=AsyncMock) as mock_check_robots:
                mock_check_robots.return_value = False

                result = await read_url("https://robots-blocked.example.com/article")

                assert result == ""
        finally:
            if original_cache is not None:
                os.environ["CACHE_PATH"] = original_cache
            elif "CACHE_PATH" in os.environ:
                del os.environ["CACHE_PATH"]

    @pytest.mark.asyncio
    async def test_read_url_http_error(self):
        """Test URL reading with HTTP error."""
        with patch("tools.reader._check_robots", new_callable=AsyncMock) as mock_check_robots:
            mock_check_robots.return_value = True
            with patch("httpx.AsyncClient") as mock_client_class:
                mock_client = AsyncMock()
                mock_client.get = AsyncMock(side_effect=Exception("Connection error"))

                mock_client_class.return_value.__aenter__ = AsyncMock(
                    return_value=mock_client
                )
                mock_client_class.return_value.__aexit__ = AsyncMock(return_value=None)

                result = await read_url("https://example.com/error")

                assert result == ""


class TestSummarizer:
    """Tests for summarization functionality."""

    @pytest.mark.asyncio
    async def test_summarize_for_claim_success(self):
        """Test successful text summarization."""
        mock_gateway = AsyncMock()
        mock_gateway.generate = AsyncMock(return_value="This page discusses X.")
        mock_config = MagicMock()

        result = await summarize_for_claim(
            "This is a long text about topic X",
            "What is topic X?",
            mock_gateway,
            mock_config,
        )

        assert result == "This page discusses X."
        mock_gateway.generate.assert_called_once()

    @pytest.mark.asyncio
    async def test_summarize_for_claim_empty_text(self):
        """Test summarization with empty text."""
        mock_gateway = AsyncMock()
        mock_config = MagicMock()

        result = await summarize_for_claim("", "What is topic X?", mock_gateway, mock_config)

        assert result == ""
        mock_gateway.generate.assert_not_called()

    @pytest.mark.asyncio
    async def test_summarize_for_claim_whitespace_text(self):
        """Test summarization with whitespace-only text."""
        mock_gateway = AsyncMock()
        mock_config = MagicMock()

        result = await summarize_for_claim("   \n  ", "What is topic X?", mock_gateway, mock_config)

        assert result == ""
        mock_gateway.generate.assert_not_called()

    @pytest.mark.asyncio
    async def test_summarize_for_claim_gateway_error(self):
        """Test summarization with gateway error."""
        mock_gateway = AsyncMock()
        mock_gateway.generate = AsyncMock(side_effect=Exception("API error"))
        mock_config = MagicMock()

        result = await summarize_for_claim(
            "This is a long text about topic X",
            "What is topic X?",
            mock_gateway,
            mock_config,
        )

        assert result == ""

    @pytest.mark.asyncio
    async def test_summarize_for_claim_long_text_truncated(self):
        """Test summarization truncates long text to 3000 chars."""
        mock_gateway = AsyncMock()
        mock_gateway.generate = AsyncMock(return_value="Summary")
        mock_config = MagicMock()

        long_text = "A" * 5000

        await summarize_for_claim(long_text, "Question?", mock_gateway, mock_config)

        # Check that the message passed to gateway contains truncated text
        call_args = mock_gateway.generate.call_args
        messages = call_args[0][0]
        assert len(messages[0]["content"]) < len(long_text)


class TestSourceRepository:
    """Tests for source repository."""

    @pytest.mark.asyncio
    async def test_source_create(self, tmp_path):
        """Test creating a source record."""
        db_path = str(tmp_path / "test.db")
        async with aiosqlite.connect(db_path) as db:
            await run_migrations(db)
            repo = SourceRepository(db)

            source = await repo.create(
                session_id="test-session",
                title="Test Article",
                url="https://example.com/article",
                domain="example.com",
                summary="Test summary",
                discovered_by="persona-1",
                relevance_score=0.95,
            )

            assert source["id"] is not None
            assert source["title"] == "Test Article"
            assert source["url"] == "https://example.com/article"
            assert source["relevance_score"] == 0.95

    @pytest.mark.asyncio
    async def test_source_get_by_url(self, tmp_path):
        """Test getting a source by URL."""
        db_path = str(tmp_path / "test.db")
        async with aiosqlite.connect(db_path) as db:
            await run_migrations(db)
            repo = SourceRepository(db)

            await repo.create(
                session_id="test-session",
                title="Test Article",
                url="https://example.com/article",
                domain="example.com",
                summary="Test summary",
                discovered_by="persona-1",
                relevance_score=0.95,
            )

            fetched = await repo.get_by_url("test-session", "https://example.com/article")

            assert fetched is not None
            assert fetched["title"] == "Test Article"
            assert fetched["url"] == "https://example.com/article"

    @pytest.mark.asyncio
    async def test_source_get_by_url_not_found(self, tmp_path):
        """Test getting a non-existent source."""
        db_path = str(tmp_path / "test.db")
        async with aiosqlite.connect(db_path) as db:
            await run_migrations(db)
            repo = SourceRepository(db)

            fetched = await repo.get_by_url("test-session", "https://example.com/notfound")

            assert fetched is None

    @pytest.mark.asyncio
    async def test_source_list_for_session(self, tmp_path):
        """Test listing sources for a session."""
        db_path = str(tmp_path / "test.db")
        async with aiosqlite.connect(db_path) as db:
            await run_migrations(db)
            repo = SourceRepository(db)

            await repo.create(
                session_id="test-session",
                title="Article 1",
                url="https://example.com/1",
                domain="example.com",
                summary="Summary 1",
                discovered_by="persona-1",
                relevance_score=0.9,
            )
            await repo.create(
                session_id="test-session",
                title="Article 2",
                url="https://example.com/2",
                domain="example.com",
                summary="Summary 2",
                discovered_by="persona-1",
                relevance_score=0.8,
            )

            sources = await repo.list_for_session("test-session")

            assert len(sources) == 2
            # Should be ordered by relevance_score DESC
            assert sources[0]["relevance_score"] == 0.9
            assert sources[1]["relevance_score"] == 0.8

    @pytest.mark.asyncio
    async def test_source_list_for_session_empty(self, tmp_path):
        """Test listing sources for empty session."""
        db_path = str(tmp_path / "test.db")
        async with aiosqlite.connect(db_path) as db:
            await run_migrations(db)
            repo = SourceRepository(db)

            sources = await repo.list_for_session("nonexistent-session")

            assert sources == []
