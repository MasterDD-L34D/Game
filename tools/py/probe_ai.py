#!/usr/bin/env python3
import json, urllib.request

HOST = "http://localhost:3340"

def post(url, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type":"application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())

def get(url):
    with urllib.request.urlopen(url, timeout=10) as r:
        return json.loads(r.read())

sc = get(f"{HOST}/api/tutorial/enc_tutorial_06_hardcore")
start = post(f"{HOST}/api/session/start", {"units": sc["units"], "modulation":"full", "sistema_pressure_start": 85, "hazard_tiles": sc["hazard_tiles"]})
sid = start["session_id"]

# 8 rounds with empty player intents to let AI approach
for r in range(8):
    resp = post(f"{HOST}/api/session/round/execute", {"session_id": sid, "player_intents": [], "ai_auto": True, "priority_queue": True})
    print(f"=== Round {r+1} | results count={len(resp['results'])} ===")
    for res in resp["results"]:
        actor = res.get("actor_id","?")
        at = res.get("action_type","?")
        side = "SIS" if actor.startswith("e_") else "PG"
        detail = ""
        if at == "attack":
            rr = res.get("result",{})
            detail = f"roll={rr.get('roll')} vs dc={rr.get('dc')} {rr.get('result')} dmg={rr.get('damage_dealt',0)}"
        elif at == "move":
            detail = f"to {res.get('result',{}).get('position_to')}"
        elif at == "skip":
            detail = f"({res.get('result',{}).get('reason','')})"
        print(f"  {side} {actor[:18]:18} {at:7} {detail}")
    pa = [u for u in resp["state"]["units"] if u["controlled_by"]=="player"]
    tot_hp = sum(u["hp"] for u in pa)
    print(f"  [player hp total: {tot_hp}]")
post(f"{HOST}/api/session/end", {"session_id": sid})
