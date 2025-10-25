#!/usr/bin/env python3
# Spawn a random NPG for a given biome, using encounter tables and pack.
import json, sys, random

with open("vtt/npg_pack.json", "r", encoding="utf-8") as f:
    PACK = json.load(f)

def pick_by_biome(biome):
    candidates = [n for n in PACK if n.get("biome") == biome]
    if not candidates:
        raise SystemExit(f"Nessun NPG per biome: {biome}")
    return random.choice(candidates)

def main():
    biome = sys.argv[1] if len(sys.argv) > 1 else "desert"
    npc = pick_by_biome(biome)
    print(json.dumps(npc, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
