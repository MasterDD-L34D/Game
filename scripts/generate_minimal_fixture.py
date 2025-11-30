#!/usr/bin/env python3
"""Rigenera `data/derived/test-fixtures/minimal` con payload deterministici."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
from pathlib import Path
from typing import Any, Iterable

FIXTURE_ROOT = Path("data/derived/test-fixtures/minimal")
README_PATH = FIXTURE_ROOT / "README.md"

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

RELATIVE_FILES: tuple[Path, ...] = (
    Path("data/packs.yaml"),
    Path("data/core/telemetry.yaml"),
    Path("data/core/biomes.yaml"),
    Path("data/core/mating.yaml"),
    Path("data/core/species.yaml"),
)


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


def write_manifest(
    outputs: Iterable[Path],
    root: Path,
    command: str,
    log_tag: str | None,
) -> dict[str, object]:
    manifest = {
        "generated_by": "scripts/generate_minimal_fixture.py",
        "root": str(root),
        "command": command,
        "commit": current_commit(),
        "log_tag": log_tag,
        "artifacts": {str(path): sha256sum(path) for path in outputs if path.exists()},
    }
    (root / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest


def render_readme(manifest: dict[str, object], root: Path) -> str:
    command = manifest.get("command", "")
    commit = manifest.get("commit") or "(non disponibile)"
    log_tag = manifest.get("log_tag") or "(aggiungi in logs/agent_activity.md)"
    artifacts: dict[str, str] = manifest.get("artifacts", {})  # type: ignore[assignment]

    checksum_rows = ["| File | sha256 |", "| --- | --- |"]
    for rel_path in (root / entry for entry in RELATIVE_FILES):
        checksum = artifacts.get(str(rel_path), "n/d")
        rel = rel_path.relative_to(Path.cwd()) if rel_path.is_absolute() else rel_path
        checksum_rows.append(f"| `{rel}` | `{checksum}` |")

    lines = [
        '# Dataset di test "minimal"',
        "",
        "Questo dataset riproduce un set ridotto di sorgenti (`packs`, `telemetry`, `biomes`, `mating`, `species`) per verificare",
        "l'interfaccia `docs/test-interface` senza dipendere dai dati completi di produzione.",
        "",
        "## Ultima rigenerazione",
        "",
        f"- Comando: `{command}`",
        f"- Commit sorgente: `{commit}`",
        f"- Manifest con checksum: `{FIXTURE_ROOT / 'manifest.json'}`",
        f"- Log operativo: `logs/agent_activity.md` → `[{log_tag}]`",
        "",
        "## Contenuto",
        "",
        "| File | Descrizione |",
        "| --- | --- |",
        "| `data/packs.yaml` | Una singola forma con compatibilità, bias e tabella `random_general_d20`, oltre a un blocco PI shop minimale. |",
        "| `data/core/telemetry.yaml` | Due indici sintetici per popolare la dashboard di telemetria. |",
        "| `data/core/biomes.yaml` | Un bioma compatto con feature principali. |",
        "| `data/core/mating.yaml` | Tabelle di compatibilità e punteggi base per la forma di prova. |",
        "| `data/core/species.yaml` | Catalogo con uno slot, una sinergia e due specie prototipo per le viste dedicate. |",
        "",
        "## Casi d'uso coperti",
        "",
        "1. **Dashboard automatica** – caricando la pagina `index.html` con `?data-root=<root>/data/derived/test-fixtures/minimal/`",
        "   i contatori principali (forme, indice random, biomi, slot specie) devono mostrare valori non vuoti",
        "   e non devono comparire errori o fallback inattesi.",
        "2. **Anteprima manuale** – la pagina `manual-fetch.html` deve riconoscere `packs.yaml` come dataset `packs`,",
        "   generare il riepilogo dell'analisi e salvare il payload in coda (`et-manual-sync-payload`) quando la sincronizzazione automatica è attiva.",
        "3. **Checklist e note** – la checklist operativa e l'area appunti devono partire con valori predefiniti vuoti,",
        "   permettere modifiche e mantenere lo stato tra refresh tramite `localStorage`.",
        "",
        "## Criteri di accettazione",
        "",
        "- Tutti i file YAML si caricano correttamente tramite `loadAllData` senza generare eccezioni.",
        "- I test end-to-end (`webapp/tests/playwright/console/interface.spec.ts`) utilizzano questo dataset e devono passare in CI.",
        "- Eventuali modifiche al dataset devono aggiornare questa documentazione indicando l'impatto sui casi d'uso.",
        "",
        "## Checksum (sha256)",
        "",
        *checksum_rows,
    ]

    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=FIXTURE_ROOT)
    parser.add_argument("--log-tag", default=None, help="Tag di riferimento per logs/agent_activity.md")
    parser.add_argument(
        "--update-readme",
        action="store_true",
        help="Aggiorna il README della fixture con command/sha",
    )
    args = parser.parse_args()

    root = args.root.resolve()
    log_tag = args.log_tag
    os.environ.setdefault("PYTHONHASHSEED", "0")

    dump_yaml(root / "data" / "packs.yaml", PACKS_PAYLOAD)
    dump_yaml(root / "data" / "core" / "telemetry.yaml", TELEMETRY_PAYLOAD)
    dump_yaml(root / "data" / "core" / "biomes.yaml", BIOMES_PAYLOAD)
    dump_yaml(root / "data" / "core" / "mating.yaml", MATING_PAYLOAD)
    dump_yaml(root / "data" / "core" / "species.yaml", SPECIES_PAYLOAD)

    command = f"python scripts/generate_minimal_fixture.py --root {root}"
    if log_tag:
        command += f" --log-tag {log_tag}"
    if args.update_readme:
        command += " --update-readme"

    outputs = tuple(root / rel for rel in RELATIVE_FILES)
    manifest = write_manifest(outputs, root, command, log_tag)

    if args.update_readme:
        README_PATH.write_text(render_readme(manifest, root), encoding="utf-8")

    print(f"✔ Fixture minimal aggiornata in {root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
