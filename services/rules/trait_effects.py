"""Evaluator per active_effects dei trait — Fase 3 del combat system.

Port in Python dell'evaluator JS ``apps/backend/services/traitEffects.js``.
Carica ``data/core/traits/active_effects.yaml`` e valuta i trigger dei
trait sugli attack hit, applicando extra_damage, damage_reduction e
apply_status.

Funzioni pure — nessun side effect, nessun I/O dopo il load iniziale.
Il loader e' tollerante: se il YAML non esiste o e' malformato, ritorna
un registry vuoto e l'evaluator non produce effetti.

Scope Fase 3: solo trigger ``action_type: attack``. Trigger per ability
e altri action type sono deferred.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional


# ------------------------------------------------------------------
# Loader
# ------------------------------------------------------------------

DEFAULT_ACTIVE_EFFECTS_PATH: Path = (
    Path(__file__).resolve().parents[2]
    / "data"
    / "core"
    / "traits"
    / "active_effects.yaml"
)


def load_active_effects(
    path: Optional[Path] = None,
) -> Dict[str, Dict[str, Any]]:
    """Carica il registry active_effects da YAML.

    Ritorna un dict ``{trait_id: trait_def}`` dove ``trait_def`` ha
    campi ``tier``, ``category``, ``applies_to``, ``trigger``, ``effect``.

    Tollerante: file assente, YAML malformato, o struttura inattesa
    → ritorna ``{}``.
    """

    target = path if path is not None else DEFAULT_ACTIVE_EFFECTS_PATH
    if not target.exists():
        return {}
    try:
        import yaml  # type: ignore[import-untyped]
    except ImportError:
        return {}
    try:
        with target.open("r", encoding="utf-8") as handle:
            doc = yaml.safe_load(handle) or {}
    except Exception:
        return {}
    if not isinstance(doc, Mapping):
        return {}
    traits = doc.get("traits")
    if not isinstance(traits, Mapping):
        return {}
    return dict(traits)


# ------------------------------------------------------------------
# Trigger evaluation
# ------------------------------------------------------------------


def _check_trigger(
    trigger: Mapping[str, Any],
    *,
    action_type: str = "attack",
    hit: bool = False,
    mos: int = 0,
    kill: bool = False,
    melee: bool = False,
) -> bool:
    """Valuta se un trigger matcha le condizioni dell'azione corrente.

    Campi trigger supportati (tutti opzionali, AND logic):
    - ``action_type``: deve corrispondere (default 'attack')
    - ``on_result``: 'hit' → richiede hit=True
    - ``min_mos``: MoS minimo per triggerare
    - ``on_kill``: True → richiede kill=True
    - ``melee_only``: True → richiede melee=True (Manhattan == 1)
    - ``requires``: stringa posizionale (ignorata in Python, il rules
      engine non tracka posizioni — trigger sempre True per ora)

    Ritorna True se tutti i campi presenti sono soddisfatti.
    """

    if not trigger or not isinstance(trigger, Mapping):
        return False
    # action_type check
    t_action = trigger.get("action_type")
    if t_action and str(t_action) != action_type:
        return False
    # on_result check
    on_result = trigger.get("on_result")
    if on_result == "hit" and not hit:
        return False
    # min_mos check
    min_mos = trigger.get("min_mos")
    if min_mos is not None and mos < int(min_mos):
        return False
    # on_kill check
    on_kill = trigger.get("on_kill")
    if on_kill is True and not kill:
        return False
    # melee_only check
    melee_only = trigger.get("melee_only")
    if melee_only is True and not melee:
        return False
    return True


# ------------------------------------------------------------------
# Effect evaluator
# ------------------------------------------------------------------


def evaluate_attack_traits(
    *,
    registry: Mapping[str, Mapping[str, Any]],
    actor_trait_ids: List[str],
    target_trait_ids: List[str],
    hit: bool,
    mos: int = 0,
    kill: bool = False,
    melee: bool = False,
) -> Dict[str, Any]:
    """Valuta gli active_effects di tutti i trait di actor e target
    dopo un attack, ritornando i modificatori di danno e gli status
    da applicare.

    Ritorna::

        {
            "damage_modifier": int,  # somma extra_damage - damage_reduction
            "trait_effects": [       # log entries per UI/debug
                {"trait_id": str, "kind": str, "amount": int, "triggered": bool, ...}
            ],
            "statuses_to_apply": [   # status da applicare post-damage
                {"target_side": "actor"|"target", "status_id": str, "duration": int}
            ],
        }
    """

    damage_mod = 0
    trait_effects: List[Dict[str, Any]] = []
    statuses_to_apply: List[Dict[str, Any]] = []

    # Actor traits (applies_to: actor)
    for trait_id in actor_trait_ids:
        entry = registry.get(trait_id)
        if not entry or not isinstance(entry, Mapping):
            continue
        if str(entry.get("applies_to", "")) != "actor":
            continue
        trigger = entry.get("trigger", {})
        effect = entry.get("effect", {})
        triggered = _check_trigger(
            trigger,
            action_type="attack",
            hit=hit,
            mos=mos,
            kill=kill,
            melee=melee,
        )
        kind = str(effect.get("kind", ""))
        log_entry: Dict[str, Any] = {
            "trait_id": trait_id,
            "kind": kind,
            "triggered": triggered,
            "log_tag": str(effect.get("log_tag", trait_id)),
        }
        if triggered:
            if kind == "extra_damage":
                amount = int(effect.get("amount", 0))
                damage_mod += amount
                log_entry["amount"] = amount
            elif kind == "apply_status":
                statuses_to_apply.append(
                    {
                        "target_side": str(effect.get("target_side", "target")),
                        "status_id": str(effect.get("stato", "")),
                        "duration": int(effect.get("turns", 1)),
                    }
                )
                log_entry["stato"] = str(effect.get("stato", ""))
                log_entry["turns"] = int(effect.get("turns", 1))
        trait_effects.append(log_entry)

    # Target traits (applies_to: target)
    for trait_id in target_trait_ids:
        entry = registry.get(trait_id)
        if not entry or not isinstance(entry, Mapping):
            continue
        if str(entry.get("applies_to", "")) != "target":
            continue
        trigger = entry.get("trigger", {})
        effect = entry.get("effect", {})
        triggered = _check_trigger(
            trigger,
            action_type="attack",
            hit=hit,
            mos=mos,
            kill=kill,
            melee=melee,
        )
        kind = str(effect.get("kind", ""))
        log_entry = {
            "trait_id": trait_id,
            "kind": kind,
            "triggered": triggered,
            "log_tag": str(effect.get("log_tag", trait_id)),
        }
        if triggered:
            if kind == "damage_reduction":
                amount = int(effect.get("amount", 0))
                damage_mod -= amount
                log_entry["amount"] = -amount
        trait_effects.append(log_entry)

    return {
        "damage_modifier": damage_mod,
        "trait_effects": trait_effects,
        "statuses_to_apply": statuses_to_apply,
    }


__all__ = [
    "DEFAULT_ACTIVE_EFFECTS_PATH",
    "evaluate_attack_traits",
    "load_active_effects",
]
