"""Evidence merger for deduplicating and scoring research sources."""

from storage.chroma_client import ChromaClient
from storage.repositories.sources import SourceRepository


class EvidenceMerger:
    """Merges, deduplicates, and scores evidence sources."""

    def __init__(self, source_repo: SourceRepository):
        """Initialize the evidence merger.

        Args:
            source_repo: SourceRepository instance for persisting sources
        """
        self.source_repo = source_repo
        self.chroma = ChromaClient()

    def merge_and_deduplicate(
        self, sources: list[dict], question: str
    ) -> list[dict]:
        """Merge and deduplicate sources by URL, then score by relevance.

        Args:
            sources: List of source dicts from search results
            question: The research question for relevance scoring

        Returns:
            Deduplicated sources scored by relevance (highest first)
        """
        return self.chroma.deduplicate(sources, question)

    async def store_sources(
        self,
        session_id: str,
        sources: list[dict],
        discovered_by: str,
    ) -> list[dict]:
        """Store sources to the database after deduplication and scoring.

        Args:
            session_id: The session ID
            sources: Deduplicated sources with relevance_score
            discovered_by: Persona ID that discovered these sources

        Returns:
            List of stored source records
        """
        stored = []
        for src in sources:
            # Check if source already exists in this session
            existing = await self.source_repo.get_by_url(session_id, src["url"])
            if existing:
                # Skip if already stored
                continue

            # Store new source
            record = await self.source_repo.create(
                session_id=session_id,
                title=src.get("title", ""),
                url=src["url"],
                domain=self._extract_domain(src["url"]),
                summary=src.get("summary", ""),
                discovered_by=discovered_by,
                relevance_score=src.get("relevance_score", 0.5),
            )
            stored.append(record)

        return stored

    @staticmethod
    def _extract_domain(url: str) -> str:
        """Extract domain from URL.

        Args:
            url: The full URL

        Returns:
            The domain (host) part of the URL
        """
        from urllib.parse import urlparse

        parsed = urlparse(url)
        return parsed.netloc or "unknown"
