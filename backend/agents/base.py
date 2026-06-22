def build_debate_prompt(
    system_prompt: str,
    question: str,
    round_messages: list[dict],
    evidence_pool: list[dict],
    persona_name: str,
    round_number: int,
) -> list[dict]:
    source_context = ""
    if evidence_pool:
        source_context = "\n\nAvailable evidence pool:\n" + "\n".join(
            f"[{s['id']}] {s['title']} ({s['domain']}): {s['summary']}"
            for s in evidence_pool[:20]
        )

    prior_context = ""
    if round_messages:
        prior_context = "\n\nPrior debate messages this session:\n" + "\n".join(
            f"Round {m['round_number']} — {m['persona_name']}: {m['content']}"
            for m in round_messages
        )

    user_content = (
        f"Question under debate: {question}\n"
        f"You are: {persona_name} (Round {round_number})\n"
        f"{source_context}"
        f"{prior_context}\n\n"
        "Respond in your role. If there are prior messages, address them directly. "
        "Add new evidence, revise your position, or expose a flaw in another's reasoning. "
        "Do not repeat what was already said. Be concise and specific. "
        "Output valid JSON with keys: position, argument, evidence_used (list of source ids from evidence pool), "
        "challenge_to_others, confidence (Low/Medium/High)."
    )

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content},
    ]


def build_observer_checkpoint_prompt(
    question: str,
    all_messages: list[dict],
    round_number: int,
) -> list[dict]:
    messages_text = "\n".join(
        f"Round {m['round_number']} — {m['persona_name']}: {m['content']}"
        for m in all_messages
    )
    content = (
        f"Question: {question}\n\n"
        f"Debate so far (through Round {round_number}):\n{messages_text}\n\n"
        "As Observer, evaluate the debate. Output valid JSON with keys:\n"
        "- consensus_score: float 0.0-1.0 (how aligned are positions)\n"
        "- repetition_score: float 0.0-1.0 (how much are they repeating themselves)\n"
        "- agreements: list of strings (what they agree on)\n"
        "- disagreements: list of strings (what remains unresolved)\n"
        "- should_continue: boolean (true if another round would add value)\n"
        "- reason: one sentence explaining your decision"
    )
    return [{"role": "user", "content": content}]


def build_final_report_prompt(
    question: str,
    all_messages: list[dict],
    checkpoints: list[dict],
    sources: list[dict],
) -> list[dict]:
    messages_text = "\n".join(
        f"Round {m['round_number']} — {m['persona_name']}: {m['content']}"
        for m in all_messages
    )
    last_checkpoint = checkpoints[-1] if checkpoints else {}
    agreements = last_checkpoint.get("agreements", [])
    disagreements = last_checkpoint.get("disagreements", [])
    consensus_score = last_checkpoint.get("consensus_score", 0.0)

    source_list = "\n".join(
        f"- [{s['id']}] {s['title']} ({s['domain']})" for s in sources[:20]
    )

    content = (
        f"Question: {question}\n\n"
        f"Full debate transcript:\n{messages_text}\n\n"
        f"Known agreements: {agreements}\n"
        f"Known disagreements: {disagreements}\n"
        f"Consensus score: {consensus_score:.2f}\n\n"
        f"Sources available:\n{source_list}\n\n"
        "As Observer, generate the final report. Format as markdown with these sections:\n"
        "## Direct Answer\n"
        "## Executive Summary\n"
        "## Council Recommendation\n"
        "## Confidence Level (Low/Medium/High)\n"
        "## Key Agreements\n"
        "## Key Disagreements\n"
        "## Optimist's Strongest Argument\n"
        "## Pessimist's Strongest Argument\n"
        "## Contrarian's Strongest Objection\n"
        "## Key Risks\n"
        "## Key Opportunities\n"
        "## Sources\n"
        "## Open Questions\n"
        "## Suggested Next Step\n\n"
        "Be direct. If the council did not reach consensus, say so clearly. "
        "Do not invent agreement where disagreement remains."
    )
    return [{"role": "user", "content": content}]
