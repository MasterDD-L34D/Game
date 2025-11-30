#!/usr/bin/env python3
"""Rigenera `data/derived/test-fixtures/minimal` con payload deterministici."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
from pathlib import Path
from typing import Any

FIXTURE_ROOT = Path("data/derived/test-fixtures/minimal")

PACKS_PAYLOAD: dict[str, Any] = {
    "forms": {
        "sentinel_proto": {
            "name": "Sentinel Proto",
            "role": "Vanguardia di test",
            "tags": ["demo", "starter"],
            "summary": "Forma dimostrativa per validare la dashboard.",
            "compatibility": {
                "likes": ["Condivisione dati con squadre esplorative"],
                "neutrals": ["Missioni di supporto"],
                "dislikes": ["Operazioni clandestine prolungate"],
                "strengths": ["Analisi rapida del territorio"],
                "stress_triggers": ["Oscurità prolungata"],
                "collaboration_hooks": ["Offri materiale di studio prima delle missioni"],
                "base_scores": {"like": 3, "neutral": 2, "dislike": 1},
            },
            "bias_d12": {1: "Tattiche difensive", 6: "Asset di rilevamento", 12: "Riserve energetiche"},
        }
    },
    "pi_shop": {
        "costs": {"moduli_di_base": 3, "sinergie_rare": 7},
        "caps": {"max_moduli": 2, "max_richieste": 1},
        "budget_curve": {
            "early": ["1 slot di supporto"],
            "mid": ["+1 slot tattico"],
            "late": ["Sblocco sinergia Aurora"],
        },
    },
    "random_general_d20": [
        "Rinvenuto un manufatto aurorale custodito da un sentinel.",
        "Richiesta urgente di supporto logistico dalla base mobile.",
    ],
}

TELEMETRY_PAYLOAD: dict[str, Any] = {
    "indices": {
        "focus_index": {
            "label": "Indice di focus",
            "value": 0.72,
            "change": "stabile",
            "notes": "Valore sintetico per la suite di test.",
        },
        "stress_index": {
            "label": "Indice di stress",
            "value": 0.35,
            "change": "in calo",
        },
    }
}

BIOMES_PAYLOAD: dict[str, Any] = {
    "biomes": {
        "aurora_grove": {
            "label": "Bosco Aurora",
            "tier": "1",
            "summary": "Bioma compatto per verificare le anteprime.",
            "features": ["Foliage luminescente", "Campi magnetici stabili"],
            "diff_base": 1,
            "mod_biome": 0,
            "affixes": [],
            "hazard": {
                "description": "TODO: definire hazard specifico per la fixture.",
                "severity": "low",
                "stress_modifiers": {"exposure": 0.0},
            },
            "npc_archetypes": {"primary": [], "support": []},
            "stresswave": {
                "baseline": 0.2,
                "escalation_rate": 0.03,
                "event_thresholds": {"support": 0.4, "overrun": 0.6},
            },
            "narrative": {"tone": "TBD", "hooks": ["TODO: gancio narrativo di esempio per la fixture."]},
        }
    },
    "vc_adapt": {"demo": {}},
    "mutations": {},
    "frequencies": {},
}

MATING_PAYLOAD: dict[str, Any] = {
    "compat_forme": {"sentinel_proto": {"compatible": ["sentinel_proto"], "incompatible": ["sentinel_shadow"]}},
    "base_scores": {"sentinel_proto": {"empathy": 2, "strategy": 3, "creativity": 1}},
}

SPECIES_PAYLOAD: dict[str, Any] = {
    "catalog": {
        "slots": {
            "sentinel_proto": {
                "core": {
                    "aurora_core": {
                        "name": "Aurora Core",
                        "effects": {"resistances": {"light": {"aurora": True}}},
                        "summary": "Modulo base per validare il rendering del catalogo.",
                    }
                }
            }
        },
        "synergies": [
            {
                "name": "Aurora Focus",
                "modules": ["core.aurora_core"],
                "summary": "Aumenta la precisione in ambienti luminosi.",
            }
        ],
    },
    "species": [
        {"id": "sentinel_proto", "name": "Sentinel Proto", "summary": "Specie prototipo per gli scenari di test."},
        {"id": "sentinel_shadow", "name": "Sentinel Shadow", "summary": "Variante antagonista per la checklist."},
    ],
}


def dump_yaml(path: Path, payload: dict[str, Any]) -> None:
    import yaml

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(payload, sort_keys=False, allow_unicode=True), encoding="utf-8")


def sha256sum(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(8192), b""):
            digest.update(chunk)
    return digest.hexdigest()


def current_commit() -> str | None:
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            check=True,
            capture_output=True,
            text=True,
        )
    except (FileNotFoundError, subprocess.CalledProcessError):
        return None
    return result.stdout.strip()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=FIXTURE_ROOT)
    args = parser.parse_args()

    root = args.root.resolve()
    os.environ.setdefault("PYTHONHASHSEED", "0")

    dump_yaml(root / "data" / "packs.yaml", PACKS_PAYLOAD)
    dump_yaml(root / "data" / "core" / "telemetry.yaml", TELEMETRY_PAYLOAD)
    dump_yaml(root / "data" / "core" / "biomes.yaml", BIOMES_PAYLOAD)
    dump_yaml(root / "data" / "core" / "mating.yaml", MATING_PAYLOAD)
    dump_yaml(root / "data" / "core" / "species.yaml", SPECIES_PAYLOAD)

    outputs = [
        root / "data" / "packs.yaml",
        root / "data" / "core" / "telemetry.yaml",
        root / "data" / "core" / "biomes.yaml",
        root / "data" / "core" / "mating.yaml",
        root / "data" / "core" / "species.yaml",
    ]

    manifest = {
        "generated_by": "scripts/generate_minimal_fixture.py",
        "root": str(root),
        "command": f"python scripts/generate_minimal_fixture.py --root {root}",
        "commit": current_commit(),
        "artifacts": {str(path): sha256sum(path) for path in outputs if path.exists()},
    }
    (root / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print(f"✔ Fixture minimal aggiornata in {root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
