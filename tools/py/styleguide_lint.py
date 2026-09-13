#!/usr/bin/env python3
"""Style guide consistency linter.

Valida coerenza cross-document tra:
- docs/core/41-ART-DIRECTION.md (palette matrix + colori funzionali)
- docs/core/42-STYLE-GUIDE-UI.md (design tokens CSS)
- docs/planning/encounters/*.yaml (visual_mood references)

Check rules:
1. Hex validity: ogni valore hex in 41-AD + 42-SG è valid (#RRGGBB o #RRGGBBAA)
2. Functional color parity: colori funzionali 41-AD presenti come token in 42-SG
3. Encounter visual_mood.mood_tag: valore tra quelli definiti in 41-AD mood column
4. Encounter visual_mood.lighting: valore tra quelli definiti in 41-AD light column
5. Encounter visual_mood.accent_override: hex valid

Exit codes:
- 0: all checks pass
- 1: violations found
- 2: missing file / parse error

Usage:
  python3 tools/py/styleguide_lint.py
  python3 tools/py/styleguide_lint.py --strict  # fail su warning
  python3 tools/py/styleguide_lint.py --json-out reports/styleguide_lint.json
"""

import argparse
import json
import re
import sys
from pathlib import Path

try:
    import yaml  # type: ignore
except ImportError:
    print("ERROR: PyYAML richiesto. Installa: pip install pyyaml", flush=True)
    sys.exit(2)


ROOT = Path(__file__).resolve().parent.parent.parent
ART_DIRECTION = ROOT / "docs" / "core" / "41-ART-DIRECTION.md"
STYLE_GUIDE = ROOT / "docs" / "core" / "42-STYLE-GUIDE-UI.md"
ENCOUNTERS_DIR = ROOT / "docs" / "planning" / "encounters"

HEX_PATTERN = re.compile(r"#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?")
HEX_STRICT = re.compile(r"^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$")


def extract_hex_values(text):
    """Estrae tutti i hex color usati nel testo."""
    return set(HEX_PATTERN.findall(text))


def extract_mood_tags(art_direction_text):
    """Parse 41-AD palette matrix per estrarre mood_tag validi.

    Cerca la table con header 'Mood' e raccoglie valori colonna mood.
    Semplici normalize: lowercase, spaces → underscore, virgole rimosse.
    """
    tags = set()
    in_table = False
    mood_col = -1
    for line in art_direction_text.splitlines():
        if "## Palette matrix" in line:
            in_table = True
            continue
        if in_table and line.startswith("##"):
            break
        if in_table and line.startswith("|"):
            cells = [c.strip() for c in line.strip("|").split("|")]
            if mood_col < 0 and any("Mood" in c for c in cells):
                for i, c in enumerate(cells):
                    if "Mood" in c:
                        mood_col = i
                        break
                continue
            if mood_col >= 0 and mood_col < len(cells):
                v = cells[mood_col].strip()
                if v and not v.startswith(":") and not v.startswith("---"):
                    for token in v.split(","):
                        token = token.strip().lower()
                        if token:
                            tags.add(token.replace(" ", "_"))
    return tags


def extract_lighting_tags(art_direction_text):
    """Parse 41-AD palette matrix colonna Luce."""
    tags = set()
    in_table = False
    light_col = -1
    for line in art_direction_text.splitlines():
        if "## Palette matrix" in line:
            in_table = True
            continue
        if in_table and line.startswith("##"):
            break
        if in_table and line.startswith("|"):
            cells = [c.strip() for c in line.strip("|").split("|")]
            if light_col < 0 and any("Luce" in c for c in cells):
                for i, c in enumerate(cells):
                    if "Luce" in c:
                        light_col = i
                        break
                continue
            if light_col >= 0 and light_col < len(cells):
                v = cells[light_col].strip()
                if v and not v.startswith(":") and not v.startswith("---"):
                    normalized = v.lower().replace(",", "").replace(" ", "_").replace("'", "_")
                    if normalized:
                        tags.add(normalized)
    return tags


def extract_css_tokens(style_guide_text):
    """Parse 42-SG per estrarre CSS custom properties (--token-name)."""
    tokens = set()
    # Match --token-name (alphanumeric + dash)
    for match in re.finditer(r"--[a-z][a-z0-9-]+", style_guide_text):
        tokens.add(match.group(0))
    return tokens


def lint_hex_validity(path, text):
    """Rule 1: hex syntax valid."""
    violations = []
    for match in HEX_PATTERN.finditer(text):
        hex_val = match.group(0)
        if not HEX_STRICT.match(hex_val):
            violations.append({
                "rule": "hex_validity",
                "path": str(path.relative_to(ROOT)),
                "value": hex_val,
                "message": f"hex '{hex_val}' non valido (atteso #RRGGBB o #RRGGBBAA)",
            })
    return violations


