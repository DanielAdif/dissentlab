from typing import TypedDict, Optional


class Source(TypedDict):
    id: str
    title: str
    url: str
    domain: str
    retrieved_at: str
    summary: str
    discovered_by: str
    relevance_score: float
    claims: list[str]


class PersonaConfig(TypedDict):
    id: str
    name: str
    role: str
    system_prompt: str
    enabled: bool
    model_provider: str
    model_name: str
    tools_enabled: list[str]


class PersonaFinding(TypedDict):
    persona_id: str
    summary: str
    sources: list[str]
    claims: list[str]
    confidence: str


class DebateMessage(TypedDict):
    round_number: int
    persona_id: str
    persona_name: str
    content: str
    cited_sources: list[str]
    confidence: str
    created_at: str


class ObserverCheckpoint(TypedDict):
    round_number: int
    consensus_score: float
    repetition_score: float
    agreements: list[str]
    disagreements: list[str]
    should_continue: bool
    reason: str


class CouncilState(TypedDict):
    session_id: str
    user_question: str
    task_brief: str
    debate_intensity: str
    personas: list[PersonaConfig]
    sources: list[Source]
    persona_findings: list[PersonaFinding]
    debate_messages: list[DebateMessage]
    observer_checkpoints: list[ObserverCheckpoint]
    round_count: int
    max_rounds: int
    consensus_threshold: float
    final_report: Optional[str]
    status: str
    user_stop_requested: bool
    model_config: dict
    error: Optional[str]
