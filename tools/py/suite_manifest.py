#!/usr/bin/env python3
"""Accessor for the canonical playtest suite manifest (G2 P1).

Single human-facing SoT for per-scenario band + ratified knob + knob_space +
objective. Loaders/accessors so other tools read the manifest instead of
re-declaring bands/knobs. See docs/superpowers/specs/2026-06-17-per-template-calibration-design.md.
"""

from __future__ import annotations

from pathlib import Path

import yaml

DEFAULT_MANIFEST_PATH = (
    Path(__file__).resolve().parents[2] / "docs" / "playtest" / "canonical-suite.yaml"
)


def load_manifest(path=DEFAULT_MANIFEST_PATH):  # noqa: ANN001
    with open(path, encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def get_scenario(manifest, scenario_id):  # noqa: ANN001
    for sc in manifest.get("scenarios", []):
        if sc.get("id") == scenario_id:
            return sc
    raise KeyError(scenario_id)


def scenario_band(manifest, scenario_id):  # noqa: ANN001
    return get_scenario(manifest, scenario_id).get("target_band")


def scenario_knob_space(manifest, scenario_id):  # noqa: ANN001
    return get_scenario(manifest, scenario_id).get("knob_space") or {}


def scenario_objective(manifest, scenario_id):  # noqa: ANN001
    """Per-scenario objective_metric if present, else the global composite_metric."""
    sc = get_scenario(manifest, scenario_id)
    return sc.get("objective_metric") or manifest.get("composite_metric")
