#!/usr/bin/env python3
from __future__ import annotations

import argparse
import glob
import sys
from pathlib import Path

import yaml

from ...validators.rules import foodweb
from ...validators.rules.base import format_messages, has_errors


def _load_yaml(path: Path | str | None) -> dict:
    if not path:
        return {}
    try:
        return yaml.safe_load(Path(path).read_text(encoding="utf-8")) or {}
    except FileNotFoundError:
        return {}


def _collect_node_payloads(nodes: list[dict[str, object]]) -> tuple[dict[str, dict], dict[str, bool]]:
    node_foodwebs: dict[str, dict] = {}
    node_events: dict[str, bool] = {}
    for node in nodes:
        if not isinstance(node, dict):
            continue
        node_id = node.get("id")
        eco_path = node.get("path")
        if not isinstance(node_id, str):
            continue
        ecosystem = _load_yaml(eco_path)
        links = ecosystem.get("links") if isinstance(ecosystem, dict) else {}
        fw_path = links.get("foodweb") if isinstance(links, dict) else None
        if isinstance(fw_path, str):
            node_foodwebs[node_id] = _load_yaml(fw_path)
        species_dir = links.get("species_dir") if isinstance(links, dict) else None
        node_events[node_id] = _has_event_flag(species_dir)
    return node_foodwebs, node_events


def _has_event_flag(species_dir: object) -> bool:
    if not isinstance(species_dir, str):
        return False
    for path in glob.glob(f"{species_dir}/*.yaml"):
        payload = _load_yaml(path)
        flags = payload.get("flags") if isinstance(payload, dict) else {}
        if isinstance(flags, dict) and flags.get("event"):
            return True
    return False


def run(net_path: str) -> int:
    network_doc = _load_yaml(net_path)
    root = network_doc.get("ecosistema") or network_doc.get("network") or {}
    nodes = root.get("nodes") or root.get("biomi") or []
    if not isinstance(nodes, list):
        nodes = []

    node_foodwebs, node_events = _collect_node_payloads(nodes)

    messages = []
    messages.extend(foodweb.validate_network_connectivity(root, node_foodwebs))
    messages.extend(foodweb.collect_event_propagation(root, node_events))

    for line in format_messages(messages):
        print(line)

    return 0 if not has_errors(messages) else 2


def check_cross_events(net_path: str) -> None:
    net_dir = Path(net_path).resolve().parent
    events_path = net_dir / "cross_events.yaml"
    if not events_path.exists():
        return
    network_doc = _load_yaml(net_path)
    root = network_doc.get("ecosistema") or network_doc.get("network") or {}
    edges = root.get("edges") or root.get("connessioni") or []
    payload = _load_yaml(events_path)
    events = payload.get("events") if isinstance(payload, dict) else []
    for event in events or []:
        if not isinstance(event, dict):
            continue
        species_id = event.get("species_id")
        from_nodes = event.get("from_nodes") or []
        to_nodes = event.get("to_nodes") or []
        modes = set(event.get("propagate_via") or [])
        for origin in from_nodes:
            for target in to_nodes:
                if not any(
                    isinstance(edge, dict)
                    and edge.get("from") == origin
                    and edge.get("to") == target
                    and edge.get("type") in modes
                    for edge in edges
                ):
                    print(
                        f"WARNING: cross_event {species_id} non trova edge {origin}→{target} con type in {sorted(modes)}"
                    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Valida connessioni foodweb cross-bioma")
    parser.add_argument("net_path")
    args = parser.parse_args(argv)
    exit_code = run(args.net_path)
    check_cross_events(args.net_path)
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
