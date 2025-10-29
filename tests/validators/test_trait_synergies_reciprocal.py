import json
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
TRAIT_REFERENCE = PROJECT_ROOT / "packs" / "evo_tactics_pack" / "docs" / "catalog" / "trait_reference.json"


def test_trait_synergies_are_mutual():
    with TRAIT_REFERENCE.open(encoding="utf-8") as fh:
        traits = json.load(fh)["traits"]

    missing_traits = []
    asymmetric_pairs = []

    for trait_key, payload in traits.items():
        for partner in payload.get("sinergie", []):
            if partner not in traits:
                missing_traits.append((trait_key, partner))
                continue

            partner_synergies = traits[partner].get("sinergie", [])
            if trait_key not in partner_synergies:
                asymmetric_pairs.append((trait_key, partner))

    assert not missing_traits, f"sinergie refer to unknown traits: {missing_traits}"
    assert not asymmetric_pairs, f"sinergie not reciprocal: {asymmetric_pairs}"
