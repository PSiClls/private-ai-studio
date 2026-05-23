import re
from typing import Optional

FAST_MODEL = "llama-3.1-8b-instant"
SMART_MODEL = "llama-3.3-70b-versatile"
COMPOUND_MODEL = "groq/compound"

_COMPLEX_KEYWORDS = [
    "explain", "analyze", "compare", "contrast", "why", "how does",
    "difference between", "pros and cons", "advantages", "disadvantages",
    "summarize", "in detail", "elaborate", "describe", "define",
    "what is the", "what are the", "how to", "tutorial",
]

_CREATIVE_KEYWORDS = [
    "write", "story", "poem", "essay", "article", "blog", "creative",
    "imagine", "compose", "draft", "narrative", "fiction",
]

_CODE_KEYWORDS = [
    "code", "function", "class", "implement", "debug", "refactor",
    "python", "javascript", "typescript", "react", "api", "sql",
    "algorithm", "program", "compile", "syntax",
]


def _is_code_query(message: str) -> bool:
    lower = message.lower()
    score = 0
    for kw in _CODE_KEYWORDS:
        if kw in lower:
            score += 1
    if re.search(r'```|\bdef |\bfunction |\bclass |=>|->|\bimport\b|\bexport\b', message):
        score += 2
    return score >= 2


def _is_complex_query(message: str) -> bool:
    lower = message.lower()
    for kw in _COMPLEX_KEYWORDS:
        if kw in lower:
            return True
    return False


def _is_creative_query(message: str) -> bool:
    lower = message.lower()
    for kw in _CREATIVE_KEYWORDS:
        if kw in lower:
            return True
    return False


def _is_simple_query(message: str) -> bool:
    if len(message.strip()) < 60:
        return True
    if message.strip().endswith(("?", "!", ".")) and len(message) < 120:
        return True
    return False


def select_model(
    message: str,
    available_models: Optional[list[dict]] = None,
) -> str:
    if _is_code_query(message):
        return FAST_MODEL

    if _is_complex_query(message) and len(message) > 80:
        return SMART_MODEL

    if _is_creative_query(message):
        return SMART_MODEL

    if len(message) > 500:
        return SMART_MODEL

    if _is_simple_query(message):
        return FAST_MODEL

    return FAST_MODEL
