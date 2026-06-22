from datetime import datetime, timezone
import aiosqlite

class SettingsRepository:
    def __init__(self, db: aiosqlite.Connection):
        self.db = db

    async def get(self, key: str) -> str | None:
        async with self.db.execute(
            "SELECT value FROM settings WHERE key = ?", (key,)
        ) as cursor:
            row = await cursor.fetchone()
            return row["value"] if row else None

    async def set(self, key: str, value: str) -> None:
        now = datetime.now(timezone.utc).isoformat()
        await self.db.execute(
            """INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
               ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at""",
            (key, value, now)
        )
        await self.db.commit()

    async def delete(self, key: str) -> None:
        await self.db.execute("DELETE FROM settings WHERE key = ?", (key,))
        await self.db.commit()

    async def all(self) -> dict[str, str]:
        async with self.db.execute("SELECT key, value FROM settings") as cursor:
            rows = await cursor.fetchall()
            return {r["key"]: r["value"] for r in rows}
