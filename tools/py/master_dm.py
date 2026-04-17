#!/usr/bin/env python3
"""Master DM CLI — Fase 3 playtest assistant.

REPL che traduce mosse canoniche (11-REGOLE_D20_TV.md §Syntax) in
batch POST /api/session/round/execute. Per playtest tabletop: Master
legge fogli player, inserisce intents, invia round, legge risultati.

Canonical syntax:
    <actor_id>: move [x,y] atk <target_id>    # move + attack (2 AP)
    <actor_id>: atk <target_id>               # attack only (1 AP)
    <actor_id>: move [x,y]                    # move only (N AP, Manhattan)
    <actor_id>: ability <ability_id> target=<target_id>
    <actor_id>: skip                          # 0 AP

Commands REPL:
    end      → commit round (send batch + AI turn)
    state    → show current state
    clear    → clear pending intents
    help     → show syntax
    quit     → exit

Usage:
    python3 tools/py/master_dm.py [--scenario enc_tutorial_01] [--host http://localhost:3334]
"""

import argparse
import json
import re
import sys
import urllib.error
import urllib.request


SYNTAX_HELP = """\
CANONICAL MOSSE:
  actor_id: move [x,y] atk target_id        # move + attack (2 AP)
  actor_id: atk target_id                   # attack (1 AP)
  actor_id: move [x,y]                      # move N cell = N AP
  actor_id: ability id target=target_id     # ability with target
  actor_id: ability id                      # ability self/no-target
  actor_id: skip                            # 0 AP

COMANDI:
  end         commit round (batch + AI turn)
  state       show units + AP + HP
  intents     list pending intents
  clear       reset pending intents
  help        show syntax
  quit        exit
"""


def http_post(url, body):
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read().decode("utf-8"))
        except Exception:
            body = {"error": str(e)}
        return e.code, body


def http_get(url):
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, {"error": str(e)}


MOVE_ATK_RE = re.compile(
    r"^(?P<actor>\S+):\s*move\s*\[(?P<x>-?\d+),\s*(?P<y>-?\d+)\]\s*atk\s+(?P<target>\S+)\s*$"
)
ATK_RE = re.compile(r"^(?P<actor>\S+):\s*atk\s+(?P<target>\S+)\s*$")
MOVE_RE = re.compile(r"^(?P<actor>\S+):\s*move\s*\[(?P<x>-?\d+),\s*(?P<y>-?\d+)\]\s*$")
ABILITY_RE = re.compile(
    r"^(?P<actor>\S+):\s*ability\s+(?P<ability>\S+)(?:\s+target=(?P<target>\S+))?"
    r"(?:\s+pos=\[(?P<x>-?\d+),\s*(?P<y>-?\d+)\])?\s*$"
)
SKIP_RE = re.compile(r"^(?P<actor>\S+):\s*skip\s*$")


def parse_line(line):
    """Parse canonical syntax line → list of intents (can be 1-2 for move+atk)."""
    line = line.strip()
    if not line:
        return []

    m = MOVE_ATK_RE.match(line)
    if m:
        actor = m.group("actor")
        return [
            {
                "actor_id": actor,
                "action": {
                    "type": "move",
                    "position": {"x": int(m.group("x")), "y": int(m.group("y"))},
                },
            },
            {
                "actor_id": actor,
                "action": {"type": "attack", "target_id": m.group("target")},
            },
        ]

    m = ATK_RE.match(line)
    if m:
        return [
            {
                "actor_id": m.group("actor"),
                "action": {"type": "attack", "target_id": m.group("target")},
            }
        ]

    m = MOVE_RE.match(line)
    if m:
        return [
            {
                "actor_id": m.group("actor"),
                "action": {
                    "type": "move",
                    "position": {"x": int(m.group("x")), "y": int(m.group("y"))},
                },
            }
        ]

    m = ABILITY_RE.match(line)
    if m:
        action = {"type": "ability", "ability_id": m.group("ability")}
        if m.group("target"):
            action["target_id"] = m.group("target")
        if m.group("x") is not None and m.group("y") is not None:
            action["position"] = {"x": int(m.group("x")), "y": int(m.group("y"))}
        return [{"actor_id": m.group("actor"), "action": action}]

    m = SKIP_RE.match(line)
    if m:
        return [{"actor_id": m.group("actor"), "action": {"type": "skip"}}]

    raise ValueError(f"syntax non canonica: '{line}' — usa 'help' per syntax")


def fmt_unit(u):
    status_bits = []
    if u.get("status"):
        for k, v in u["status"].items():
            if isinstance(v, (int, float)) and v > 0:
                status_bits.append(f"{k}:{v}")
    pos = u.get("position", {})
    return (
        f"  {u.get('id','?'):<12} {u.get('controlled_by','?'):<8} "
        f"hp:{u.get('hp',0):>3} ap:{u.get('ap_remaining', u.get('ap', 0)):>2} "
        f"[{pos.get('x','?')},{pos.get('y','?')}] "
        f"{('/'.join(status_bits)) if status_bits else ''}"
    )


def print_state(state):
    print(f"\n=== Round {state.get('turn', '?')} ===")
    for u in state.get("units", []):
        if u.get("hp", 0) > 0:
            print(fmt_unit(u))
    dead = [u for u in state.get("units", []) if u.get("hp", 0) <= 0]
    if dead:
        print("  KO:", ", ".join(u.get("id", "?") for u in dead))
    print()


