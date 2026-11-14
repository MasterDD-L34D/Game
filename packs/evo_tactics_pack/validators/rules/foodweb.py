from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable, Mapping, Sequence

from .base import ValidationMessage


@dataclass(frozen=True)
class FoodwebRules:
    allowed_edge_types: frozenset[str]
    special_nodes: frozenset[str]


def build_foodweb_rules(config_payload: Mapping[str, Any]) -> FoodwebRules:
    foodweb_cfg = config_payload.get("foodweb") if isinstance(config_payload, Mapping) else {}
    allowed = foodweb_cfg.get("allowed_edge_types") if isinstance(foodweb_cfg, Mapping) else []
    specials = foodweb_cfg.get("special_nodes") if isinstance(foodweb_cfg, Mapping) else []
    return FoodwebRules(
        allowed_edge_types=frozenset(str(item) for item in allowed or []),
        special_nodes=frozenset(str(item) for item in specials or []),
    )


def _collect_nodes(foodweb: Mapping[str, Any]) -> set[str]:
    nodes: set[str] = set()
    raw_nodes = foodweb.get("nodes") if isinstance(foodweb, Mapping) else []
    if isinstance(raw_nodes, Sequence):
        for node in raw_nodes:
            if isinstance(node, Mapping):
                node_id = node.get("id")
                if isinstance(node_id, str):
                    nodes.add(node_id)
            elif isinstance(node, str):
                nodes.add(node)
    return nodes


def _collect_edges(foodweb: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    edges = foodweb.get("edges") if isinstance(foodweb, Mapping) else []
    return [edge for edge in edges if isinstance(edge, Mapping)]


def validate_foodweb_document(
    foodweb: Mapping[str, Any],
    rules: FoodwebRules,
) -> list[ValidationMessage]:
    messages: list[ValidationMessage] = []
    nodes = _collect_nodes(foodweb)
    for edge in _collect_edges(foodweb):
        edge_type = edge.get("type")
        source = edge.get("from")
        target = edge.get("to")
        if edge_type not in rules.allowed_edge_types:
            messages.append(
                ValidationMessage(
                    level="error",
                    code="foodweb.edge.type",
                    message=f"Tipo di arco '{edge_type}' non ammesso",
                    subject=f"{source}->{target}",
                )
            )
        if source not in nodes or target not in nodes:
            messages.append(
                ValidationMessage(
                    level="error",
                    code="foodweb.edge.unknown_node",
                    message="Arco utilizza nodi non definiti",
                    subject=f"{source}->{target}",
                )
            )
    return messages


def has_detritus_sink(foodweb: Mapping[str, Any]) -> bool:
    nodes = _collect_nodes(foodweb)
    if "detrito" not in nodes:
        return False
    for edge in _collect_edges(foodweb):
        if edge.get("from") == "detrito" and edge.get("type") in {"detritus", "scavenging"}:
            return True
    return False


def validate_network_connectivity(
    network: Mapping[str, Any],
    node_foodwebs: Mapping[str, Mapping[str, Any]],
) -> list[ValidationMessage]:
    messages: list[ValidationMessage] = []
    edges = network.get("edges") or network.get("connessioni") or []
    bridge_species_map = network.get("bridge_species_map") or []

    for edge in edges:
        if not isinstance(edge, Mapping):
            continue
        edge_type = edge.get("type")
        origin = edge.get("from")
        target = edge.get("to")
        if edge_type == "trophic_spillover":
            dest_foodweb = node_foodwebs.get(target)
            if not dest_foodweb or not has_detritus_sink(dest_foodweb):
                messages.append(
                    ValidationMessage(
                        level="warning",
                        code="network.spillover.detritus",
                        message=f"{target} non ha sink di detrito per spillover da {origin}",
                        subject=str(target),
                    )
                )
        if edge_type in {"corridor", "seasonal_bridge"}:
            present = False
            for bridge_entry in bridge_species_map:
                if not isinstance(bridge_entry, Mapping):
                    continue
                nodes = bridge_entry.get("present_in_nodes") or []
                if isinstance(nodes, Sequence) and origin in nodes and target in nodes:
                    present = True
                    break
            if not present:
                messages.append(
                    ValidationMessage(
                        level="warning",
                        code="network.bridge.missing_species",
                        message=f"Nessuna bridge species dichiarata per {origin}->{target}",
                        subject=f"{origin}->{target}",
                    )
                )
    return messages


def collect_event_propagation(
    network: Mapping[str, Any],
    node_events: Mapping[str, bool],
) -> list[ValidationMessage]:
    messages: list[ValidationMessage] = []
    edges = network.get("edges") or network.get("connessioni") or []
    for node_id, has_event in node_events.items():
        if not has_event:
            continue
        for edge in edges:
            if not isinstance(edge, Mapping):
                continue
            if edge.get("from") == node_id and edge.get("type") in {"corridor", "seasonal_bridge"}:
                messages.append(
                    ValidationMessage(
                        level="info",
                        code="network.events.propagation",
                        message=f"Evento in {node_id} può propagare verso {edge.get('to')}",
                        subject=node_id,
                    )
                )
    return messages
