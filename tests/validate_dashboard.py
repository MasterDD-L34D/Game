"""Structural checks for dashboard and generator pages with KPI logging.

This script validates that the main dashboard (``docs/index.html``) and the
ecosystem generator hub expose all the DOM hooks expected by their companion
JavaScript. It also runs a quick sanity check on the generator catalog so we
know the exported data contains the essential keys used at runtime.

Beyond the boolean pass/fail outcome, each run now records a set of structural
metrics so we can monitor regressions over time (e.g. accidental removal of a
section or of key navigation anchors). Metrics are appended to a JSONL log in
``logs/qa/dashboard_metrics.jsonl`` and can optionally be exported to a custom
path for downstream automation.
"""

from __future__ import annotations

import json
import argparse
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
METRICS_LOG = REPO_ROOT / "logs" / "qa" / "dashboard_metrics.jsonl"


class HtmlSnapshot(HTMLParser):
    """Collect IDs, anchors and section tags from an HTML document."""

    def __init__(self) -> None:
        super().__init__()
        self.ids: set[str] = set()
        self.anchors: list[str] = []
        self.sections: list[str] = []
        self.scripts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = dict(attrs)
        element_id = attr_map.get("id")
        if element_id:
            self.ids.add(element_id)
        if tag == "a":
            href = attr_map.get("href")
            if href:
                self.anchors.append(href)
        if tag == "section":
            section_id = attr_map.get("id")
            if section_id:
                self.sections.append(section_id)
        if tag == "script":
            src = attr_map.get("src")
            if src:
                self.scripts.append(src)


def load_html_snapshot(path: Path) -> HtmlSnapshot:
    snapshot = HtmlSnapshot()
    snapshot.feed(path.read_text(encoding="utf-8"))
    return snapshot