def print_batch_result(resp):
    print(f"\n--- Round {resp.get('round', '?')} resolved ---")
    for r in resp.get("results", []):
        if r.get("skipped"):
            print(f"  SKIP {r.get('actor_id')}: {r['skipped']}")
        elif r.get("action_type") == "attack":
            res = r.get("result", {})
            print(
                f"  ATK  {r.get('actor_id')}: {res.get('result','?')} "
                f"(roll={res.get('roll','?')} mos={res.get('mos','?')} dmg={res.get('damage_dealt',0)})"
            )
        elif r.get("action_type") == "move":
            res = r.get("result", {})
            print(f"  MOVE {r.get('actor_id')}: → {res.get('position_to',{})}")
            if res.get("overwatch"):
                ow = res["overwatch"]
                print(
                    f"       OVERWATCH {ow.get('overwatch_id')} fires "
                    f"(dmg={ow.get('damage_dealt',0)})"
                )
        elif r.get("action_type") == "ability":
            res = r.get("result", {})
            print(
                f"  ABIL {r.get('actor_id')}: {res.get('ability_id','?')} "
                f"({res.get('effect_type','?')})"
            )
        elif r.get("action_type") == "skip":
            print(f"  SKIP {r.get('actor_id')}")
    if resp.get("ai_result"):
        ai = resp["ai_result"]
        for a in ai.get("ia_actions", []):
            if a.get("type") == "attack":
                print(
                    f"  SIS  {a.get('unit_id')}: atk {a.get('target')} "
                    f"({a.get('result','?')} dmg={a.get('damage_dealt',0)})"
                )
            elif a.get("type") == "move":
                print(f"  SIS  {a.get('unit_id')}: → {a.get('position_to','?')}")
            elif a.get("type") == "skip":
                print(f"  SIS  {a.get('unit_id')}: skip ({a.get('reason','')})")


def detect_outcome(state):
    units = state.get("units", [])
    players_alive = [u for u in units if u.get("controlled_by") == "player" and u.get("hp", 0) > 0]
    enemies_alive = [u for u in units if u.get("controlled_by") == "sistema" and u.get("hp", 0) > 0]
    if not players_alive:
        return "defeat"
    if not enemies_alive:
        return "victory"
    return None


def main():
    parser = argparse.ArgumentParser(description="Master DM CLI — playtest assistant")
    parser.add_argument("--host", default="http://localhost:3334", help="API host (default 3334)")
    parser.add_argument("--scenario", default="enc_tutorial_01", help="tutorial scenario id")
    args = parser.parse_args()

    host = args.host.rstrip("/")

    # Fetch scenario
    status, scenario = http_get(f"{host}/api/tutorial/{args.scenario}")
    if status != 200:
        print(f"ERROR fetching scenario: {scenario}", file=sys.stderr)
        return 1
    print(f"Scenario: {scenario.get('name', args.scenario)} (diff {scenario.get('difficulty_rating','?')}/5)")

    # Start session
    status, start = http_post(f"{host}/api/session/start", {"units": scenario["units"]})
    if status != 200:
        print(f"ERROR starting session: {start}", file=sys.stderr)
        return 1
    session_id = start["session_id"]
    print(f"Session: {session_id[:8]}...")
    print_state(start["state"])

    pending_intents = []
    current_state = start["state"]

    print("Type 'help' for syntax, 'end' to commit round, 'quit' to exit.\n")

    while True:
        try:
            line = input("> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if not line:
            continue
        if line == "quit" or line == "exit":
            break
        if line == "help":
            print(SYNTAX_HELP)
            continue
        if line == "state":
            status, st = http_get(f"{host}/api/session/state?session_id={session_id}")
            if status == 200:
                current_state = st
                print_state(st)
            else:
                print(f"ERROR: {st}")
            continue
        if line == "intents":
            if not pending_intents:
                print("  (no pending intents)")
            else:
                for idx, it in enumerate(pending_intents):
                    print(f"  [{idx}] {it['actor_id']}: {json.dumps(it['action'])}")
            continue
        if line == "clear":
            pending_intents = []
            print("intents cleared.")
            continue
        if line == "end":
            # Commit round
            status, resp = http_post(
                f"{host}/api/session/round/execute",
                {
                    "session_id": session_id,
                    "player_intents": pending_intents,
                    "ai_auto": True,
                },
            )
            if status != 200:
                print(f"ERROR round/execute: {resp}", file=sys.stderr)
                continue
            print_batch_result(resp)
            current_state = resp.get("state", current_state)
            print_state(current_state)
            pending_intents = []
            outcome = detect_outcome(current_state)
            if outcome:
                print(f"\n=== MATCH OUTCOME: {outcome.upper()} ===")
                break
            continue

        # Try parse as intent
        try:
            new_intents = parse_line(line)
            pending_intents.extend(new_intents)
            for it in new_intents:
                print(f"  + {it['actor_id']}: {json.dumps(it['action'])}")
        except ValueError as e:
            print(f"PARSE ERROR: {e}")

    # End session
    http_post(f"{host}/api/session/end", {"session_id": session_id})
    print("Session closed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
