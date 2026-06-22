from langgraph.graph import StateGraph, END
from graph.state import CouncilState
from graph.nodes import (
    node_validate_input,
    node_task_brief,
    node_persona_research,
    node_evidence_merger,
    node_initial_positions,
    node_debate_round,
    node_observer_checkpoint,
    node_final_report,
    should_continue,
)

# Node names must not collide with CouncilState field names.
# Prefixing with "node_" avoids conflicts with fields like task_brief, final_report, etc.
_VALIDATE = "node_validate_input"
_TASK_BRIEF = "node_task_brief"
_PERSONA_RESEARCH = "node_persona_research"
_EVIDENCE_MERGER = "node_evidence_merger"
_INITIAL_POSITIONS = "node_initial_positions"
_DEBATE_ROUND = "debate_round"
_OBSERVER = "node_observer_checkpoint"
_FINAL_REPORT = "node_final_report"


def build_graph():
    builder = StateGraph(CouncilState)

    builder.add_node(_VALIDATE, node_validate_input)
    builder.add_node(_TASK_BRIEF, node_task_brief)
    builder.add_node(_PERSONA_RESEARCH, node_persona_research)
    builder.add_node(_EVIDENCE_MERGER, node_evidence_merger)
    builder.add_node(_INITIAL_POSITIONS, node_initial_positions)
    builder.add_node(_DEBATE_ROUND, node_debate_round)
    builder.add_node(_OBSERVER, node_observer_checkpoint)
    builder.add_node(_FINAL_REPORT, node_final_report)

    builder.set_entry_point(_VALIDATE)
    builder.add_edge(_VALIDATE, _TASK_BRIEF)
    builder.add_edge(_TASK_BRIEF, _PERSONA_RESEARCH)
    builder.add_edge(_PERSONA_RESEARCH, _EVIDENCE_MERGER)
    builder.add_edge(_EVIDENCE_MERGER, _INITIAL_POSITIONS)
    builder.add_edge(_INITIAL_POSITIONS, _DEBATE_ROUND)
    builder.add_edge(_DEBATE_ROUND, _OBSERVER)
    builder.add_conditional_edges(
        _OBSERVER,
        should_continue,
        {"debate_round": _DEBATE_ROUND, "final_report": _FINAL_REPORT},
    )
    builder.add_edge(_FINAL_REPORT, END)

    return builder.compile()
