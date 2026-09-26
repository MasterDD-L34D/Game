"""Tests for scripts/generate_trait_native_abilities.py emit_ability_yaml.

Creature-trait mechanics: AoE trait-granted abilities (e.g. matrice_pulse,
effect_type suppress_ability) need aoe_size + range copied from the
trait_mechanics.yaml active_effect into the generated trait_native ability.
The generator already copies status_id / status_duration; this asserts the
AoE fields ride through too.
"""

import importlib.util
from pathlib import Path

_REPO = Path(__file__).resolve().parents[1]
_GEN = _REPO / "scripts" / "generate_trait_native_abilities.py"
_spec = importlib.util.spec_from_file_location("gen_trait_native_abilities", _GEN)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)


def test_emit_ability_yaml_copies_aoe_size_and_range():
    eff = {
        "ability_id": "matrice_pulse",
        "effect_type": "suppress_ability",
        "cost_ap": 2,
        "aoe_size": 3,
        "range": 3,
        "status_id": "inibito",
        "status_duration": 2,
        "target": "enemy",
    }
    out = _mod.emit_ability_yaml("matrice_pulse", "matrice_antimagia", eff)
    assert "aoe_size: 3" in out, out
    assert "range: 3" in out, out


def test_emit_ability_yaml_omits_aoe_fields_when_absent():
    # A self-buff trait ability (no AoE) must NOT gain stray aoe_size / range lines.
    eff = {
        "ability_id": "elastic_absorb",
        "effect_type": "buff",
        "cost_ap": 2,
        "buff_stat": "defense_mod",
        "buff_amount": 2,
        "buff_duration": 2,
        "target": "self",
    }
    out = _mod.emit_ability_yaml("elastic_absorb", "struttura_elastica_amorfa", eff)
    assert "aoe_size" not in out, out
    assert "range:" not in out, out


def test_emit_ability_yaml_still_copies_existing_fields():
    eff = {
        "ability_id": "matrice_pulse",
        "effect_type": "suppress_ability",
        "status_id": "inibito",
        "status_duration": 2,
        "aoe_size": 3,
    }
    out = _mod.emit_ability_yaml("matrice_pulse", "matrice_antimagia", eff)
    assert "effect_type: suppress_ability" in out
    assert "status_id: inibito" in out
    assert "status_duration: 2" in out
    assert "trait_id: matrice_antimagia" in out
