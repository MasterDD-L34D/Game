#!/usr/bin/env python3
import subprocess, sys, json, os, glob
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
GAME=os.path.join(ROOT,"Game")
DATA=os.path.join(GAME,"data")
CFG=os.path.join(GAME,"tools","config")
PY=os.path.join(GAME,"tools","py")
EXT=os.path.join(PY,"ext_v1_5")

SKIP_NAMES = {"validate_species.py","validate_v7.py","validate_ecosystem_foodweb.py","validate_species_v1_5.py","validate_package.py","validate_forms.py","validate_catalog_v1_4.py"}

def try_run(cmd):
    try:
        out=subprocess.run(cmd, capture_output=True, text=True, check=False)
        return {"cmd":" ".join(cmd),"code":out.returncode,"stdout":out.stdout,"stderr":out.stderr}
    except Exception as e:
        return {"cmd":" ".join(cmd),"code":99,"stderr":str(e)}

reports=[]

# Core validators (ours)
core = [
 ["python", os.path.join(PY,"validate_ecosistema_v2_0.py"), os.path.join(DATA,"ecosystems","network","meta_network_alpha.yaml")],
 ["python", os.path.join(PY,"validate_cross_foodweb_v1_0.py"), os.path.join(DATA,"ecosystems","network","meta_network_alpha.yaml")],
]
for c in core:
    reports.append(try_run(c))

# Bioma validators (v1.1)
for ecofile in [
 os.path.join(DATA,"ecosystems","badlands.biome.yaml"),
 os.path.join(DATA,"ecosystems","foresta_temperata.biome.yaml"),
 os.path.join(DATA,"ecosystems","deserto_caldo.biome.yaml"),
 os.path.join(DATA,"ecosystems","cryosteppe.biome.yaml"),
]:
    if os.path.exists(ecofile):
        reports.append(try_run(["python", os.path.join(PY,"validate_bioma_v1_1.py"),
                                ecofile, os.path.join(CFG,"validator_config.yaml"), os.path.join(CFG,"registries")]))


# Species validators (our v1.7)
sp_roots=[
 os.path.join(DATA,"species","badlands"),
 os.path.join(DATA,"species","foresta_temperata"),
 os.path.join(DATA,"species","deserto_caldo"),
 os.path.join(DATA,"species","cryosteppe")
]
sp_val=os.path.join(PY,"validate_species_v1_7.py")
if os.path.exists(sp_val):
    for r in sp_roots:
        reports.append(try_run(["python", sp_val, "--species-root", r, "--config", os.path.join(CFG,"validator_config.yaml"), "--registries", os.path.join(CFG,"registries")]))

# Foodweb locals (ours)
fw = [
 os.path.join(DATA,"foodwebs","badlands_foodweb.yaml"),
 os.path.join(DATA,"foodwebs","foresta_temperata_foodweb.yaml"),
 os.path.join(DATA,"foodwebs","deserto_caldo_foodweb.yaml"),
 os.path.join(DATA,"foodwebs","cryosteppe_foodweb.yaml"),
]
for f in fw:
    if os.path.exists(f):
        reports.append(try_run(["python", os.path.join(PY,"validate_foodweb_v1_0.py"), f, os.path.join(CFG,"validator_config.yaml")]))

# EXT v1.5 validators: run only the ones that don't require custom CLI
species_yaml = os.path.join(DATA,"species.yaml")
for vf in glob.glob(os.path.join(EXT,"*.py")):
    name = os.path.basename(vf)
    if name in SKIP_NAMES: 
        continue
    if any(x in name.lower() for x in ["validate", "check", "lint"]):
        # Try with data root
        reports.append(try_run(["python", vf, DATA]))

print(json.dumps({"reports":reports}, ensure_ascii=False))
