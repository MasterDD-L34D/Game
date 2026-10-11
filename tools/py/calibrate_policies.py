#!/usr/bin/env python3
"""Multi-policy player intent generators -- Restricted-Play triangulation.

TKT-PLAYTEST-TRIANGULATE (2026-05-29). Shared by batch_calibrate_hardcore0{6,7}.py
to drive the player party with policies of varying strength so a single greedy
proxy is NOT mistaken for the human (anti-pattern rejected by Jaffe 2012 AIIDE +
Politowski 2023). The harness reports a WR *band*, not one verdict.

Policies (weak -> strong player proxy):
  random      noise floor -- uniform random legal action (seeded -> reproducible)
  greedy      each script's existing nearest-enemy focus -- kept IN-SCRIPT for
              exact back-compat (this module refuses it on purpose)
  lookahead2  tactical: focus-fire the most-killable target, move into range
  utility     smart: weighted considerations argmax, mirrors
              apps/backend/services/ai/utilityBrain.js (TargetHealth +
              Distance considerations)

Human WR ~= band [random_WR, strong_WR]; initial point estimate
greedy_WR*0.55 + lookahead2_WR*0.45 (CANONICAL-AI-PLAYTEST.md sec 1.1).

Pure module: no HTTP, no backend. Intent shape matches POST
/api/session/round/execute `player_intents`:
  attack: {actor_id, action:{type:'attack', target_id, channel}}
  move:   {actor_id, action:{type:'move', position:{x,y}}}
  skip:   {actor_id, action:{type:'skip'}}
"""

from __future__ import annotations

POLICIES = ("random", "greedy", "lookahead2", "utility")

# utility consideration weights (mirror utilityBrain.js DEFAULT_CONSIDERATIONS).
_W_TARGET_HEALTH = 1.0   # prefer low-HP targets (secure kills)
_W_DISTANCE = 0.8        # prefer close targets
_MAX_RANGE = 10          # distance normaliser (utilityBrain Distance.maxRange)
_ATTACK_BONUS = 0.5      # attacking beats repositioning when both available


def manhattan(a, b):
    return abs(a["x"] - b["x"]) + abs(a["y"] - b["y"])


def _living(units, faction):
    return [u for u in units if u.get("controlled_by") == faction and u.get("hp", 0) > 0]


def _ap(unit):
    return unit.get("ap_remaining", unit.get("ap", 2))


def _range(unit, ctx):
    return unit.get("attack_range", ctx.get("attack_range_default", 1))


def _channel_for(ctx):
    fn = ctx.get("channel_for")
    return fn if callable(fn) else (lambda _tid: "fisico")


def _priority_of(ctx):
    fn = ctx.get("enemy_priority")
    return fn if callable(fn) else (lambda _e: 0)


def _legal_moves(pos, gw, gh, reserved):
    """4-neighbour steps in-bounds and not currently occupied (deterministic order)."""
    out = []
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nx, ny = pos["x"] + dx, pos["y"] + dy
        if 0 <= nx < gw and 0 <= ny < gh and (nx, ny) not in reserved:
            out.append({"x": nx, "y": ny})
    return out


def _step_toward(src, dst, gw, gh, reserved):
    """One greedy orthogonal step toward dst, avoiding reserved tiles."""
    dx = dst["x"] - src["x"]
    dy = dst["y"] - src["y"]
    cands = []
    if abs(dx) >= abs(dy) and dx != 0:
        cands.append({"x": src["x"] + (1 if dx > 0 else -1), "y": src["y"]})
    if dy != 0:
        cands.append({"x": src["x"], "y": src["y"] + (1 if dy > 0 else -1)})
    if dx != 0:
        cands.append({"x": src["x"] + (1 if dx > 0 else -1), "y": src["y"]})
    for c in cands:
        if 0 <= c["x"] < gw and 0 <= c["y"] < gh and (c["x"], c["y"]) not in reserved:
            return c
    return None


