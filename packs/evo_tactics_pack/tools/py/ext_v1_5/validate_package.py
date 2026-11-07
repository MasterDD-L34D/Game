#!/usr/bin/env python3
# Validate basic invariants in the package (quick checks)
import json, os, sys

base = os.path.dirname(__file__) + "/.."
pack_path = os.path.join(base, "vtt", "npg_pack.json")
schema_path = os.path.join(base, "schema", "npg_schema.json")

try:
    import jsonschema
    HAS = True
except Exception:
    HAS = False

with open(pack_path, "r", encoding="utf-8") as f:
    pack = json.load(f)

if HAS:
    with open(schema_path, "r", encoding="utf-8") as f:
        schema = json.load(f)
    from jsonschema import validate
else:
    schema = None

errors = 0
for i, npc in enumerate(pack):
    # simple keys
    for key in ["id", "biome", "role", "species", "job", "gear", "tactics", "rewards"]:
        if key not in npc:
            print(f"[ERR] NPG #{i} missing key: {key}")
            errors += 1
    # optional schema validation
    if HAS:
        try:
            validate(instance=npc, schema=schema)
        except Exception as e:
            print(f"[ERR] Schema validation failed for {npc.get('id')}: {e}")
            errors += 1

print("Done. Errors:", errors)
sys.exit(1 if errors else 0)
