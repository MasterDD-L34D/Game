import os, json, yaml, sys

BASE = os.path.dirname(os.path.dirname(__file__))
errors = []

def exists(path):
    if not os.path.exists(os.path.join(BASE, path)):
        errors.append(f"MISSING: {path}")

# Check add-on presence
exists("modules/personality/enneagram/personality_module.v1.json")
exists("modules/personality/enneagram/compat_map.json")
exists("modules/personality/enneagram/enneagramma_dataset.json")
exists("modules/personality/enneagram/enneagramma_schema.json")
exists("modules/personality/enneagram/hook_bindings.ts")

# Check themes.yaml has 9 entries
th_file = os.path.join(BASE, "ennea/themes.yaml")
with open(th_file, "r", encoding="utf-8") as f:
    data = yaml.safe_load(f)
if len(data.get("themes", [])) < 9:
    errors.append("ENNEA THEMES: expected 9 themes.")

# Verify hooks coverage for 1..9 in module
mod_file = os.path.join(BASE, "modules/personality/enneagram/personality_module.v1.json")
with open(mod_file, "r", encoding="utf-8") as f:
    mod = json.load(f)

hook_ids = {h.get("id") for h in mod.get("mechanics_registry", {}).get("hooks", [])}
needed = {"theme.reformer_1","theme.helper_2","theme.achiever_3","theme.individual_4","theme.investigator_5","theme.loyalist_6","theme.enthusiast_7","theme.challenger_8","theme.peacemaker_9"}
missing_hooks = needed - hook_ids
if missing_hooks:
    errors.append("HOOKS missing: " + ", ".join(sorted(missing_hooks)))

# Basic alias check
compat_file = os.path.join(BASE, "modules/personality/enneagram/compat_map.json")
with open(compat_file, "r", encoding="utf-8") as f:
    compat = json.load(f)
stats = compat.get("stats", {})
for s in ["ac","melee_damage","support_power","stealth","pp","pe","sg"]:
    if s not in stats:
        errors.append(f"COMPAT MISSING STAT ALIAS: {s}")

if errors:
    print("VALIDATION ERRORS:")
    for e in errors:
        print(" -", e)
    sys.exit(1)
else:
    print("VALIDATION OK")
