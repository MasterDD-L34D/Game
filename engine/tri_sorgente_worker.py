#!/usr/bin/env python3
"""
Tri-Sorgente Node Bridge Worker — Python subprocess.

Q-001 T3.2 · ADR: docs/architecture/tri-sorgente-node-bridge.md

Protocol: reads JSON requests from stdin (one per line), writes JSON responses
to stdout (one per line). Mirror of services/generation/worker.py pattern.

Current implementation: MVP con scoring deterministico semplificato.
Port completo dell'algoritmo da tests/tri_sorgente_sim.py è follow-up.

Config + engine YAML caricati una tantum al boot da:
- engine/tri_sorgente/tri_sorgente_config.yaml
- engine/tri_sorgente/card_offer_engine.yaml

Request shape (stdin):
    {"id": int, "payload": {actor_id, biome_id, recent_actions_counts, ...}}

Response shape (stdout):
    {"id": int, "result": {offers, skip_economy, meta}}
    {"id": int, "error": {message, type}}
"""

import json
import math
import pathlib
import random
import sys
from typing import Any, Dict

ROOT = pathlib.Path(__file__).resolve().parent.parent

try:
    import yaml
except ImportError:
    yaml = None


def _load_config() -> Dict[str, Any]:
    """Load tri_sorgente_config.yaml. Gracefully degrade if yaml missing."""
    if yaml is None:
        return {"softmax_temperature": 0.7}
    cfg_path = ROOT / "engine" / "tri_sorgente" / "tri_sorgente_config.yaml"
    try:
        with cfg_path.open("r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
        return data.get("config", data)
    except FileNotFoundError:
        return {"softmax_temperature": 0.7}


CONFIG = _load_config()


def _softmax(values, temperature: float = 0.7):
    if not values:
        return []
    t = max(temperature, 1e-6)
    m = max(values)
    exps = [math.exp((v - m) / t) for v in values]
    total = sum(exps)
    return [e / total for e in exps] if total > 0 else [0.0] * len(values)


def _compute_offers(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    MVP scoring: deterministic mock based on seed + recent_actions_counts.
    Real implementation (port of tests/tri_sorgente_sim.py) = follow-up PR.
    """
    seed = int(payload.get("seed", 0) or 0)
    biome_id = payload.get("biome_id", "unknown")
    actions = payload.get("recent_actions_counts", {}) or {}

    rng = random.Random(seed)

    # Mock 5 candidate cards with deterministic scoring
    candidates = [f"card_{biome_id}_{i:02d}" for i in range(5)]
    scores = []
    for idx, card_id in enumerate(candidates):
        action_bonus = sum(actions.values()) * 0.05 if actions else 0.0
        noise = rng.random() * 0.1
        raw_score = 0.5 + (idx * 0.1) + action_bonus + noise
        scores.append(raw_score)

    # Top-3 + softmax
    indexed = sorted(enumerate(scores), key=lambda p: p[1], reverse=True)[:3]
    top_scores = [s for _, s in indexed]
    probs = _softmax(top_scores, CONFIG.get("softmax_temperature", 0.7))

    offers = []
    for (idx, score), prob in zip(indexed, probs):
        offers.append(
            {
                "card_id": candidates[idx],
                "score": round(score, 4),
                "softmax_prob": round(prob, 4),
                "breakdown": {
                    "w_actions": round(action_bonus, 4) if actions else 0.0,
                    "w_base": round(0.5 + idx * 0.1, 4),
                },
            }
        )

    skip_cfg = CONFIG.get("skip_economy", {})
    decay = skip_cfg.get("consecutive_decay", [2, 1, 0])
    cap = skip_cfg.get("cap_per_act", 6)

    return {
        "offers": offers,
        "skip_economy": {
            "fg_values": [int(decay[i]) if i < len(decay) else 0 for i in range(3)],
            "cap_per_act": int(cap),
        },
        "meta": {
            "seed": seed,
            "export_version": 1,
            "pool_ids": {"R": candidates[:2], "A": candidates[2:4], "P": candidates[4:]},
            "timestamp": None,  # bridge fills
        },
    }


def _handle_request(req: Dict[str, Any]) -> Dict[str, Any]:
    req_id = req.get("id")
    payload = req.get("payload") or {}
    try:
        result = _compute_offers(payload)
        return {"id": req_id, "result": result}
    except Exception as exc:  # pragma: no cover — defensive
        return {"id": req_id, "error": {"message": str(exc), "type": type(exc).__name__}}


def main():
    # Heartbeat handshake: first line on stdout = ready
    print(json.dumps({"type": "ready", "pid": None}), flush=True)
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
        except json.JSONDecodeError as exc:
            print(
                json.dumps({"id": None, "error": {"message": f"bad json: {exc}", "type": "JSONDecodeError"}}),
                flush=True,
            )
            continue
        resp = _handle_request(req)
        print(json.dumps(resp), flush=True)


if __name__ == "__main__":
    main()
