from __future__ import annotations

from dataclasses import dataclass

# ---------------------------------------------------------------------------
# Diagram type constants
# ---------------------------------------------------------------------------
DIAGRAM_NONE     = None
DIAGRAM_FLOWCHART = "flowchart"
DIAGRAM_BLOCK     = "block"
DIAGRAM_SEQUENCE  = "sequence"
DIAGRAM_ER        = "er"
DIAGRAM_CLASS     = "class"
DIAGRAM_TREE      = "tree"
DIAGRAM_STATE     = "state"
DIAGRAM_CIRCUIT   = "circuit"
DIAGRAM_NETWORK   = "network"


@dataclass(frozen=True)
class QuestionIntent:
    requires_code_example: bool
    is_numerical: bool
    is_comparison: bool
    requires_diagram: bool
    diagram_type: str | None
    template: str       # verb-to-template routing result


# ---------------------------------------------------------------------------
# Code hints
# ---------------------------------------------------------------------------
_CODE_HINTS = (
    "write a program",
    "write program",
    "write code",
    "code for",
    "implementation",
    "implement",
    "pseudocode",
    "pseudo code",
    "algorithm",
    "program to",
)

_NUMERICAL_HINTS = (
    "calculate",
    "compute",
    "find the value",
    "evaluate",
    "determine",
    "numerical",
)

_COMPARISON_HINTS = (
    "differentiate",
    "difference between",
    "compare",
    "versus",
    " vs ",
)

# ---------------------------------------------------------------------------
# Diagram detection
# ---------------------------------------------------------------------------
_DIAGRAM_EXPLICIT = ("draw", "sketch", "show", "illustrate", "represent")
_DIAGRAM_IMPLIED  = (
    "with diagram", "with neat diagram", "with figure",
    "with block diagram", "with labelled diagram", "with labeled diagram",
)

_DIAGRAM_TYPE_HINTS: dict[str, str] = {
    "flowchart":         DIAGRAM_FLOWCHART,
    "flow chart":        DIAGRAM_FLOWCHART,
    "flow diagram":      DIAGRAM_FLOWCHART,
    "algorithm":         DIAGRAM_FLOWCHART,
    "block diagram":     DIAGRAM_BLOCK,
    "architecture":      DIAGRAM_BLOCK,
    "structure":         DIAGRAM_BLOCK,
    "sequence diagram":  DIAGRAM_SEQUENCE,
    "message passing":   DIAGRAM_SEQUENCE,
    "handshake":         DIAGRAM_SEQUENCE,
    "er diagram":        DIAGRAM_ER,
    "entity relationship": DIAGRAM_ER,
    "database design":   DIAGRAM_ER,
    "class diagram":     DIAGRAM_CLASS,
    "uml":               DIAGRAM_CLASS,
    "inheritance":       DIAGRAM_CLASS,
    "tree":              DIAGRAM_TREE,
    "binary tree":       DIAGRAM_TREE,
    "bst":               DIAGRAM_TREE,
    "heap":              DIAGRAM_TREE,
    "linked list":       DIAGRAM_TREE,
    "state diagram":     DIAGRAM_STATE,
    "state machine":     DIAGRAM_STATE,
    "finite automata":   DIAGRAM_STATE,
    "process states":    DIAGRAM_STATE,
    "logic gate":        DIAGRAM_CIRCUIT,
    "circuit":           DIAGRAM_CIRCUIT,
    "truth table":       DIAGRAM_CIRCUIT,
    "digital circuit":   DIAGRAM_CIRCUIT,
    "network topology":  DIAGRAM_NETWORK,
    "topology":          DIAGRAM_NETWORK,
    "network diagram":   DIAGRAM_NETWORK,
}

# ---------------------------------------------------------------------------
# Verb-to-template routing
# ---------------------------------------------------------------------------
VERB_TEMPLATES: dict[str, str] = {
    "define":              "definition",
    "state":               "list",
    "list":                "list",
    "enumerate":           "list",
    "enlist":              "list",
    "explain":             "explanation",
    "describe":            "explanation",
    "discuss":             "explanation",
    "elaborate":           "explanation",
    "derive":              "derivation",
    "prove":               "derivation",
    "compare":             "comparison",
    "differentiate":       "comparison",
    "write a program":     "code",
    "implement":           "code",
    "write code":          "code",
    "draw":                "diagram_only",
    "sketch":              "diagram_only",
    "solve":               "numerical",
    "calculate":           "numerical",
    "find":                "numerical",
    "compute":             "numerical",
    "write a short note":  "explanation",
}


def detect_template(question_text: str) -> str:
    q = question_text.lower()
    for verb, template in VERB_TEMPLATES.items():
        if q.startswith(verb) or f" {verb} " in q:
            return template
    return "explanation"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def detect_question_intent(question: str) -> QuestionIntent:
    lowered = (question or "").lower()

    requires_code_example = any(t in lowered for t in _CODE_HINTS)
    is_numerical          = any(t in lowered for t in _NUMERICAL_HINTS)
    is_comparison         = any(t in lowered for t in _COMPARISON_HINTS)

    explicit = any(lowered.startswith(v) or f" {v} " in lowered for v in _DIAGRAM_EXPLICIT)
    implied  = any(t in lowered for t in _DIAGRAM_IMPLIED)
    requires_diagram = explicit or implied

    diagram_type = DIAGRAM_NONE
    if requires_diagram:
        for hint, dtype in _DIAGRAM_TYPE_HINTS.items():
            if hint in lowered:
                diagram_type = dtype
                break
        if diagram_type is DIAGRAM_NONE:
            diagram_type = DIAGRAM_BLOCK  # safe default for unlabeled "draw" questions

    template = detect_template(question)

    return QuestionIntent(
        requires_code_example=requires_code_example,
        is_numerical=is_numerical,
        is_comparison=is_comparison,
        requires_diagram=requires_diagram,
        diagram_type=diagram_type,
        template=template,
    )
