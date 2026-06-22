from storage.repositories.personas import DEFAULT_PERSONAS

OPTIMIST_SYSTEM_PROMPT = next(
    p["system_prompt"] for p in DEFAULT_PERSONAS if p["id"] == "optimist"
)


class OptimistPersona:
    id = "optimist"
    name = "Optimist"
    system_prompt = OPTIMIST_SYSTEM_PROMPT
