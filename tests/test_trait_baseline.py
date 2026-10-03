from pathlib import Path
import sys

import pytest


PROJECT_ROOT = Path(__file__).resolve().parents[1]
TOOLS_DIR = PROJECT_ROOT / "tools" / "py"

if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))


@pytest.fixture(scope="module")
def baseline_module():
    import game_utils.trait_baseline as module

    return module


def test_derive_trait_baseline_structure(baseline_module):
    env_traits = PROJECT_ROOT / "packs" / "evo_tactics_pack" / "docs" / "catalog" / "env_traits.json"
    trait_reference = PROJECT_ROOT / "data" / "traits" / "index.json"

    trait_glossary = PROJECT_ROOT / "data" / "core" / "traits" / "glossary.json"

    payload = baseline_module.derive_trait_baseline(
        env_traits,
        trait_reference,
        trait_glossary,
    )

    assert payload["summary"]["total_traits"] >= 29
    traits = payload["traits"]

    artigli = traits["artigli_sette_vie"]
    assert artigli["archetype"] == "locomozione"
    assert artigli["biomi"]["caverna_risonante"] == 1
    assert artigli["label_en"] == "Seven-Way Talons"
    assert artigli["description_it"]
    assert artigli["description_en"]

    zampe = traits["zampe_a_molla"]
    assert zampe["archetype"] == "locomozione"
    assert zampe["occurrences"] == 0
    assert zampe["label_en"] == "Spring-Loaded Limbs"
    assert zampe["description_en"]

    assert "locomozione" in payload["archetypes"]
