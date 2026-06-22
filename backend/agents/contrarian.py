from storage.repositories.personas import DEFAULT_PERSONAS

CONTRARIAN_SYSTEM_PROMPT = next(
    p["system_prompt"] for p in DEFAULT_PERSONAS if p["id"] == "contrarian"
)


class ContrarianPersona:
    id = "contrarian"
    name = "Contrarian"
    system_prompt = CONTRARIAN_SYSTEM_PROMPT
