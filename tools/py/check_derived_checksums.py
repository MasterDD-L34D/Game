"""Report-only audit for derived dataset checksums.

This script recalculates sha256 checksums for the main derived datasets and
compares them with the latest declared values in the manifest/README files.

Outputs:
- reports/derived_checksums/report.json (machine-readable)
- reports/derived_checksums/report.md (human-readable)
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional


ROOT = Path(__file__).resolve().parents[2]


def sha256_file(path: Path) -> Optional[str]:
    if not path.exists() or not path.is_file():
        return None
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(8192), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_manifest(path: Path) -> Dict[str, str]:
    if not path.exists():
        return {}
    data = json.loads(path.read_text())
    return data.get("artifacts", {})


TABLE_REGEX = re.compile(r"\|\s*`([^`]+)`\s*\|\s*`([0-9a-f]{64})`\s*\|")


def parse_readme_table(path: Path) -> Dict[str, str]:
    if not path.exists():
        return {}
    matches = TABLE_REGEX.findall(path.read_text())
    return {file_path: checksum for file_path, checksum in matches}


@dataclass
class DatasetSpec:
    name: str
    manifest_path: Optional[Path]
    readme_path: Optional[Path]
    files: List[str] = field(default_factory=list)


@dataclass
class FileReport:
    file: str
    actual: Optional[str]
    expected_manifest: Optional[str]
    expected_readme: Optional[str]
    status: str


def build_dataset_report(spec: DatasetSpec) -> Dict[str, List[FileReport]]:
    manifest_entries = parse_manifest(spec.manifest_path) if spec.manifest_path else {}
    readme_entries = parse_readme_table(spec.readme_path) if spec.readme_path else {}
    files = set(spec.files)
    files.update(manifest_entries.keys())
    files.update(readme_entries.keys())

    reports: List[FileReport] = []
    for file_path in sorted(files):
        absolute = ROOT / file_path
        actual = sha256_file(absolute)
        expected_manifest = manifest_entries.get(file_path)
        expected_readme = readme_entries.get(file_path)

        if actual is None:
            status = "missing"
        elif (expected_manifest and actual != expected_manifest) or (
            expected_readme and actual != expected_readme
        ):
            status = "mismatch"
        else:
            status = "match"

        reports.append(
            FileReport(
                file=file_path,
                actual=actual,
                expected_manifest=expected_manifest,
                expected_readme=expected_readme,
                status=status,
            )
        )

    return {spec.name: reports}


def render_markdown(report: Dict[str, List[FileReport]]) -> str:
    lines = ["# Derived checksum audit (report-only)"]
    for dataset, entries in report.items():
        lines.append(f"\n## {dataset}")
        lines.append("| File | Actual | Manifest | README | Status |")
        lines.append("| --- | --- | --- | --- | --- |")
        for item in entries:
            actual = item.actual or "(missing)"
            exp_manifest = item.expected_manifest or "-"
            exp_readme = item.expected_readme or "-"
            lines.append(
                f"| `{item.file}` | `{actual}` | `{exp_manifest}` | `{exp_readme}` | {item.status} |"
            )
    return "\n".join(lines) + "\n"


def render_json(report: Dict[str, List[FileReport]]) -> str:
    serializable = {
        dataset: [entry.__dict__ for entry in entries] for dataset, entries in report.items()
    }
    return json.dumps(serializable, indent=2)


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit derived checksums (report-only)")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=ROOT / "reports" / "derived_checksums",
        help="Directory for report artifacts",
    )
    args = parser.parse_args()
    output_dir: Path = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    specs = [
        DatasetSpec(
            name="analysis",
            manifest_path=ROOT / "data/derived/analysis/manifest.json",
            readme_path=ROOT / "data/derived/analysis/README.md",
        ),
        DatasetSpec(
            name="exports",
            manifest_path=None,
            readme_path=ROOT / "data/derived/exports/README.md",
        ),
    ]

    full_report: Dict[str, List[FileReport]] = {}
    for spec in specs:
        full_report.update(build_dataset_report(spec))

    (output_dir / "report.md").write_text(render_markdown(full_report))
    (output_dir / "report.json").write_text(render_json(full_report))


if __name__ == "__main__":
    main()
