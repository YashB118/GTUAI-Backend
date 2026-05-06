from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class QuestionIntent:
    requires_code_example: bool
    is_numerical: bool
    is_comparison: bool


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


def detect_question_intent(question: str) -> QuestionIntent:
    lowered = (question or "").lower()
    requires_code_example = any(token in lowered for token in _CODE_HINTS)
    is_numerical = any(token in lowered for token in _NUMERICAL_HINTS)
    is_comparison = any(token in lowered for token in _COMPARISON_HINTS)
    return QuestionIntent(
        requires_code_example=requires_code_example,
        is_numerical=is_numerical,
        is_comparison=is_comparison,
    )
