import uuid
import json
from datetime import datetime, timezone
import aiosqlite

DEFAULT_PERSONAS = [
    {
        "id": "optimist",
        "name": "Optimist",
        "role": "Identifies opportunity, upside, and reasons the idea may succeed.",
        "system_prompt": (
            "You are the Optimist on this research council. Your role is to identify opportunity, "
            "upside, leverage, growth potential, and reasons the idea may succeed. "
            "Support claims with evidence when possible. Acknowledge uncertainty. "
            "Do not blindly agree with the user. Do not ignore major risks. "
            "Be direct and specific. Output valid JSON with keys: position, argument, "
            "evidence_used (list of source ids), challenge_to_others, confidence (Low/Medium/High)."
        ),
        "is_default": 1,
    },
    {
        "id": "pessimist",
        "name": "Pessimist",
        "role": "Identifies risks, failure modes, and reasons the idea may fail.",
        "system_prompt": (
            "You are the Pessimist on this research council. Your role is to identify risks, "
            "constraints, hidden costs, weaknesses, and reasons the idea may fail. "
            "Provide specific failure modes. Distinguish fatal risks from manageable ones. "
            "Do not be negative for entertainment only. Do not dismiss valid opportunities without evidence. "
            "Output valid JSON with keys: position, argument, evidence_used (list of source ids), "
            "challenge_to_others, confidence (Low/Medium/High)."
        ),
        "is_default": 1,
    },
    {
        "id": "contrarian",
        "name": "Contrarian",
        "role": "Challenges both sides, exposes assumptions, finds third interpretations.",
        "system_prompt": (
            "You are the Contrarian on this research council. Your role is to challenge both "
            "Optimist and Pessimist, expose weak assumptions, identify false binaries, and find "
            "third interpretations they are both missing. Attack reasoning, not personality. "
            "Always provide an alternative framing. Do not disagree randomly — cite your reasoning. "
            "Output valid JSON with keys: position, argument, evidence_used (list of source ids), "
            "challenge_to_others, confidence (Low/Medium/High)."
        ),
        "is_default": 1,
    },
    {
        "id": "observer",
        "name": "Observer",
        "role": "Neutral synthesizer. Tracks consensus, evaluates debate, generates final report.",
        "system_prompt": (
            "You are the Observer on this research council. You do not take sides. "
            "You monitor the debate, evaluate convergence, detect repetition, and produce synthesis. "
            "Do not invent consensus where disagreement remains. Clearly separate evidence, "
            "interpretation, and recommendation. "
            "For checkpoints, output valid JSON with keys: consensus_score (0.0-1.0), "
            "repetition_score (0.0-1.0), agreements (list), disagreements (list), "
            "should_continue (bool), reason (string)."
        ),
        "is_default": 1,
    },
]

class PersonaRepository:
    def __init__(self, db: aiosqlite.Connection):
        self.db = db

    async def seed_defaults(self) -> None:
        now = datetime.now(timezone.utc).isoformat()
        for p in DEFAULT_PERSONAS:
            await self.db.execute(
                """INSERT OR IGNORE INTO personas
                   (id, name, role, system_prompt, enabled, is_default, model_provider, model_name, tool_permissions, created_at, updated_at)
                   VALUES (?, ?, ?, ?, 1, ?, '', '', '[]', ?, ?)""",
                (p["id"], p["name"], p["role"], p["system_prompt"], p["is_default"], now, now)
            )
        await self.db.commit()

    async def list_active(self) -> list[dict]:
        async with self.db.execute(
            "SELECT * FROM personas WHERE enabled = 1 ORDER BY is_default DESC, created_at ASC"
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]

    async def get(self, persona_id: str) -> dict | None:
        async with self.db.execute(
            "SELECT * FROM personas WHERE id = ?", (persona_id,)
        ) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None

    async def create(self, name: str, role: str, system_prompt: str) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        persona_id = str(uuid.uuid4())
        await self.db.execute(
            """INSERT INTO personas (id, name, role, system_prompt, enabled, is_default, model_provider, model_name, tool_permissions, created_at, updated_at)
               VALUES (?, ?, ?, ?, 1, 0, '', '', '[]', ?, ?)""",
            (persona_id, name, role, system_prompt, now, now)
        )
        await self.db.commit()
        return await self.get(persona_id)

    async def update(self, persona_id: str, **fields) -> dict | None:
        if not fields:
            return await self.get(persona_id)
        now = datetime.now(timezone.utc).isoformat()
        fields["updated_at"] = now
        set_clause = ", ".join(f"{k} = ?" for k in fields)
        values = list(fields.values()) + [persona_id]
        await self.db.execute(
            f"UPDATE personas SET {set_clause} WHERE id = ?", values
        )
        await self.db.commit()
        return await self.get(persona_id)

    async def delete(self, persona_id: str) -> None:
        await self.db.execute(
            "DELETE FROM personas WHERE id = ? AND is_default = 0", (persona_id,)
        )
        await self.db.commit()

    async def restore_defaults(self) -> None:
        await self.seed_defaults()
