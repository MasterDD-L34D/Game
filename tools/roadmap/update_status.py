#!/usr/bin/env python3
"""Utility per aggiornare lo stato rollout Evo.

Lo script consolida i report di gap (documentazione, trait, specie/ecosistemi)
per aggiornare in modo coerente:

* ``docs/roadmap/evo-rollout-status.md`` – snapshot roadmap.
* ``incoming/lavoro_da_classificare/tasks.yml`` – stato epiche ROL-*.
* ``docs/roadmap/status/evo-weekly-YYYYMMDD.md`` – template stato settimanale.
* ``reports/evo/rollout/status_export.json`` – export per board Kanban/Linear.

Il tool è pensato per essere eseguito sia in locale sia in CI/GitHub Actions.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from textwrap import dedent
from typing import Dict, Iterable, List, Optional


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_STATUS_MD = REPO_ROOT / "docs/roadmap/evo-rollout-status.md"
DEFAULT_TASKS_YAML = REPO_ROOT / "incoming/lavoro_da_classificare/tasks.yml"
DEFAULT_WEEKLY_DIR = REPO_ROOT / "docs/roadmap/status"
DEFAULT_KANBAN_EXPORT = REPO_ROOT / "reports/evo/rollout/status_export.json"

TRAIT_GAP_REPORT = REPO_ROOT / "data/derived/analysis/trait_gap_report.json"
TRAITS_GAP_CSV = REPO_ROOT / "reports/evo/rollout/traits_gap.csv"
DOCUMENTATION_DIFF_JSON = REPO_ROOT / "reports/evo/rollout/documentation_diff.json"
SPECIES_GAP_MD = REPO_ROOT / "reports/evo/rollout/species_ecosystem_gap.md"


@dataclass
class TraitsGapMetrics:
    missing_in_index: int
    missing_in_external: int
    total_rows: int
    samples_missing_in_index: List[str]
    samples_missing_in_external: List[str]


@dataclass
class DocumentationMetrics:
    unmatched: int
    total_imports: int
    samples_unmatched: List[str]


@dataclass
class SpeciesGapMetrics:
    mismatched_rows: int
    total_rows: int
    species_count: int
    samples_species: List[str]


@dataclass
class EpicStatus:
    id: str
    status: str
    progress: int
    metric_label: str
    open_items: int
    total_items: int
    samples: List[str]

    def to_dict(self) -> Dict[str, object]:
        return {
            "id": self.id,
            "status": self.status,
            "progress": self.progress,
            "metric_label": self.metric_label,
            "open_items": self.open_items,
            "total_items": self.total_items,
            "samples": self.samples,
        }


class StatusComputationError(RuntimeError):
    """Errore sollevato quando i report richiesti non sono disponibili."""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Aggiorna lo stato rollout Evo")
    parser.add_argument(
        "--status-md",
        type=Path,
        default=DEFAULT_STATUS_MD,
        help="File Markdown con lo snapshot roadmap da aggiornare.",
    )
    parser.add_argument(
        "--tasks-yaml",
        type=Path,
        default=DEFAULT_TASKS_YAML,
        help="Registro dei task/epiche da aggiornare.",
    )
    parser.add_argument(
        "--weekly-dir",
        type=Path,
        default=DEFAULT_WEEKLY_DIR,
        help="Directory dove salvare il template di stato settimanale.",
    )
    parser.add_argument(
        "--weekly-date",
        type=str,
        default=None,
        help="Data (YYYYMMDD) da usare per il template settimanale. Default: data report.",
    )
    parser.add_argument(
        "--kanban-export",
        type=Path,
        default=DEFAULT_KANBAN_EXPORT,
        help="Percorso dell'export JSON per sincronizzazione board Kanban.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Stampa i risultati senza scrivere i file di output.",
    )
    return parser.parse_args()


def read_json(path: Path) -> Dict[str, object]:
    if not path.exists():
        raise StatusComputationError(f"File JSON mancante: {path}")
    return json.loads(path.read_text())


def load_trait_gap_summary(path: Path = TRAIT_GAP_REPORT) -> Dict[str, object]:
    data = read_json(path)
    summary = data.get("summary") or {}
    generated_at = data.get("generated_at")
    if generated_at:
        try:
            generated_dt = datetime.fromisoformat(generated_at.replace("Z", "+00:00"))
        except ValueError as exc:
            raise StatusComputationError(
                f"Formato data non valido in {path}: {generated_at}"
            ) from exc
    else:
        generated_dt = datetime.now(timezone.utc)
    return {
        "generated_at": generated_dt,
        "summary": summary,
        "sources": data.get("sources", {}),
    }


def load_traits_gap_metrics(path: Path = TRAITS_GAP_CSV) -> TraitsGapMetrics:
    if not path.exists():
        raise StatusComputationError(f"File CSV mancante: {path}")
    counts = Counter()
    samples: Dict[str, List[str]] = defaultdict(list)
    total_rows = 0
    with path.open(newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            total_rows += 1
            status = row.get("status", "unknown")
            slug = row.get("slug", "")
            counts[status] += 1
            if slug and len(samples[status]) < 5:
                samples[status].append(slug)
    return TraitsGapMetrics(
        missing_in_index=counts.get("missing_in_index", 0),
        missing_in_external=counts.get("missing_in_external", 0),
        total_rows=total_rows,
        samples_missing_in_index=samples.get("missing_in_index", []),
        samples_missing_in_external=samples.get("missing_in_external", []),
    )


def load_documentation_metrics(path: Path = DOCUMENTATION_DIFF_JSON) -> DocumentationMetrics:
    data = read_json(path)
    unmatched = data.get("unmatched", [])
    imports = data.get("imports", [])
    samples = [str(item) for item in unmatched[:5]]
    return DocumentationMetrics(
        unmatched=len(unmatched),
        total_imports=len(imports),
        samples_unmatched=samples,
    )


def load_species_gap_metrics(path: Path = SPECIES_GAP_MD) -> SpeciesGapMetrics:
    if not path.exists():
        raise StatusComputationError(f"File Markdown mancante: {path}")
    text = path.read_text()
    def extract_int(pattern: str, default: int = 0) -> int:
        match = re.search(pattern, text)
        if match:
            return int(match.group(1))
        return default

    species = extract_int(r"Specie analizzate:\s*(\d+)")
    total_rows = extract_int(r"Righe ecotipo:\s*(\d+)")
    mismatched_rows = extract_int(r"Righe con mismatch trait ↔ legacy:\s*(\d+)")
    samples = []
    detail_section = re.search(r"## Dettaglio specie\n\n(.*)", text, re.S)
    if detail_section:
        lines = detail_section.group(1).splitlines()
        for line in lines:
            if line.startswith("| ") and not line.startswith("| ---"):
                parts = [part.strip() for part in line.strip("|").split("|")]
                if parts and parts[0].lower() != "specie":
                    species_name = parts[0]
                    if species_name and len(samples) < 5:
                        samples.append(species_name)
    return SpeciesGapMetrics(
        mismatched_rows=mismatched_rows,
        total_rows=total_rows,
        species_count=species,
        samples_species=samples,
    )


def compute_progress(open_items: int, total_items: int) -> int:
    if total_items <= 0:
        return 0 if open_items else 100
    ratio = max(0.0, 1.0 - (open_items / total_items))
    return int(round(ratio * 100))


def derive_epic_statuses(
    traits_metrics: TraitsGapMetrics,
    documentation_metrics: DocumentationMetrics,
    species_metrics: SpeciesGapMetrics,
) -> List[EpicStatus]:
    epic_data = [
        {
            "id": "ROL-03",
            "metric_label": "Playbook da archiviare",
            "open_items": documentation_metrics.unmatched,
            "total": max(documentation_metrics.total_imports, documentation_metrics.unmatched),
            "samples": documentation_metrics.samples_unmatched,
            "threshold": 5,
        },
        {
            "id": "ROL-04",
            "metric_label": "Trait missing_in_index",
            "open_items": traits_metrics.missing_in_index,
            "total": traits_metrics.total_rows,
            "samples": traits_metrics.samples_missing_in_index,
            "threshold": 75,
        },
        {
            "id": "ROL-05",
            "metric_label": "Trait missing_in_external",
            "open_items": traits_metrics.missing_in_external,
            "total": traits_metrics.total_rows,
            "samples": traits_metrics.samples_missing_in_external,
            "threshold": 75,
        },
        {
            "id": "ROL-06",
            "metric_label": "Ecotipi con mismatch",
            "open_items": species_metrics.mismatched_rows,
            "total": max(species_metrics.total_rows, species_metrics.mismatched_rows),
            "samples": species_metrics.samples_species,
            "threshold": 10,
        },
    ]
    statuses: List[EpicStatus] = []
    for item in epic_data:
        progress = compute_progress(item["open_items"], item["total"])
        if item["open_items"] == 0:
            status = "done"
        elif item["open_items"] <= item["threshold"]:
            status = "in-progress"
        else:
            status = "at-risk"
        statuses.append(
            EpicStatus(
                id=item["id"],
                status=status,
                progress=progress,
                metric_label=item["metric_label"],
                open_items=item["open_items"],
                total_items=item["total"],
                samples=item["samples"],
            )
        )
    return statuses


def derive_overall_status(epics: Iterable[EpicStatus]) -> str:
    statuses = {epic.status for epic in epics}
    if statuses == {"done"}:
        return "on-track"
    if "at-risk" in statuses:
        return "at-risk"
    return "in-progress"


def ensure_weekly_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def format_samples(samples: List[str]) -> str:
    if not samples:
        return "—"
    return ", ".join(samples)


def write_status_markdown(
    path: Path,
    generated_at: datetime,
    trait_summary: Dict[str, object],
    traits_metrics: TraitsGapMetrics,
    doc_metrics: DocumentationMetrics,
    species_metrics: SpeciesGapMetrics,
    epics: List[EpicStatus],
    overall_status: str,
) -> str:
    date_str = generated_at.date().isoformat()
    coverage = trait_summary.get("traits_missing_in_etl")
    reference_total = trait_summary.get("reference_traits_total")
    etl_total = trait_summary.get("etl_traits_total")

    coverage_line = "—"
    if reference_total and etl_total is not None:
        coverage_pct = (etl_total / reference_total) * 100 if reference_total else 0
        coverage_line = f"{etl_total}/{reference_total} ({coverage_pct:.1f}%)"
    traits_missing_line = f"{traits_metrics.missing_in_index} missing_in_index, {traits_metrics.missing_in_external} missing_in_external"

    content = dedent(
        f"""\
        ---
        title: Evo-Tactics rollout status
        updated: {date_str}
        generated_by: tools/roadmap/update_status.py
        ---

        # Evo-Tactics rollout status

        <!-- Generated automatically; edit via tools/roadmap/update_status.py -->

        ## Snapshot settimanale

        - **Data riferimento:** {date_str}
        - **Owner aggiornamento:** Gameplay Ops · Evo rollout crew
        - **Status generale:** {overall_status}
        - **Ultimo report trait gap:** `data/derived/analysis/trait_gap_report.json`
        - **Copertura trait ETL:** {coverage_line}
        - **Gap trait principali:** {traits_missing_line}
        - **Playbook da archiviare:** {doc_metrics.unmatched}
        - **Ecotipi con mismatch legacy:** {species_metrics.mismatched_rows} su {max(species_metrics.total_rows, species_metrics.mismatched_rows)}

        ## Avanzamento epiche ROL-*

        | Epic | Stato | Progress (%) | Gap aperti | Campione |
        | ---- | ----- | ------------ | ---------- | -------- |
        """
    )
    for epic in epics:
        sample_text = format_samples(epic.samples)
        content += f"| {epic.id} | {epic.status} | {epic.progress} | {epic.metric_label}: {epic.open_items} | {sample_text} |\n"

    content += "\n"
    content += dedent(
        """\
        ## Focus operativi

        - **Documentazione legacy da snapshot (ROL-03):** {doc_samples}
        - **Trait da indicizzare (ROL-04):** {index_samples}
        - **Trait da fornire ai consumer esterni (ROL-05):** {external_samples}
        - **Specie/ecotipi con mismatch (ROL-06):** {species_samples}

        ## Fonti principali

        - `reports/evo/rollout/documentation_gap.md`
        - `reports/evo/rollout/documentation_diff.json`
        - `reports/evo/rollout/traits_gap.csv`
        - `reports/evo/rollout/species_ecosystem_gap.md`
        - `data/derived/analysis/trait_gap_report.json`
        """.format(
            doc_samples=format_samples(doc_metrics.samples_unmatched),
            index_samples=format_samples(traits_metrics.samples_missing_in_index),
            external_samples=format_samples(traits_metrics.samples_missing_in_external),
            species_samples=format_samples(species_metrics.samples_species),
        )
    )
    path.write_text(content)
    return content


def update_tasks_yaml(path: Path, epics: List[EpicStatus], generated_at: datetime) -> str:
    text = path.read_text()
    sync_date = generated_at.date().isoformat()

    def _last_update_repl(match: re.Match[str]) -> str:
        return f"{match.group(1)}{sync_date}"

    text, _ = re.subn(
        r"^(  last_update:\s*)(\S+)",
        _last_update_repl,
        text,
        count=1,
        flags=re.MULTILINE,
    )

    lines = text.splitlines()

    try:
        last_update_idx = next(
            i for i, line in enumerate(lines) if line.strip().startswith("last_update:")
        )
        lines[last_update_idx] = "  last_update: " + sync_date
    except StopIteration:
        try:
            version_idx = next(
                i for i, line in enumerate(lines) if line.strip().startswith("version:")
            )
        except StopIteration:
            version_idx = 3
        insert_pos = version_idx + 1
        lines.insert(insert_pos, "  last_update: " + sync_date)

    for epic in epics:
        target = f"  - id: {epic.id}"
        try:
            start_idx = next(i for i, line in enumerate(lines) if line.startswith(target))
        except StopIteration:
            continue
        end_idx = start_idx + 1
        while end_idx < len(lines) and not lines[end_idx].startswith("  - id: "):
            end_idx += 1

        # Aggiorna lo status.
        for i in range(start_idx, end_idx):
            stripped = lines[i].lstrip()
            if stripped.startswith("status:"):
                lines[i] = "    status: " + epic.status
                break

        # Rimuove blocco telemetry esistente.
        telemetry_start = None
        for i in range(start_idx, end_idx):
            if lines[i].strip().startswith("telemetry:"):
                telemetry_start = i
                break
        if telemetry_start is not None:
            telemetry_end = telemetry_start + 1
            while telemetry_end < end_idx and (
                lines[telemetry_end].startswith("      ") or lines[telemetry_end].strip() == ""
            ):
                telemetry_end += 1
            del lines[telemetry_start:telemetry_end]
            end_idx = telemetry_start

        telemetry_lines = [
            "    telemetry:",
            f"      last_sync: {generated_at.isoformat()}",
            f"      progress: {epic.progress}",
            "      metric:",
            f"        label: {epic.metric_label}",
            f"        open_items: {epic.open_items}",
            f"        total_items: {epic.total_items}",
            "      samples:",
        ]
        if epic.samples:
            telemetry_lines.extend([f"        - {sample}" for sample in epic.samples])
        else:
            telemetry_lines.append("        - Nessun elemento")
        telemetry_lines.append("")
        insertion_pos = end_idx
        lines[insertion_pos:insertion_pos] = telemetry_lines

    updated_text = "\n".join(lines) + "\n"
    path.write_text(updated_text)
    return updated_text


def write_weekly_template(
    directory: Path,
    generated_at: datetime,
    traits_metrics: TraitsGapMetrics,
    doc_metrics: DocumentationMetrics,
    species_metrics: SpeciesGapMetrics,
    workflow_url: Optional[str],
    date_override: Optional[str] = None,
) -> Path:
    ensure_weekly_dir(directory)
    date_ref = (
        datetime.strptime(date_override, "%Y%m%d").date()
        if date_override
        else generated_at.date()
    )
    filename = f"evo-weekly-{date_ref.strftime('%Y%m%d')}.md"
    path = directory / filename
    workflow_line = workflow_url or "—"
    content = dedent(
        """\
        ---
        title: Evo rollout weekly status
        generated: {timestamp}
        reference_date: {date_ref}
        workflow_run: {workflow_line}
        ---

        # Evo Rollout – Weekly status ({date_ref})

        > Generato automaticamente da `tools/roadmap/update_status.py`.

        ## Snapshot indicatori

        | Indicatore | Valore |
        | ---------- | ------ |
        | Playbook da archiviare | {doc_open} |
        | Trait missing_in_index | {index_open} |
        | Trait missing_in_external | {external_open} |
        | Ecotipi con mismatch | {species_open} |

        ## Workflow & integrazioni

        - Ultima run workflow: {workflow_line}
        - Export Kanban: `reports/evo/rollout/status_export.json`

        ## Link ai report

        - `reports/evo/rollout/documentation_gap.md`
        - `reports/evo/rollout/traits_gap.csv`
        - `reports/evo/rollout/species_ecosystem_gap.md`
        - `data/derived/analysis/trait_gap_report.json`

        ## Note rapide

        - [ ] Aggiornare board roadmap con lo stato corrente.
        - [ ] Validare azioni di follow-up per consumer esterni.
        - [ ] Pianificare remediation specie/ecotipi aperti.
        """
    ).format(
        timestamp=generated_at.isoformat(),
        date_ref=date_ref.isoformat(),
        workflow_line=workflow_line,
        doc_open=doc_metrics.unmatched,
        index_open=traits_metrics.missing_in_index,
        external_open=traits_metrics.missing_in_external,
        species_open=species_metrics.mismatched_rows,
    )
    path.write_text(content)
    return path


def write_kanban_export(
    path: Path,
    generated_at: datetime,
    overall_status: str,
    epics: List[EpicStatus],
    workflow_url: Optional[str],
) -> None:
    payload = {
        "generated_at": generated_at.isoformat(),
        "overall_status": overall_status,
        "workflow_run": workflow_url,
        "epics": [epic.to_dict() for epic in epics],
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")


def detect_workflow_run_url() -> Optional[str]:
    server = os.environ.get("GITHUB_SERVER_URL")
    repo = os.environ.get("GITHUB_REPOSITORY")
    run_id = os.environ.get("GITHUB_RUN_ID")
    if server and repo and run_id:
        return f"{server}/{repo}/actions/runs/{run_id}"
    return None


def main() -> None:
    args = parse_args()

    trait_summary_data = load_trait_gap_summary()
    traits_metrics = load_traits_gap_metrics()
    doc_metrics = load_documentation_metrics()
    species_metrics = load_species_gap_metrics()

    generated_at: datetime = trait_summary_data["generated_at"]
    trait_summary = trait_summary_data["summary"]

    epics = derive_epic_statuses(traits_metrics, doc_metrics, species_metrics)
    overall_status = derive_overall_status(epics)
    workflow_url = detect_workflow_run_url()

    if args.dry_run:
        print("=== Snapshot ===")
        print(json.dumps(
            {
                "generated_at": generated_at.isoformat(),
                "overall_status": overall_status,
                "epics": [epic.to_dict() for epic in epics],
            },
            indent=2,
            ensure_ascii=False,
        ))
        weekly_path = args.weekly_dir / "evo-weekly-placeholder.md"
    else:
        write_status_markdown(
            args.status_md,
            generated_at,
            trait_summary,
            traits_metrics,
            doc_metrics,
            species_metrics,
            epics,
            overall_status,
        )
        update_tasks_yaml(args.tasks_yaml, epics, generated_at)
        weekly_path = write_weekly_template(
            args.weekly_dir,
            generated_at,
            traits_metrics,
            doc_metrics,
            species_metrics,
            workflow_url,
            args.weekly_date,
        )
        write_kanban_export(
            args.kanban_export,
            generated_at,
            overall_status,
            epics,
            workflow_url,
        )

    if args.dry_run:
        print("Weekly template (anteprima):", weekly_path)


if __name__ == "__main__":
    main()
