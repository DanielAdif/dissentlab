import uuid
from datetime import datetime, timezone
import aiosqlite


class SourceRepository:
    """Repository for managing research sources."""

    def __init__(self, db: aiosqlite.Connection):
        self.db = db

    async def create(
        self,
        session_id: str,
        title: str,
        url: str,
        domain: str,
        summary: str,
        discovered_by: str,
        relevance_score: float,
    ) -> dict:
        """Create a new source record.

        Args:
            session_id: The session ID this source belongs to
            title: Source title
            url: Source URL
            domain: Source domain
            summary: Source summary
            discovered_by: Persona ID that discovered this source
            relevance_score: Relevance score (0-1)

        Returns:
            Created source record as dict
        """
        now = datetime.now(timezone.utc).isoformat()
        src_id = str(uuid.uuid4())
        await self.db.execute(
            """INSERT INTO sources
               (id, session_id, title, url, domain, summary, discovered_by_persona_id, relevance_score, retrieved_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (src_id, session_id, title, url, domain, summary, discovered_by, relevance_score, now),
        )
        await self.db.commit()
        return {
            "id": src_id,
            "title": title,
            "url": url,
            "domain": domain,
            "summary": summary,
            "discovered_by": discovered_by,
            "relevance_score": relevance_score,
            "retrieved_at": now,
        }

    async def get_by_url(self, session_id: str, url: str) -> dict | None:
        """Get a source by URL within a session.

        Args:
            session_id: The session ID
            url: The source URL

        Returns:
            Source record or None if not found
        """
        async with self.db.execute(
            "SELECT * FROM sources WHERE session_id = ? AND url = ?", (session_id, url)
        ) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None

    async def list_for_session(self, session_id: str) -> list[dict]:
        """List all sources for a session, ordered by relevance.

        Args:
            session_id: The session ID

        Returns:
            List of source records
        """
        async with self.db.execute(
            "SELECT * FROM sources WHERE session_id = ? ORDER BY relevance_score DESC",
            (session_id,),
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]
