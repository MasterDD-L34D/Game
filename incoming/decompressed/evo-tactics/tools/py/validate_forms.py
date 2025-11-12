#!/usr/bin/env python3
import sys, yaml, json

def load_yaml(path):
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def main(path="data/forms.yaml"):
    spec = load_yaml(path)
    errors, warnings = [], []

    if "global" not in spec or "starting_pi_points" not in spec["global"]:
        errors.append("missing global.starting_pi_points")
        spi = 7
    else:
        spi = int(spec["global"]["starting_pi_points"])
        if spi <= 0: errors.append("starting_pi_points must be > 0")

    pcat = spec.get("packages_catalog", [])
    pidx = {p["id"]: p for p in pcat if "id" in p}
    if not pidx:
        errors.append("packages_catalog empty or invalid")

    seen = set()
    ui = []
    for f in spec.get("forms", []):
        code = f.get("code")
        if not code:
            errors.append("form without code")
            continue
        if code in seen:
            errors.append(f"duplicate form code {code}")
        seen.add(code)

        bias = f.get("axes_bias", {})
        for k,v in bias.items():
            try:
                fv = float(v)
                if fv < -0.10 or fv > 0.10:
                    warnings.append(f"{code}: axes_bias.{k} out of range [-0.10,0.10]: {v}")
            except Exception:
                errors.append(f"{code}: axes_bias.{k} not numeric")

        pil = list(f.get("starting_pi", [])) + list(f.get("starting_pi_extra", []))
        if not pil:
            errors.append(f"{code}: no starting_pi defined")
            continue
        cost = 0
        for pid in pil:
            if pid not in pidx:
                errors.append(f"{code}: unknown package '{pid}'")
                continue
            c = int(pidx[pid].get("cost", 0))
            if c <= 0:
                errors.append(f"{code}: package '{pid}' has invalid cost {c}")
            cost += c
        if cost != spi:
            errors.append(f"{code}: PI cost sum = {cost} (must equal {spi})")

        ui.append({
            "code": code,
            "innate": f.get("innate",""),
            "pi_packages": pil,
            "pi_cost_total": cost
        })

    report = {"file": path, "errors": errors, "warnings": warnings, "forms_ui": ui}
    print(json.dumps(report, ensure_ascii=False, indent=2))
    sys.exit(0 if not errors else 1)

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv)>1 else "data/forms.yaml"
    main(path)