def _grid(state):
    g = state.get("grid", {}) or {}
    return int(g.get("width", 10)), int(g.get("height", 10))


def _attack_intent(pl, target, ctx):
    return {
        "actor_id": pl["id"],
        "action": {
            "type": "attack",
            "target_id": target["id"],
            "channel": _channel_for(ctx)(target["id"]),
        },
    }


def plan_random(state, ctx, rng):
    """Uniform random legal action per player. Noise floor. Needs a seeded
    random.Random for reproducibility."""
    if rng is None:
        raise ValueError("plan_random requires a random.Random instance")
    units = state.get("units", [])
    gw, gh = _grid(state)
    players = _living(units, "player")
    enemies = _living(units, "sistema")
    if not enemies:
        return []
    reserved = {(u["position"]["x"], u["position"]["y"]) for u in units if u.get("hp", 0) > 0}
    intents = []
    for pl in players:
        ap = _ap(pl)
        if ap <= 0:
            continue
        rng_ = _range(pl, ctx)
        candidates = []
        if ap >= 1:
            for e in enemies:
                if manhattan(pl["position"], e["position"]) <= rng_:
                    candidates.append(("attack", e))
        if ap >= 2:
            for mv in _legal_moves(pl["position"], gw, gh, reserved):
                candidates.append(("move", mv))
        candidates.append(("skip", None))
        kind, payload = candidates[rng.randrange(len(candidates))]
        if kind == "attack":
            intents.append(_attack_intent(pl, payload, ctx))
        elif kind == "move":
            intents.append({"actor_id": pl["id"], "action": {"type": "move", "position": payload}})
            reserved.discard((pl["position"]["x"], pl["position"]["y"]))
            reserved.add((payload["x"], payload["y"]))
        else:
            intents.append({"actor_id": pl["id"], "action": {"type": "skip"}})
    return intents


def lookahead2(state, ctx):
    """Tactical: focus-fire the most-killable in-range target; otherwise close
    the distance to the best target so the kill lands next turn."""
    units = state.get("units", [])
    gw, gh = _grid(state)
    players = _living(units, "player")
    enemies = _living(units, "sistema")
    if not enemies:
        return []
    prio = _priority_of(ctx)
    reserved = {(u["position"]["x"], u["position"]["y"]) for u in units if u.get("hp", 0) > 0}
    intents = []
    for pl in players:
        ap = _ap(pl)
        if ap <= 0:
            continue
        rng_ = _range(pl, ctx)
        in_range = [e for e in enemies if manhattan(pl["position"], e["position"]) <= rng_]
        if in_range and ap >= 1:
            # secure the kill: lowest HP first, then priority, then nearest.
            target = min(in_range, key=lambda e: (e.get("hp", 0), prio(e), manhattan(pl["position"], e["position"])))
            intents.append(_attack_intent(pl, target, ctx))
            continue
        # approach the most-killable target (lowest HP, then priority, then nearest).
        target = min(enemies, key=lambda e: (e.get("hp", 0), prio(e), manhattan(pl["position"], e["position"])))
        if ap >= 2:
            nxt = _step_toward(pl["position"], target["position"], gw, gh, reserved)
            if nxt is not None:
                intents.append({"actor_id": pl["id"], "action": {"type": "move", "position": nxt}})
                reserved.discard((pl["position"]["x"], pl["position"]["y"]))
                reserved.add((nxt["x"], nxt["y"]))
                if manhattan(nxt, target["position"]) <= rng_:
                    intents.append(_attack_intent(pl, target, ctx))
            else:
                intents.append({"actor_id": pl["id"], "action": {"type": "skip"}})
        else:
            intents.append({"actor_id": pl["id"], "action": {"type": "skip"}})
    return intents


def _utility_target_health(target):
    mh = target.get("max_hp") or 0
    if mh <= 0:
        return 0.5
    return 1.0 - (target.get("hp", 0) / mh)  # linear_inverse: low HP -> high score


