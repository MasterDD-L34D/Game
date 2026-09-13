#!/usr/bin/env python3
"""Esegue la valutazione interna dei trait consolidando fonti multiple."""

from __future__ import annotations

import argparse
import csv
import json
import importlib.util
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Iterable, List, Mapping, MutableMapping, Sequence


REPO_ROOT = Path(__file__).resolve().parents[2]

SYNC_MODULE_PATH = Path(__file__).resolve().with_name("sync_missing_index.py")
spec = importlib.util.spec_from_file_location("tools.traits.sync_missing_index", SYNC_MODULE_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Impossibile caricare il modulo sync_missing_index da {SYNC_MODULE_PATH}")
sync_missing_index = importlib.util.module_from_spec(spec)
sys.modules.setdefault("sync_missing_index", sync_missing_index)
sys.modules.setdefault("tools.traits.sync_missing_index", sync_missing_index)
spec.loader.exec_module(sync_missing_index)


DEFAULT_INTERNAL_OUTPUT = REPO_ROOT / "reports/evo/internal/traits_evaluation"


SEVERITY_ORDER = {"pass": 0, "review": 1, "fail": 2}


@dataclass
class TraitEvaluation:
    slug: str
    verdict: str = "pass"
    score: int = 100
    reasons: List[str] = field(default_factory=list)

    def apply(self, severity: str, penalty: int, reason: str) -> None:
        severity = severity.lower()
        if severity not in SEVERITY_ORDER:
            raise ValueError(f"Severità non supportata: {severity}")
        current_level = SEVERITY_ORDER[self.verdict]
        new_level = SEVERITY_ORDER[severity]
        if new_level > current_level:
            self.verdict = severity
        self.score = max(0, self.score - max(0, penalty))
        if reason:
            self.reasons.append(reason)

    def ensure_reason(self) -> None:
        if not self.reasons:
            self.reasons.append("Nessuna anomalia rilevata.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--gap-report",
        type=Path,
        default=sync_missing_index.DEFAULT_GAP_REPORT,
        help="Percorso del report traits_gap.csv",
    )
    parser.add_argument(
        "--glossary",
        type=Path,
        default=sync_missing_index.DEFAULT_GLOSSARY,
        help="Percorso del glossary legacy",
    )
    parser.add_argument(
        "--incoming-matrix",
        dest="incoming_matrices",
        action="append",
        type=Path,
        default=[],
        help="Percorsi CSV aggiuntivi contenenti segnali di moderazione",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_INTERNAL_OUTPUT,
        help="Percorso base dell'output (verranno generati JSON e CSV)",
    )
    return parser.parse_args()


def load_glossary(path: Path) -> Mapping[str, Mapping[str, object]]:
    if not path.exists():
        raise FileNotFoundError(f"Glossary non trovato: {path}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    traits = payload.get("traits")
    if not isinstance(traits, Mapping):
        return {}
    return traits


def read_incoming_matrix(path: Path) -> Dict[str, List[MutableMapping[str, object]]]:
    if not path.exists():
        raise FileNotFoundError(f"Matrice aggiuntiva non trovata: {path}")
    entries: Dict[str, List[MutableMapping[str, object]]] = {}
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            slug = (row.get("slug") or row.get("trait_slug") or "").strip()
            if not slug:
                continue
            entries.setdefault(slug, []).append(row)
    return entries


def collect_incoming_signals(paths: Sequence[Path]) -> Dict[str, List[MutableMapping[str, object]]]:
    aggregated: Dict[str, List[MutableMapping[str, object]]] = {}
    for path in paths:
        matrix = read_incoming_matrix(path)
        for slug, rows in matrix.items():
            aggregated.setdefault(slug, []).extend(rows)
    return aggregated


def _clean_text(value: object) -> str:
    if value is None:
        return ""
    return str(value).strip()


def evaluate_traits(
    records: Sequence[sync_missing_index.TraitRecord],
    glossary: Mapping[str, Mapping[str, object]],
    incoming_signals: Mapping[str, Sequence[MutableMapping[str, object]]],
) -> List[TraitEvaluation]:
    evaluations: Dict[str, TraitEvaluation] = {}
    traits_section = glossary

    def get_eval(slug: str) -> TraitEvaluation:
        return evaluations.setdefault(slug, TraitEvaluation(slug=slug))

    for record in records:
        if not record.slug:
            continue
        evaluation = get_eval(record.slug)
        status = (record.status or "").strip().lower()
        if status == "missing_in_index":
            evaluation.apply("fail", 50, "Trait mancante nel glossario legacy (missing_in_index).")
        elif status == "missing_in_external":
            evaluation.apply("review", 20, "Trait non ancora distribuito ai partner esterni.")

    for slug, metadata in traits_section.items():
        evaluation = get_eval(slug)
        if not isinstance(metadata, Mapping):
            evaluation.apply("review", 20, "Formato del trait non valido nel glossary.")
            continue
        label = _clean_text(metadata.get("label_it") or metadata.get("label_en"))
        description = _clean_text(metadata.get("description_it") or metadata.get("description_en"))
        if not label:
            evaluation.apply("fail", 40, "Label assente nel glossary.")
        if not description:
            evaluation.apply("fail", 40, "Descrizione assente nel glossary.")
        elif len(description) < 20:
            evaluation.apply("review", 15, "Descrizione troppo corta (<20 caratteri).")

    for slug, rows in incoming_signals.items():
        evaluation = get_eval(slug)
        for row in rows:
            moderation = _clean_text(row.get("moderation") or row.get("verdict") or row.get("esito"))
            notes = _clean_text(
                row.get("notes")
                or row.get("reason")
                or row.get("motivation")
                or row.get("note")
            )
            penalty_raw = row.get("penalty") or row.get("score_penalty") or row.get("deduction")
            try:
                penalty = int(float(penalty_raw)) if penalty_raw not in (None, "") else 0
            except (TypeError, ValueError):
                penalty = 0
            severity = moderation.lower() if moderation else "review"
            if severity not in SEVERITY_ORDER:
                severity = "review"
            evaluation.apply(severity, penalty, notes or "Segnale di moderazione aggiuntivo.")

    for evaluation in evaluations.values():
        evaluation.ensure_reason()

    return sorted(evaluations.values(), key=lambda item: item.slug)


def write_reports(evaluations: Iterable[TraitEvaluation], output_base: Path) -> Dict[str, Path]:
    if output_base.suffix:
        base = output_base.with_suffix("")
        json_path = output_base.with_suffix(".json")
        csv_path = output_base.with_suffix(".csv")
    else:
        base = output_base
        json_path = base.with_suffix(".json")
        csv_path = base.with_suffix(".csv")

    json_path.parent.mkdir(parents=True, exist_ok=True)
    csv_path.parent.mkdir(parents=True, exist_ok=True)

    serialised = [
        {"slug": e.slug, "verdict": e.verdict, "score": e.score, "reasons": e.reasons}
        for e in evaluations
    ]
    json_path.write_text(json.dumps(serialised, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    with csv_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["slug", "verdict", "score", "reasons"])
        writer.writeheader()
        for evaluation in evaluations:
            writer.writerow(
                {
                    "slug": evaluation.slug,
                    "verdict": evaluation.verdict,
                    "score": evaluation.score,
                    "reasons": " | ".join(evaluation.reasons),
                }
            )

    return {"json": json_path, "csv": csv_path}


def main() -> None:
    args = parse_args()
    records = sync_missing_index.read_gap_report(args.gap_report)
    glossary = load_glossary(args.glossary)
    incoming_signals = collect_incoming_signals(args.incoming_matrices)
    evaluations = evaluate_traits(records, glossary, incoming_signals)
    outputs = write_reports(evaluations, args.output)
    print(f"Report JSON generato in: {outputs['json']}")
    print(f"Report CSV generato in: {outputs['csv']}")


if __name__ == "__main__":
    main()