def lint_encounter_visual_mood(mood_tags, lighting_tags):
    """Rule 3-5: visual_mood consistency."""
    violations = []
    if not ENCOUNTERS_DIR.exists():
        return violations
    for yaml_path in sorted(ENCOUNTERS_DIR.glob("enc_*.yaml")):
        try:
            data = yaml.safe_load(yaml_path.read_text(encoding="utf-8"))
        except Exception as e:
            violations.append({
                "rule": "encounter_parse",
                "path": str(yaml_path.relative_to(ROOT)),
                "message": f"parse error: {e}",
            })
            continue
        vm = data.get("visual_mood")
        if not isinstance(vm, dict):
            continue  # opzionale, no-op
        mood = vm.get("mood_tag")
        light = vm.get("lighting")
        accent = vm.get("accent_override")
        if mood and mood_tags and mood not in mood_tags:
            violations.append({
                "rule": "visual_mood_tag_unknown",
                "path": str(yaml_path.relative_to(ROOT)),
                "value": mood,
                "message": f"mood_tag '{mood}' non trovato in 41-AD palette matrix (valid: {sorted(mood_tags)[:5]}...)",
            })
        if light and lighting_tags and light not in lighting_tags:
            violations.append({
                "rule": "visual_mood_lighting_unknown",
                "path": str(yaml_path.relative_to(ROOT)),
                "value": light,
                "message": f"lighting '{light}' non trovato in 41-AD palette matrix (valid: {sorted(lighting_tags)[:5]}...)",
            })
        if accent and not HEX_STRICT.match(accent):
            violations.append({
                "rule": "visual_mood_accent_invalid",
                "path": str(yaml_path.relative_to(ROOT)),
                "value": accent,
                "message": f"accent_override '{accent}' hex non valido",
            })
    return violations


def lint_functional_color_parity(ad_text, sg_text):
    """Rule 2: colori funzionali 41-AD sono referenziati come token in 42-SG."""
    violations = []
    # Hex values appearing in 41-AD §Colori funzionali
    ad_func_hex = set()
    capture = False
    for line in ad_text.splitlines():
        if "Colori funzionali" in line:
            capture = True
            continue
        if capture and line.startswith("## "):
            break
        if capture:
            for h in HEX_PATTERN.findall(line):
                ad_func_hex.add(h.lower())
    sg_hex = {h.lower() for h in HEX_PATTERN.findall(sg_text)}
    missing = ad_func_hex - sg_hex
    for h in sorted(missing):
        # Match 6-digit prefix se 8-digit
        h6 = h[:7]
        if h6 in sg_hex or h6 in {x[:7] for x in sg_hex}:
            continue
        violations.append({
            "rule": "functional_color_missing_in_sg",
            "path": "docs/core/42-STYLE-GUIDE-UI.md",
            "value": h,
            "message": f"hex '{h}' in 41-AD Colori funzionali non referenziato in 42-SG design tokens",
        })
    return violations


def run_lint(strict=False):
    report = {"violations": [], "warnings": [], "stats": {}}

    if not ART_DIRECTION.exists():
        report["violations"].append({
            "rule": "file_missing",
            "path": str(ART_DIRECTION.relative_to(ROOT)),
            "message": "41-ART-DIRECTION.md non trovato",
        })
        return report, 2
    if not STYLE_GUIDE.exists():
        report["violations"].append({
            "rule": "file_missing",
            "path": str(STYLE_GUIDE.relative_to(ROOT)),
            "message": "42-STYLE-GUIDE-UI.md non trovato",
        })
        return report, 2

    ad_text = ART_DIRECTION.read_text(encoding="utf-8")
    sg_text = STYLE_GUIDE.read_text(encoding="utf-8")

    # Rule 1: hex validity
    report["violations"].extend(lint_hex_validity(ART_DIRECTION, ad_text))
    report["violations"].extend(lint_hex_validity(STYLE_GUIDE, sg_text))

    # Rule 2: functional color parity (warning, no hard fail)
    parity = lint_functional_color_parity(ad_text, sg_text)
    if strict:
        report["violations"].extend(parity)
    else:
        report["warnings"].extend(parity)

    # Rule 3-5: encounter visual_mood
    mood_tags = extract_mood_tags(ad_text)
    lighting_tags = extract_lighting_tags(ad_text)
    report["violations"].extend(lint_encounter_visual_mood(mood_tags, lighting_tags))

    report["stats"] = {
        "ad_hex_found": len(extract_hex_values(ad_text)),
        "sg_hex_found": len(extract_hex_values(sg_text)),
        "sg_css_tokens": len(extract_css_tokens(sg_text)),
        "mood_tags_41ad": len(mood_tags),
        "lighting_tags_41ad": len(lighting_tags),
        "encounters_scanned": len(list(ENCOUNTERS_DIR.glob("enc_*.yaml"))) if ENCOUNTERS_DIR.exists() else 0,
    }

    exit_code = 1 if report["violations"] else 0
    return report, exit_code


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--strict", action="store_true", help="Treat warnings as violations")
    ap.add_argument("--json-out", default=None, help="Write report to JSON file")
    args = ap.parse_args()

    report, exit_code = run_lint(strict=args.strict)

    print(f"=== styleguide lint report ===", flush=True)
    print(f"Stats: {json.dumps(report['stats'], indent=2)}", flush=True)
    if report["violations"]:
        print(f"\nVIOLATIONS ({len(report['violations'])}):", flush=True)
        for v in report["violations"]:
            print(f"  [{v['rule']}] {v['path']}: {v['message']}", flush=True)
    if report["warnings"]:
        print(f"\nWARNINGS ({len(report['warnings'])}):", flush=True)
        for v in report["warnings"]:
            print(f"  [{v['rule']}] {v['path']}: {v['message']}", flush=True)

    if not report["violations"] and not report["warnings"]:
        print("\nOK: all rules pass", flush=True)

    if args.json_out:
        out_path = Path(args.json_out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"\nWrote {out_path}", flush=True)

    return exit_code


if __name__ == "__main__":
    sys.exit(main())
