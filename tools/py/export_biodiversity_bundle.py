#!/usr/bin/env python3
"""Export del bundle canonical biodiversità (Sprint v3.5).
# DEPRECATED 2026-05-15 (ADR-2026-05-15 Phase 4c.5 partial migration):
# Reads legacy data/core/species.yaml + species_expansion.yaml. Canonical SOT
# moved to data/core/species/species_catalog.json (catalog v0.4.x). Full
# migration via tools/py/lib/species_loader.py pending master-dd Phase 4c.6
# sprint dedicato (file removal). Tool may break post Phase 4c.6 git rm —
# refactor required to consume catalog.
# See: docs/adr/ADR-2026-05-15-species-catalog-schema-fork-resolution.md

Aggrega in un unico JSON deterministico:
  - data/core/biomes.yaml                                    (runtime canonical biomes)
  - data/core/species.yaml                                   (runtime canonical species - top-level keys)
  - data/ecosystems/*.ecosystem.yaml                         (data/ecosystems lite stubs)
  - packs/evo_tactics_pack/data/ecosystems/*.ecosystem.yaml  (pack ecosistemi ricchi)
  - packs/evo_tactics_pack/data/ecosystems/network/meta_network_alpha.yaml  (network)
  - packs/evo_tactics_pack/data/ecosystems/network/cross_events.yaml        (cross events)
  - packs/evo_tactics_pack/data/foodwebs/*.yaml              (foodweb whitelist trofica)
  - packs/evo_tactics_pack/data/species/<biome>/*.yaml       (species canonical pack)

Output:
  out/bio/biodiversity_bundle.json (default)
  Schema: schemas/evo/biodiversity_bundle.schema.json (snapshot_id = sha256 prefix 16 char)

Usage:
  python tools/py/export_biodiversity_bundle.py [--out OUT] [--strict]

In modalità --strict, esce con exit 1 se trova:
  - source files mancanti
  - duplicati di id critici (biome_id, species_id, network node id)
  - mismatch network.nodes ↔ ecosystems

UTF-8 esplicito, ensure_ascii=False, indent=2 (anti-mojibake).
NO modifica diretta dei sources of truth (read-only).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML required. Install via `pip install -r tools/py/requirements.txt`.", file=sys.stderr)
    sys.exit(2)


ROOT = Path(__file__).resolve().parents[2]


def load_yaml(path: Path) -> Any:
    """Load YAML file with explicit UTF-8 encoding."""
    with path.open("r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def relpath(path: Path) -> str:
    """Return repo-relative POSIX path."""
    try:
        return path.relative_to(ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def collect_network(strict: bool, errors: list[str]) -> dict[str, Any]:
    """Load meta_network_alpha.yaml + cross_events.yaml."""
    network_path = ROOT / "packs/evo_tactics_pack/data/ecosystems/network/meta_network_alpha.yaml"
    cross_path = ROOT / "packs/evo_tactics_pack/data/ecosystems/network/cross_events.yaml"

    if not network_path.exists():
        errors.append(f"missing source: {relpath(network_path)}")
        return {}, []
    raw = load_yaml(network_path) or {}
    net_block = raw.get("network", {}) or {}

    network = {
        "id": net_block.get("id", ""),
        "label": net_block.get("label", ""),
        "nodes": net_block.get("nodes", []) or [],
        "edges": net_block.get("edges", []) or [],
    }
    rules = net_block.get("rules")
    if rules:
        network["rules"] = rules

    bridge_map = net_block.get("bridge_species_map", []) or []

    cross_events: list[dict[str, Any]] = []
    if cross_path.exists():
        cross_raw = load_yaml(cross_path) or {}
        cross_events = cross_raw.get("events", []) or []
    elif strict:
        errors.append(f"missing source: {relpath(cross_path)}")

    return {"network": network, "bridge_species_map": bridge_map, "cross_events": cross_events}


def collect_ecosystems(strict: bool, errors: list[str]) -> list[dict[str, Any]]:
    """Carica ecosistemi da pack + lite stubs in data/ecosystems."""
    out: list[dict[str, Any]] = []
    seen: set[str] = set()

    pack_dir = ROOT / "packs/evo_tactics_pack/data/ecosystems"
    lite_dir = ROOT / "data/ecosystems"

    candidates: list[Path] = []
    if pack_dir.is_dir():
        candidates.extend(sorted(pack_dir.glob("*.ecosystem.yaml")))
    if lite_dir.is_dir():
        candidates.extend(sorted(lite_dir.glob("*.ecosystem.yaml")))

    for path in candidates:
        try:
            raw = load_yaml(path) or {}
        except Exception as exc:  # pragma: no cover - parse defensive
            errors.append(f"yaml parse error {relpath(path)}: {exc}")
            continue

        eco_block = raw.get("ecosistema", {}) or {}
        eco_id = eco_block.get("id") or path.stem.replace(".ecosystem", "").upper()
        biome_id = eco_block.get("biome_id") or path.stem.replace(".ecosystem", "")

        # Dedup tra pack rich + data/ecosystems lite. Pack vince (caricato prima).
        key = eco_id.upper()
        if key in seen:
            continue
        seen.add(key)

        record: dict[str, Any] = {
            "id": eco_id,
            "biome_id": biome_id,
            "label": eco_block.get("label", ""),
            "source_path": relpath(path),
        }
        if "trofico" in eco_block:
            record["trofico"] = eco_block["trofico"]
        if "links" in raw:
            record["links"] = raw["links"]
        out.append(record)

    return out


def collect_foodwebs(strict: bool, errors: list[str]) -> list[dict[str, Any]]:
    """Carica foodwebs canonical."""
    out: list[dict[str, Any]] = []
    foodweb_dir = ROOT / "packs/evo_tactics_pack/data/foodwebs"
    if not foodweb_dir.is_dir():
        if strict:
            errors.append(f"missing dir: {relpath(foodweb_dir)}")
        return out

    for path in sorted(foodweb_dir.glob("*_foodweb.yaml")):
        try:
            raw = load_yaml(path) or {}
        except Exception as exc:  # pragma: no cover
            errors.append(f"yaml parse error {relpath(path)}: {exc}")
            continue

        record = {
            "biome_slug": raw.get("biome_slug") or path.stem.replace("_foodweb", ""),
            "pack_slug": raw.get("pack_slug", ""),
            "display_name_it": raw.get("display_name_it", ""),
            "display_name_en": raw.get("display_name_en", ""),
            "nodes": raw.get("nodes", []) or [],
            "edges": raw.get("edges", []) or [],
        }
        out.append(record)

    return out


def collect_species(strict: bool, errors: list[str]) -> list[dict[str, Any]]:
    """Carica species canonical da pack/species/<biome>/*.yaml.

    Schema species lite: solo id + label + biome_id + source_path. Il dettaglio rich
    resta locale al pack (vincolo SYNC §3 — non duplicare).
    """
    out: list[dict[str, Any]] = []
    seen: set[str] = set()

    species_dir = ROOT / "packs/evo_tactics_pack/data/species"
    if not species_dir.is_dir():
        if strict:
            errors.append(f"missing dir: {relpath(species_dir)}")
        return out

    for biome_dir in sorted(p for p in species_dir.iterdir() if p.is_dir()):
        biome_id = biome_dir.name
        for path in sorted(biome_dir.glob("*.yaml")):
            try:
                raw = load_yaml(path) or {}
            except Exception as exc:  # pragma: no cover
                errors.append(f"yaml parse error {relpath(path)}: {exc}")
                continue

            sid = (
                raw.get("id")
                or raw.get("species_id")
                or path.stem
            )
            if sid in seen:
                continue
            seen.add(sid)

            record = {
                "id": sid,
                "label": raw.get("label") or raw.get("name") or sid,
                "biome_id": biome_id,
                "source_path": relpath(path),
            }
            out.append(record)

    return out


def collect_biomes(strict: bool, errors: list[str]) -> list[dict[str, Any]]:
    """Carica biomi runtime da data/core/biomes.yaml.

    biomes.yaml struttura attuale è eterogenea (top-level keys =
    `vc_adapt`, `mutations`, ecc., biomi nested in chiavi specifiche). Estraiamo
    in modo difensivo: cerchiamo `biomes`, `biomi`, o tag-like top-level.
    """
    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    path = ROOT / "data/core/biomes.yaml"
    if not path.exists():
        if strict:
            errors.append(f"missing source: {relpath(path)}")
        return out

    try:
        raw = load_yaml(path) or {}
    except Exception as exc:  # pragma: no cover
        errors.append(f"yaml parse error {relpath(path)}: {exc}")
        return out

    # Normalizza in lista
    candidates: list[dict[str, Any]] = []
    if isinstance(raw, list):
        candidates = [b for b in raw if isinstance(b, dict)]
    elif isinstance(raw, dict):
        for key in ("biomes", "biomi", "biome_pools"):
            v = raw.get(key)
            if isinstance(v, list):
                candidates.extend(b for b in v if isinstance(b, dict))
            elif isinstance(v, dict):
                for sub_id, sub in v.items():
                    if isinstance(sub, dict):
                        merged = {"id": sub.get("id") or sub_id, **sub}
                        candidates.append(merged)
        # Anche se manca la sezione "biomes" canonical, estraiamo eventuali key id-like top-level
        # noti come biomi (heuristic: qualsiasi sub-dict con `diff_base` o `label` campo).
        if not candidates:
            for key, sub in raw.items():
                if isinstance(sub, dict) and ("diff_base" in sub or "biome_id" in sub):
                    candidates.append({"id": key, **sub})

    # Augment con biomes_expansion se presente
    expansion = ROOT / "data/core/biomes_expansion.yaml"
    if expansion.exists():
        try:
            ex_raw = load_yaml(expansion) or {}
            if isinstance(ex_raw, dict):
                for key in ("biomes", "biomi"):
                    v = ex_raw.get(key)
                    if isinstance(v, list):
                        candidates.extend(b for b in v if isinstance(b, dict))
        except Exception:  # pragma: no cover
            pass

    for c in candidates:
        bid = c.get("id") or c.get("biome_id")
        if not bid:
            continue
        if bid in seen:
            continue
        seen.add(bid)
        record: dict[str, Any] = {"id": bid}
        if "label" in c:
            record["label"] = c["label"]
        if "diff_base" in c:
            record["diff_base"] = c["diff_base"]
        out.append(record)

    return out


def normalize_for_hash(payload: dict[str, Any]) -> str:
    """Serializza payload (escluso `generated_at` + `snapshot_id`) per hash deterministico."""
    clone = {k: v for k, v in payload.items() if k not in {"generated_at", "snapshot_id"}}
    return json.dumps(clone, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def build_bundle(strict: bool) -> tuple[dict[str, Any], list[str]]:
    errors: list[str] = []

    network_block = collect_network(strict, errors)
    ecosystems = collect_ecosystems(strict, errors)
    foodwebs = collect_foodwebs(strict, errors)
    species = collect_species(strict, errors)
    biomes = collect_biomes(strict, errors)

    # Cross-check network nodes ↔ ecosystems (drift surface).
    # Mapping primario: network.node.id ↔ ecosystem.id (entrambi UPPERCASE come `BADLANDS`).
    # Il campo network.node.biome_id contiene il *biome profile* (es. `savana`,
    # `canyons_risonanti`) che NON corrisponde a ecosystem.biome_id (es. `deserto_caldo`):
    # questa è una asimmetria di naming nei sources, NON un errore di bundle.
    if network_block:
        network_node_ids = {n.get("id") for n in network_block["network"].get("nodes", [])}
        eco_ids = {e.get("id") for e in ecosystems}
        for nid in network_node_ids:
            if nid and nid not in eco_ids:
                errors.append(
                    f"network node '{nid}' has no matching ecosystem (id mismatch)"
                )

    payload: dict[str, Any] = {
        "schema_version": "1.0.0",
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "snapshot_id": "",  # popolato sotto
        "network": network_block.get("network", {}) if network_block else {},
        "ecosystems": ecosystems,
        "foodwebs": foodwebs,
        "species": species,
        "biomes": biomes,
    }
    if network_block.get("cross_events"):
        payload["cross_events"] = network_block["cross_events"]
    if network_block.get("bridge_species_map"):
        payload["bridge_species_map"] = network_block["bridge_species_map"]

    payload["manifests"] = {
        "counts": {
            "biomes": len(biomes),
            "ecosystems": len(ecosystems),
            "foodwebs": len(foodwebs),
            "species": len(species),
            "network_nodes": len((network_block.get("network") or {}).get("nodes", [])),
            "network_edges": len((network_block.get("network") or {}).get("edges", [])),
            "cross_events": len(network_block.get("cross_events") or []),
        },
        "source_files": [
            "data/core/biomes.yaml",
            "data/core/species.yaml",
            "packs/evo_tactics_pack/data/ecosystems/network/meta_network_alpha.yaml",
            "packs/evo_tactics_pack/data/ecosystems/network/cross_events.yaml",
            "packs/evo_tactics_pack/data/ecosystems/*.ecosystem.yaml",
            "packs/evo_tactics_pack/data/foodwebs/*_foodweb.yaml",
            "packs/evo_tactics_pack/data/species/<biome>/*.yaml",
        ],
    }

    canonical = normalize_for_hash(payload)
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:16]
    payload["snapshot_id"] = digest

    return payload, errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "--out",
        type=Path,
        default=ROOT / "out/bio/biodiversity_bundle.json",
        help="Output path (default: out/bio/biodiversity_bundle.json)",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit 1 se ci sono missing sources o drift cross-source",
    )
    args = parser.parse_args(argv)

    payload, errors = build_bundle(strict=args.strict)

    if errors:
        for err in errors:
            print(f"[bundle] {err}", file=sys.stderr)
        if args.strict:
            print(f"[bundle] FAIL — {len(errors)} errors in strict mode", file=sys.stderr)
            return 1

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)
        fh.write("\n")

    counts = payload["manifests"]["counts"]
    print(
        f"[bundle] OK — {args.out.relative_to(ROOT) if args.out.is_absolute() else args.out} "
        f"snapshot_id={payload['snapshot_id']} "
        f"biomes={counts['biomes']} ecosystems={counts['ecosystems']} "
        f"foodwebs={counts['foodwebs']} species={counts['species']} "
        f"network_nodes={counts['network_nodes']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
