#!/usr/bin/env python3
"""Esegue i validator del pack ecosistemi e produce un report strutturato."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

PACK_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = PACK_ROOT.parents[1]
DATA_DIR = PACK_ROOT / "data"
CONFIG_DIR = PACK_ROOT / "tools" / "config"
PY_TOOLS_DIR = PACK_ROOT / "tools" / "py"
EXT_DIR = PY_TOOLS_DIR / "ext_v1_5"
PYTHON = sys.executable or "python3"

SKIP_NAMES = {
    "validate_species.py",
    "validate_v7.py",
    "validate_ecosystem_foodweb.py",
    "validate_species_v1_5.py",
    "validate_package.py",
    "validate_forms.py",
    "validate_catalog_v1_4.py",
}


def try_run(cmd: List[str]) -> Dict[str, Any]:
    """Esegue un comando restituendo codice di uscita e log."""
    completed = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        cwd=str(REPO_ROOT),
    )
    return {
        "cmd": " ".join(cmd),
        "code": int(completed.returncode),
        "stdout": completed.stdout.strip(),
        "stderr": completed.stderr.strip(),
    }


def build_core_commands() -> List[List[str]]:
    network = DATA_DIR / "ecosystems" / "network" / "meta_network_alpha.yaml"
    cfg = CONFIG_DIR / "validator_config.yaml"
    return [
        [PYTHON, str(PY_TOOLS_DIR / "validate_ecosistema_v2_0.py"), str(network)],
        [PYTHON, str(PY_TOOLS_DIR / "validate_cross_foodweb_v1_0.py"), str(network)],
    ]


def build_biome_commands() -> List[List[str]]:
    cfg = CONFIG_DIR / "validator_config.yaml"
    registries = CONFIG_DIR / "registries"
    commands: List[List[str]] = []
    for biome in ("badlands", "foresta_temperata", "deserto_caldo", "cryosteppe"):
        path = DATA_DIR / "ecosystems" / f"{biome}.biome.yaml"
        if path.exists():
            commands.append(
                [
                    PYTHON,
                    str(PY_TOOLS_DIR / "validate_bioma_v1_1.py"),
                    str(path),
                    str(cfg),
                    str(registries),
                ]
            )
    return commands


def build_species_commands() -> List[List[str]]:
    cfg = CONFIG_DIR / "validator_config.yaml"
    registries = CONFIG_DIR / "registries"
    validator = PY_TOOLS_DIR / "validate_species_v1_7.py"
    commands: List[List[str]] = []
    if validator.exists():
        for biome in ("badlands", "foresta_temperata", "deserto_caldo", "cryosteppe"):
            root = DATA_DIR / "species" / biome
            if root.exists():
                commands.append(
                    [
                        PYTHON,
                        str(validator),
                        "--species-root",
                        str(root),
                        "--config",
                        str(cfg),
                        "--registries",
                        str(registries),
                    ]
                )
    return commands


def build_foodweb_commands() -> List[List[str]]:
    cfg = CONFIG_DIR / "validator_config.yaml"
    commands: List[List[str]] = []
    for biome in ("badlands", "foresta_temperata", "deserto_caldo", "cryosteppe"):
        path = DATA_DIR / "foodwebs" / f"{biome}_foodweb.yaml"
        if path.exists():
            commands.append(
                [
                    PYTHON,
                    str(PY_TOOLS_DIR / "validate_foodweb_v1_0.py"),
                    str(path),
                    str(cfg),
                ]
            )
    return commands


def build_ext_commands() -> List[List[str]]:
    commands: List[List[str]] = []
    if not EXT_DIR.exists():
        return commands
    for script in EXT_DIR.glob("*.py"):
        name = script.name
        if name in SKIP_NAMES:
            continue
        lowered = name.lower()
        if "validate" in lowered or "check" in lowered or "lint" in lowered:
            commands.append([PYTHON, str(script), str(DATA_DIR)])
    return commands


def collect_reports() -> List[Dict[str, Any]]:
    reports: List[Dict[str, Any]] = []
    for command in (
        build_core_commands()
        + build_biome_commands()
        + build_species_commands()
        + build_foodweb_commands()
        + build_ext_commands()
    ):
        reports.append(try_run(command))
    return reports


def render_html(reports: Iterable[Dict[str, Any]]) -> str:
    reports = list(reports)
    total = len(reports)
    ok = sum(1 for r in reports if r.get("code") == 0)
    fail = total - ok
    rows = []
    for entry in reports:
        status = "✅ OK" if entry.get("code") == 0 else "❌ FAIL"
        rows.append(
            "<tr><td><code>{cmd}</code></td><td>{status}</td></tr>".format(
                cmd=entry.get("cmd", ""), status=status
            )
        )
    return (
        "<!doctype html><html><head><meta charset=\"utf-8\"><title>Validator Report" "</title>"
        "<style>body{font-family:Inter,system-ui,Segoe UI,Arial,sans-serif;margin:24px;color:#222}"
        "table{border-collapse:collapse;width:100%}td,th{border:1px solid #e5e7eb;padding:8px}" \
        "th{background:#f8fafc}</style></head><body>"
        f"<h1>Validator Report</h1><p>Totale: {total} — <strong>{ok} OK</strong>, "
        f"<strong>{fail} FAIL</strong></p><table><tr><th>Comando</th><th>Esito</th></tr>"
        + "".join(rows)
        + "</table></body></html>"
    )


def write_output(path: Path | None, content: str) -> None:
    if path is None:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def run_validators(
    *, json_out: Path | None = None, html_out: Path | None = None, emit_stdout: bool = False
) -> Tuple[Dict[str, Any], bool]:
    reports = collect_reports()
    payload = {"reports": reports}
    json_blob = json.dumps(payload, ensure_ascii=False, indent=2)

    write_output(json_out, json_blob + "\n")
    if html_out is not None:
        write_output(html_out, render_html(reports))

    if emit_stdout:
        sys.stdout.write(json_blob + "\n")
    has_failures = any(entry.get("code") != 0 for entry in reports)
    return payload, has_failures


def main(argv: List[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json-out", type=Path, help="File JSON da generare", default=None)
    parser.add_argument("--html-out", type=Path, help="File HTML da generare", default=None)
    args = parser.parse_args(argv)

    payload, has_failures = run_validators(
        json_out=args.json_out, html_out=args.html_out, emit_stdout=True
    )

    if not payload:
        return 1
    return 2 if has_failures else 0


if __name__ == "__main__":
    sys.exit(main())
