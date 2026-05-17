#!/usr/bin/env python3
import sys, yaml, json
spec = yaml.safe_load(open(sys.argv[1],'r',encoding='utf-8'))
spi = int(spec.get('global',{}).get('starting_pi_points',7))
pcat = {p['id']:p for p in spec.get('packages_catalog',[]) if 'id' in p}
errors=[]; ui=[]
for f in spec.get('forms',[]):
    code=f.get('code'); pil=f.get('starting_pi',[])+f.get('starting_pi_extra',[])
    cost=sum(int(pcat[p]['cost']) for p in pil if p in pcat)
    if cost!=spi: errors.append(f"{code}: PI cost sum = {cost} (must equal {spi})")
    ui.append({"code":code,"cost":cost})
print(json.dumps({"errors":errors,"forms_ui":ui}, ensure_ascii=False, indent=2))
sys.exit(0 if not errors else 1)
