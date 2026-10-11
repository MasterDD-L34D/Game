"""Skiv QBN — Quality-Based Narrative storylet selector (zero deps).

Pattern: SimpleQBN (videlais/simple-qbn) + Fallen London salience system.
Reimplemented inline in Python to respect Game CLAUDE.md no-new-deps constraint.

Storylets in `data/core/narrative/skiv_storylets.yaml`:
- Each has `requires` (quality predicates) + `salience` (priority) + `text`
- Selector picks highest-salience storylet matching current state qualities
- Tie-break by id (alpha sort) → fully deterministic, replay-safe

Predicates supported in `requires`:
  { gte: N }    quality >= N
  { lte: N }    quality <= N
  { gt: N }     quality > N
  { lt: N }     quality < N
  { eq: V }     quality == V
  { ne: V }     quality != V
  { in: [..] }  quality in list

Empty `requires: {}` always matches (catchall).

Usage:
    from skiv_qbn import select_storylet
    storylet = select_storylet(qualities, state)
    text = storylet["text"].format(**qualities)
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional

THIS = Path(__file__).resolve()
ROOT = THIS.parent.parent.parent
STORYLETS_PATH = ROOT / "data" / "core" / "narrative" / "skiv_storylets.yaml"

_STORYLETS_CACHE: Optional[List[Dict[str, Any]]] = None


def _load_storylets() -> List[Dict[str, Any]]:
    global _STORYLETS_CACHE
    if _STORYLETS_CACHE is not None:
        return _STORYLETS_CACHE
    _STORYLETS_CACHE = []
    if not STORYLETS_PATH.exists():
        return _STORYLETS_CACHE
    try:
        import yaml  # type: ignore
        with STORYLETS_PATH.open("r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
        _STORYLETS_CACHE = data.get("storylets") or []
    except Exception:
        _STORYLETS_CACHE = []
    return _STORYLETS_CACHE


def _check_predicate(value: Any, pred: Dict[str, Any]) -> bool:
    """Eval a single predicate against a value."""
    if not isinstance(pred, dict):
        return False
    for op, target in pred.items():
        try:
            if op == "gte" and not (value is not None and value >= target):
                return False
            elif op == "lte" and not (value is not None and value <= target):
                return False
            elif op == "gt" and not (value is not None and value > target):
                return False
            elif op == "lt" and not (value is not None and value < target):
                return False
            elif op == "eq" and value != target:
                return False
            elif op == "ne" and value == target:
                return False
            elif op == "in" and value not in target:
                return False
        except (TypeError, ValueError):
            return False
    return True


def _matches(storylet: Dict[str, Any], qualities: Dict[str, Any]) -> bool:
    requires = storylet.get("requires") or {}
    if not requires:
        return True  # catchall
    for q_name, pred in requires.items():
        if not _check_predicate(qualities.get(q_name), pred):
            return False
    return True


def select_storylet(qualities: Dict[str, Any],
                    state: Optional[Dict[str, Any]] = None,
                    storylets: Optional[List[Dict[str, Any]]] = None) -> Optional[Dict[str, Any]]:
    """Pick highest-salience matching storylet. Deterministic tie-break by id.

    Returns dict with {id, salience, requires, text} or None if no match.
    Merges state qualities (level, stress, etc.) with passed qualities for predicates.
    """
    pool = storylets or _load_storylets()
    if not pool:
        return None
    # Merge state qualities into qualities dict for predicate eval.
    eval_q = dict(qualities)
    if state:
        for k in ("level", "stress", "composure", "curiosity", "mutations_count"):
            if k in state:
                eval_q.setdefault(k, state[k])
        lc = state.get("lifecycle") or {}
        if lc.get("phase_id"):
            eval_q.setdefault("phase_id", lc["phase_id"])
    matching = [s for s in pool if _matches(s, eval_q)]
    if not matching:
        return None
    # Sort by (-salience, id) — highest salience first, alpha tie-break.
    matching.sort(key=lambda s: (-int(s.get("salience", 0)), str(s.get("id", ""))))
    return matching[0]


def render_storylet_text(storylet: Dict[str, Any], qualities: Dict[str, Any]) -> str:
    """Format storylet text with qualities. Falls back to raw text on KeyError."""
    text = storylet.get("text", "")
    try:
        return text.format(**qualities)
    except (KeyError, ValueError):
        return text


def storylet_count() -> int:
    return len(_load_storylets())
