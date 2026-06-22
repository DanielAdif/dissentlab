from storage.repositories.personas import DEFAULT_PERSONAS

OBSERVER_SYSTEM_PROMPT = next(
    p["system_prompt"] for p in DEFAULT_PERSONAS if p["id"] == "observer"
)


class ObserverAgent:
    id = "observer"
    name = "Observer"
    system_prompt = OBSERVER_SYSTEM_PROMPT
