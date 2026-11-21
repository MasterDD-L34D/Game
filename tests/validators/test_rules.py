from __future__ import annotations

from pathlib import Path
import sys

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

import importlib
import importlib.util

import pytest
import yaml

PACKS_PATH = REPO_ROOT / 'packs'
if 'packs' not in sys.modules:
    spec = importlib.util.spec_from_file_location(
        'packs',
        PACKS_PATH / '__init__.py',
        submodule_search_locations=[str(PACKS_PATH)],
    )
    module = importlib.util.module_from_spec(spec)
    if spec and spec.loader:
        spec.loader.exec_module(module)
        sys.modules['packs'] = module

hazards = importlib.import_module('packs.evo_tactics_pack.validators.rules.hazards')
trophic_roles = importlib.import_module('packs.evo_tactics_pack.validators.rules.trophic_roles')
foodweb = importlib.import_module('packs.evo_tactics_pack.validators.rules.foodweb')
runtime_api = importlib.import_module('packs.evo_tactics_pack.validators.runtime_api')
PACK_ROOT = REPO_ROOT / "packs" / "evo_tactics_pack"
REGISTRIES_DIR = PACK_ROOT / "tools" / "config" / "registries"
CONFIG_PATH = PACK_ROOT / "tools" / "config" / "validator_config.yaml"


@pytest.fixture(scope="module")
def runtime_resources():
    return runtime_api.load_resources(registries_dir=REGISTRIES_DIR, config_path=CONFIG_PATH)


def test_species_validation_detects_missing_fields(runtime_resources):
    registry = runtime_resources.species_registry
    specimen = {
        "id": "spec_test",
        "role_trofico": "predatore_apice_badlands",
        "spawn_rules": {},
        "balance": {},
    }
    messages = trophic_roles.validate_species_document(specimen, registry)
    codes = {message.code for message in messages}
    assert "species.missing.display_name" in codes
    assert "species.spawn_rules.densita" in codes
    assert any(message.level == "warning" for message in messages)


def test_species_runtime_correction_normalizes_role(runtime_resources):
    specimen = {
        "id": "spec_runtime",
        "display_name": "Specie di Test",
        "role_trofico": "predatore_apice_badlands",
        "functional_tags": "predatore",
        "vc": {},
        "playable_unit": False,
        "spawn_rules": {},
        "balance": {},
    }
    result = runtime_api.validate_species_entries([specimen], resources=runtime_resources, biome_id="badlands")
    assert result["corrected"], "La correzione runtime deve produrre almeno una specie"
    corrected = result["corrected"][0]
    assert corrected["role_trofico"] in runtime_resources.species_registry.allowed_roles
    assert "badlands" in corrected["biomes"], "Il biome_id deve essere associato automaticamente"


def test_biome_validation_warns_unknown_hazard(runtime_resources):
    biome = {
        "id": "biome_test",
        "receipt": {},
        "ecosistema": {},
        "links": {"biome_id": "biome_test"},
        "registries": {},
        "hazard": {"id": "non_esistente"},
    }
    registry = runtime_resources.hazard_registry
    rules = runtime_resources.hazard_rules
    messages = hazards.validate_biome_document(biome, hazard_registry=registry, hazard_rules=rules)
    assert any(message.code == "biome.hazard.unknown" for message in messages)


def test_biome_runtime_defaults_apply(runtime_resources):
    biome = {
        "id": "biome_runtime",
        "receipt": {},
        "ecosistema": {},
        "links": {"biome_id": "foresta_temperata"},
        "registries": {},
    }
    result = runtime_api.validate_biome_payload(biome, resources=runtime_resources, default_hazard="vento_forte")
    assert result["corrected"]["hazard"]["id"] == "vento_forte"


def test_foodweb_validator_flags_invalid_edges():
    config = yaml.safe_load(CONFIG_PATH.read_text(encoding="utf-8"))
    rules = foodweb.build_foodweb_rules(config)
    document = {
        "nodes": ["a"],
        "edges": [
            {"from": "a", "to": "b", "type": "sconosciuto"},
        ],
    }
    messages = foodweb.validate_foodweb_document(document, rules)
    assert any(message.code == "foodweb.edge.unknown_node" for message in messages)
    assert any(message.code == "foodweb.edge.type" for message in messages)
