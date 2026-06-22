from storage.repositories.personas import DEFAULT_PERSONAS

PESSIMIST_SYSTEM_PROMPT = next(
    p["system_prompt"] for p in DEFAULT_PERSONAS if p["id"] == "pessimist"
)


class PessimistPersona:
    id = "pessimist"
    name = "Pessimist"
    system_prompt = PESSIMIST_SYSTEM_PROMPT
