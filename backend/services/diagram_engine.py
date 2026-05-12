"""LLM-based diagram DSL generation for GTU exam answers."""
from __future__ import annotations
import re

from services.question_intent import (
    DIAGRAM_FLOWCHART, DIAGRAM_BLOCK, DIAGRAM_SEQUENCE,
    DIAGRAM_ER, DIAGRAM_CLASS, DIAGRAM_TREE,
    DIAGRAM_STATE, DIAGRAM_CIRCUIT, DIAGRAM_NETWORK,
)

# Maps diagram_type → (render_engine, DSL system prompt snippet)
_DSL_CONFIG: dict[str, tuple[str, str]] = {
    DIAGRAM_FLOWCHART: ("mermaid", (
        "Output ONLY valid Mermaid flowchart DSL. No explanation.\n"
        "Start with: flowchart TD\n"
        "Use: --> for arrows, [Box], {Decision}, ((Circle)), |label| for edge labels.\n"
        "Max 12 nodes. All node text 1-3 words. Label edges with action/condition."
    )),
    DIAGRAM_BLOCK: ("mermaid", (
        "Output ONLY valid Mermaid flowchart DSL (left-to-right block diagram). No explanation.\n"
        "Start with: flowchart LR\n"
        "Rectangular nodes only [Component]. Group related components with subgraph.\n"
        "Max 10 nodes. Label edges with signal/bus names."
    )),
    DIAGRAM_SEQUENCE: ("mermaid", (
        "Output ONLY valid Mermaid sequenceDiagram DSL. No explanation.\n"
        "Start with: sequenceDiagram\n"
        "Use ->> for sync messages, -->> for async/response.\n"
        "Include activate/deactivate for long operations. Max 6 actors, 10 messages."
    )),
    DIAGRAM_ER: ("mermaid", (
        "Output ONLY valid Mermaid erDiagram DSL. No explanation.\n"
        "Start with: erDiagram\n"
        "Use ||--o{, }o--|| etc. for cardinality. Each entity max 4 attributes."
    )),
    DIAGRAM_CLASS: ("mermaid", (
        "Output ONLY valid Mermaid classDiagram DSL. No explanation.\n"
        "Start with: classDiagram\n"
        "Use <|-- for inheritance, *-- for composition, o-- for aggregation.\n"
        "Each class: max 4 attributes, max 3 methods. Show visibility (+/-/#)."
    )),
    DIAGRAM_TREE: ("graphviz", (
        "Output ONLY valid Graphviz DOT language for a tree/graph. No explanation.\n"
        "Start with: digraph G {\n"
        "Use rankdir=TB; for top-to-bottom trees.\n"
        "Nodes: node [shape=circle]; or node [shape=record]; for structs.\n"
        "Max 12 nodes."
    )),
    DIAGRAM_STATE: ("mermaid", (
        "Output ONLY valid Mermaid stateDiagram-v2 DSL. No explanation.\n"
        "Start with: stateDiagram-v2\n"
        "Use --> for transitions, label transitions with event/condition.\n"
        "Include [*] for start/end states. Max 8 states."
    )),
    DIAGRAM_CIRCUIT: ("ascii", (
        "Output a neat ASCII art circuit/logic diagram.\n"
        "Use symbols: AND=[&], OR=[>=1], NOT=[1], NAND=[&-], NOR=[>=1-], XOR=[=1].\n"
        "Draw wire paths with - | + characters.\n"
        "Input labels (A, B, C) on left, output (Y, Z) on right. Max 60 chars wide."
    )),
    DIAGRAM_NETWORK: ("graphviz", (
        "Output ONLY valid Graphviz DOT language for a network topology. No explanation.\n"
        "Start with: graph G {\n"
        "node [shape=box] for routers/switches, node [shape=ellipse] for hosts.\n"
        "Label edges with bandwidth/protocol where relevant. Max 10 nodes."
    )),
}

_DIAGRAM_SYSTEM = (
    "You are a diagram code generator for GTU engineering exam answers.\n"
    "Generate diagram DSL that is syntactically valid and visually clear.\n"
    "RULES:\n"
    "- Output ONLY the diagram code. No explanation, no markdown fences.\n"
    "- Keep it simple — examiners need clarity, not complexity.\n"
    "- All component names must match the question context exactly."
)


def generate_diagram_dsl(
    question: str,
    diagram_type: str,
    subject_context: str = "",
) -> dict:
    """
    Returns {engine, dsl, fallback_ascii} where engine is
    'mermaid' | 'graphviz' | 'ascii'.
    Sync wrapper — calls generate_text from llm service.
    """
    from services.llm import generate_text

    engine, type_prompt = _DSL_CONFIG.get(diagram_type, _DSL_CONFIG[DIAGRAM_BLOCK])

    user_prompt = (
        f"Question: {question}\n"
        f"Subject context: {subject_context or 'GTU engineering exam'}\n"
        f"Diagram type: {diagram_type}\n\n"
        f"{type_prompt}\n\n"
        f"{_DIAGRAM_SYSTEM}\n\n"
        "Generate the diagram code now:"
    )

    try:
        dsl = generate_text(user_prompt, temperature=0.1, max_tokens=600)
    except Exception:
        dsl = f"# Diagram generation failed for: {question}"

    # Strip accidental markdown fences
    dsl = re.sub(r'^```[\w]*\n?|```$', '', dsl.strip(), flags=re.MULTILINE).strip()

    fallback_ascii = _generate_ascii_fallback(question, diagram_type)

    return {"engine": engine, "dsl": dsl, "fallback_ascii": fallback_ascii}


def _generate_ascii_fallback(question: str, diagram_type: str) -> str:
    from services.llm import generate_text
    prompt = (
        f"Draw a neat ASCII diagram for this GTU question: {question}\n"
        f"Diagram type: {diagram_type}\n"
        "Use box-drawing characters: +--+| and arrows -> <-\n"
        "Max 20 lines, 70 chars wide. Label all components. Output ONLY the diagram."
    )
    try:
        return generate_text(prompt, temperature=0.2, max_tokens=400)
    except Exception:
        return f"[{diagram_type.upper()} DIAGRAM for: {question[:60]}]"