def utility(state, ctx):
    """Smart policy: weighted-consideration argmax per player. Mirrors
    utilityBrain.js (TargetHealth linear_inverse + Distance quadratic_inverse)."""
    units = state.get("units", [])
    gw, gh = _grid(state)
    players = _living(units, "player")
    enemies = _living(units, "sistema")
    if not enemies:
        return []
    prio = _priority_of(ctx)
    reserved = {(u["position"]["x"], u["position"]["y"]) for u in units if u.get("hp", 0) > 0}
    intents = []
    for pl in players:
        ap = _ap(pl)
        if ap <= 0:
            continue
        rng_ = _range(pl, ctx)
        scored = []  # (score, kind, payload, priority_tiebreak)
        # attack candidates (in range, ap>=1)
        if ap >= 1:
            for e in enemies:
                dist = manhattan(pl["position"], e["position"])
                if dist <= rng_:
                    th = _utility_target_health(e)
                    ds = 1.0 - min(dist / _MAX_RANGE, 1.0)
                    score = _W_TARGET_HEALTH * th + _W_DISTANCE * (ds * ds) + _ATTACK_BONUS
                    scored.append((score, "attack", e, prio(e)))
        # move candidates toward each enemy (ap>=2)
        if ap >= 2:
            best_target = min(enemies, key=lambda e: (prio(e), e.get("hp", 0), manhattan(pl["position"], e["position"])))
            nxt = _step_toward(pl["position"], best_target["position"], gw, gh, reserved)
            if nxt is not None:
                th = _utility_target_health(best_target)
                newdist = manhattan(nxt, best_target["position"])
                ds = 1.0 - min(newdist / _MAX_RANGE, 1.0)
                score = _W_TARGET_HEALTH * th + _W_DISTANCE * (ds * ds)
                scored.append((score, "move", nxt, prio(best_target)))
        if not scored:
            intents.append({"actor_id": pl["id"], "action": {"type": "skip"}})
            continue
        # argmax; deterministic tie-break: higher score, then lower priority value.
        scored.sort(key=lambda s: (-s[0], s[3]))
        _score, kind, payload, _p = scored[0]
        if kind == "attack":
            intents.append(_attack_intent(pl, payload, ctx))
        else:
            intents.append({"actor_id": pl["id"], "action": {"type": "move", "position": payload}})
            reserved.discard((pl["position"]["x"], pl["position"]["y"]))
            reserved.add((payload["x"], payload["y"]))
    return intents


def pick_intents(policy, state, ctx, rng=None):
    """Dispatch to a non-greedy policy. `greedy` is intentionally NOT handled
    here -- each batch script keeps its own ratified greedy planner."""
    if policy == "random":
        return plan_random(state, ctx, rng)
    if policy == "lookahead2":
        return lookahead2(state, ctx)
    if policy == "utility":
        return utility(state, ctx)
    raise ValueError(
        f"pick_intents: policy {policy!r} not handled here "
        f"(greedy stays in-script; valid shared policies: random/lookahead2/utility)"
    )


def compute_band(per_policy_runs):
    """Given {policy: [run,...]} compute per-policy WR (fraction), the WR band
    [min,max], and the initial human estimate greedy*0.55 + lookahead2*0.45."""
    wr = {}
    for pol, runs in per_policy_runs.items():
        ok = [r for r in runs if isinstance(r, dict) and "outcome" in r]
        n = len(ok)
        if n == 0:
            continue
        wins = sum(1 for r in ok if r.get("outcome") == "victory")
        wr[pol] = wins / n
    band = [min(wr.values()), max(wr.values())] if wr else [None, None]
    human = None
    if "greedy" in wr and "lookahead2" in wr:
        human = wr["greedy"] * 0.55 + wr["lookahead2"] * 0.45
    return {
        "policy_win_rate": wr,
        "band": band,
        "human_wr_est": human,
        "human_wr_formula": "greedy*0.55 + lookahead2*0.45",
    }
