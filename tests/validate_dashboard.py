"""Structural checks for dashboard and generator pages.

This script validates that the main dashboard (`docs/index.html`) and the
ecosystem generator hub expose all the DOM hooks expected by their companion
JavaScript. It also runs a quick sanity check on the generator catalog so we
know the exported data contains the essential keys used at runtime.
"""

from __future__ import annotations

import json
from html.parser import HTMLParser
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]


class HtmlSnapshot(HTMLParser):
    """Collect IDs, anchors and section tags from an HTML document."""

    def __init__(self) -> None:
        super().__init__()
        self.ids: set[str] = set()
        self.anchors: list[str] = []
        self.sections: list[str] = []

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


def load_html_snapshot(path: Path) -> HtmlSnapshot:
    snapshot = HtmlSnapshot()
    snapshot.feed(path.read_text(encoding="utf-8"))
    return snapshot


def assert_requirements(name: str, condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(f"[{name}] {message}")


def validate_dashboard() -> None:
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


def validate_generator() -> None:
    page_path = REPO_ROOT / "docs" / "evo-tactics-pack" / "generator.html"
    assert_requirements("generator", page_path.exists(), "generator.html non trovato")
    snapshot = load_html_snapshot(page_path)

    required_ids = {
        "generator-form",
        "flags",
        "roles",
        "tags",
        "nBiomi",
        "biome-grid",
        "seed-grid",
        "generator-status",
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


def validate_demo_bundle() -> None:
    generator_path = REPO_ROOT / "docs" / "evo-tactics-pack" / "generator.js"
    assert_requirements("generator-demo", generator_path.exists(), "generator.js non trovato")
    source = generator_path.read_text(encoding="utf-8")
    assert_requirements(
        "generator-demo",
        'id: "demo-bundle"' in source,
        "Preset demo-bundle non trovato in generator.js",
    )
    assert_requirements(
        "generator-demo",
        'builder: "press-kit-md"' in source,
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


def main() -> None:
    validate_dashboard()
    validate_generator()
    validate_demo_bundle()
    print("Tutti i controlli sulla dashboard e sul generatore sono passati.")


if __name__ == "__main__":
    main()
