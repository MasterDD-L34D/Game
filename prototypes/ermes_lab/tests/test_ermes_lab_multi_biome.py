"""Test multi-biome run -- ADR-2026-05-29 schema v1.0.0 (TKT-BR-02)."""
import json
import sys
from pathlib import Path

LAB = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(LAB))
from ermes_sim import run_multi_biome, load_config  # noqa: E402

CONFIG = LAB / "configs/multi_biome.json"


def test_multi_biome_run_emits_nested_schema():
    config = load_config(CONFIG)
    report = run_multi_biome(config)
    assert report["schema"] == "ermes_eco_pressure_report"
    assert report["schema_version"] == "1.0.0"
    assert "biomes" in report
    assert isinstance(report["biomes"], dict)
    assert len(report["biomes"]) >= 4


def test_multi_biome_per_biome_shape():
    config = load_config(CONFIG)
    report = run_multi_biome(config)
    for biome_id, biome_data in report["biomes"].items():
        assert "eco_pressure_score" in biome_data, f"{biome_id} missing eco_pressure_score"
        assert 0.0 <= biome_data["eco_pressure_score"] <= 1.0
        for key in ("food_pressure", "predator_pressure", "temperature_pressure"):
            assert key in biome_data, f"{biome_id} missing {key}"
        assert "encounter_bias" in biome_data
        for k in ("ambush", "scavenger", "hazard", "migration_pressure"):
            assert k in biome_data["encounter_bias"]
        assert "mutation_bias" in biome_data
        for k in ("heat_resistance", "burst_mobility", "efficient_metabolism", "sensory_alertness"):
            assert k in biome_data["mutation_bias"]
        # bias key for W5-bb back-compat ermesExporter consumer.
        assert "bias" in biome_data


def test_multi_biome_deterministic():
    config = load_config(CONFIG)
    r1 = run_multi_biome(config)
    r2 = run_multi_biome(config)
    # Compare biomes content (ignore generated_at timestamp).
    assert r1["biomes"] == r2["biomes"]


def test_multi_biome_includes_back_compat_bias():
    config = load_config(CONFIG)
    report = run_multi_biome(config)
    for biome_id, biome_data in report["biomes"].items():
        assert "predator_density" in biome_data["bias"], f"{biome_id} bias missing predator_density"
        assert "resource_scarcity" in biome_data["bias"], f"{biome_id} bias missing resource_scarcity"