def assert_requirements(name: str, condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(f"[{name}] {message}")


def _collect_dashboard_metrics(snapshot: HtmlSnapshot) -> dict[str, Any]:
    return {
        "ids_total": len(snapshot.ids),
        "anchors_total": len(snapshot.anchors),
        "sections_total": len(snapshot.sections),
        "scripts_total": len(snapshot.scripts),
    }


def validate_dashboard() -> dict[str, Any]:
    dashboard_path = REPO_ROOT / "docs" / "index.html"
    assert_requirements("dashboard", dashboard_path.exists(), "docs/index.html non trovato")
    snapshot = load_html_snapshot(dashboard_path)

    required_sections = {"overview", "updates", "simulator", "dashboards", "resources"}
    assert_requirements(
        "dashboard",
        required_sections.issubset(snapshot.sections),
        f"Sezioni mancanti: {sorted(required_sections - set(snapshot.sections))}",
    )

    required_ids = {
        "hero-open-simulator",
        "config-form",
        "simulator-frame",
        "activity-feed",
        "changelog-feed",
        "dashboards",
    }
    assert_requirements(
        "dashboard",
        required_ids.issubset(snapshot.ids),
        f"ID mancanti nell'HTML principale: {sorted(required_ids - snapshot.ids)}",
    )

    nav_targets = {"#overview", "#updates", "#simulator", "#dashboards", "#resources"}
    assert_requirements(
        "dashboard",
        nav_targets.issubset(set(snapshot.anchors)),
        f"Anchor della navigazione mancanti: {sorted(nav_targets - set(snapshot.anchors))}",
    )

    metrics = _collect_dashboard_metrics(snapshot)
    metrics.update(
        {
            "required_section_count": len(required_sections),
            "required_id_count": len(required_ids),
            "required_nav_count": len(nav_targets),
        }
    )
    return metrics


def validate_generator() -> dict[str, Any]:
    page_path = REPO_ROOT / "docs" / "evo-tactics-pack" / "generator.html"
    assert_requirements("generator", page_path.exists(), "generator.html non trovato")
    snapshot = load_html_snapshot(page_path)
    generator_path = REPO_ROOT / "docs" / "evo-tactics-pack" / "generator.js"
    assert_requirements("generator", generator_path.exists(), "generator.js non trovato")

    required_ids = {
        "generator-form",
        "flags",
        "roles",
        "tags",
        "nBiomi",
        "biome-grid",
        "seed-grid",
        "generator-status",
        "generator-composer-presets",
        "generator-composer-suggestions",
        "generator-composer-title",
        "generator-synergy-radar",
        "generator-role-heatmap",
    }
    assert_requirements(
        "generator",
        required_ids.issubset(snapshot.ids),
        f"ID mancanti nella pagina del generatore: {sorted(required_ids - snapshot.ids)}",
    )

    nav_targets = {"generator.html", "catalog.html", "index.html"}
    assert_requirements(
        "generator",
        nav_targets.issubset({href for href in snapshot.anchors if not href.startswith("#")}),
        f"Collegamenti del sottomenu mancanti: {sorted(nav_targets - set(snapshot.anchors))}",
    )

    composer_anchor = "#generator-composer"
    assert_requirements(
        "generator",
        composer_anchor in snapshot.anchors,
        "Anchor al pannello di composizione avanzata mancante",
    )

    catalog_path = REPO_ROOT / "packs" / "evo_tactics_pack" / "docs" / "catalog" / "catalog_data.json"
    assert_requirements("generator", catalog_path.exists(), "catalog_data.json non trovato")
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    for key in ("ecosistema", "biomi", "species"):
        assert_requirements(
            "generator",
            key in catalog,
            f"Chiave '{key}' assente nel catalogo dati",
        )
    assert_requirements(
        "generator",
        isinstance(catalog.get("biomi"), list) and catalog["biomi"],
        "Nessun bioma disponibile nel catalogo",
    )

    generator_source = generator_path.read_text(encoding="utf-8")
    assert_requirements(
        "generator",
        "buildComposerExportSnapshot" in generator_source,
        "Snapshot esportazione compositore non presente in generator.js",
    )
    assert_requirements(
        "generator",
        "composer: buildComposerExportSnapshot()" in generator_source,
        "exportPayload non include i dati del compositore",
    )

    required_scripts = {
        "chart.js@4.4.0/dist/chart.umd.min.js": "Chart.js non incluso nella pagina del generatore",
        "jszip@3.10.1/dist/jszip.min.js": "JSZip non incluso nella pagina del generatore",
        "html2pdf.js/0.10.1/html2pdf.bundle.min.js": "html2pdf non incluso nella pagina del generatore",
    }
    for snippet, error_message in required_scripts.items():
        assert_requirements(
            "generator",
            any(snippet in src for src in snapshot.scripts),
            error_message,
        )

    metrics = {
        "ids_total": len(snapshot.ids),
        "anchors_total": len(snapshot.anchors),
        "scripts_total": len(snapshot.scripts),
        "catalog_biomes": len(catalog.get("biomi", [])),
        "catalog_species": len(catalog.get("species", [])),
        "catalog_ecosystems": len(catalog.get("ecosistema", []))
        if isinstance(catalog.get("ecosistema"), list)
        else 0,
        "required_id_count": len(required_ids),
        "required_nav_count": len(nav_targets),
    }
    return metrics


def validate_demo_bundle() -> dict[str, Any]:
    generator_path = REPO_ROOT / "docs" / "evo-tactics-pack" / "generator.js"
    assert_requirements("generator-demo", generator_path.exists(), "generator.js non trovato")
    source = generator_path.read_text(encoding="utf-8")
    assert_requirements(
        "generator-demo",
        any(token in source for token in ("id: 'demo-bundle'", 'id: "demo-bundle"')),
        "Preset demo-bundle non trovato in generator.js",
    )
    assert_requirements(
        "generator-demo",
        any(token in source for token in ("builder: 'press-kit-md'", 'builder: "press-kit-md"')),
        "Builder press-kit-md mancante per il bundle demo",
    )

    pack_data_path = REPO_ROOT / "packs" / "pack-data.js"
    assert_requirements("pack-data", pack_data_path.exists(), "packs/pack-data.js non trovato")
    pack_source = pack_data_path.read_text(encoding="utf-8")
    for token in ("EVO_PACK_ROOT", "candidatePackRoots", "loadPackCatalog"):
        assert_requirements(
            "pack-data",
            token in pack_source,
            f"Token '{token}' mancante in packs/pack-data.js",
        )

    deploy_doc = REPO_ROOT / "docs" / "evo-tactics-pack" / "deploy.md"
    assert_requirements("deploy-doc", deploy_doc.exists(), "Documentazione deploy demo mancante")

    metrics = {
        "demo_bundle_present": True,
        "deploy_doc_size": deploy_doc.stat().st_size,
    }
    return metrics


def _append_metrics_log(payload: dict[str, Any]) -> None:
    METRICS_LOG.parent.mkdir(parents=True, exist_ok=True)
    with METRICS_LOG.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, ensure_ascii=False) + "\n")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Valida dashboard e generatore registrando KPI strutturali")
    parser.add_argument(
        "--metrics-output",
        type=Path,
        help="Percorso del file JSON in cui salvare le metriche dell'esecuzione",
    )
    parser.add_argument(
        "--no-log",
        action="store_true",
        help="Non aggiunge le metriche al log JSONL condiviso",
    )
    args = parser.parse_args(argv)

    dashboard_metrics = validate_dashboard()
    generator_metrics = validate_generator()
    demo_metrics = validate_demo_bundle()

    payload: dict[str, Any] = {
        "run_at": datetime.now(tz=timezone.utc).isoformat(),
        "dashboard": dashboard_metrics,
        "generator": generator_metrics,
        "demo_bundle": demo_metrics,
    }

    if not args.no_log:
        _append_metrics_log(payload)

    if args.metrics_output:
        args.metrics_output.parent.mkdir(parents=True, exist_ok=True)
        args.metrics_output.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print("Tutti i controlli sulla dashboard e sul generatore sono passati.")
    print(json.dumps(payload, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
