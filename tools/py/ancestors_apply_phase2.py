#!/usr/bin/env python3
"""
Ancestors Phase 2 apply — rename + glossary integration.

Reads:
- data/core/ancestors/ancestors_rename_proposal_v2.yaml (297 entries with id_new + label_it/en + descriptions)
- data/core/traits/active_effects.yaml (290 wired ancestor entries)
- data/core/traits/glossary.json (existing glossary entries)

Writes:
- data/core/traits/active_effects.yaml (rename keys + add label_it/en/description_it)
- data/core/traits/glossary.json (additive: 297 ancestor entries)
- tests/services/enemyTagGate.test.js (rename references in-place)

Approach: text-based regex substitution preserves YAML formatting + provenance + comments.
ID mapping built by matching wired entry's `provenance.code` to proposal's `legacy_code`.

Phase 2 decisions: Q1=b (suffix codes) + Q2=B (full IT) + Q3=B (italianize ID base).

Usage: python tools/py/ancestors_apply_phase2.py [--dry-run]
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import OrderedDict

# ------------------------------------------------------------------ paths
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
PROPOSAL = os.path.join(ROOT, "data", "core", "ancestors", "ancestors_rename_proposal_v2.yaml")
ACTIVE_EFFECTS = os.path.join(ROOT, "data", "core", "traits", "active_effects.yaml")
GLOSSARY = os.path.join(ROOT, "data", "core", "traits", "glossary.json")
TEST_FILE = os.path.join(ROOT, "tests", "services", "enemyTagGate.test.js")


def parse_proposal_v2(path: str) -> list[dict]:
    """Minimal YAML parser for our v2 list — we control the writer so layout is fixed."""
    entries = []
    cur = None
    in_list = False
    with open(path, encoding="utf-8") as f:
        for ln in f:
            if ln.startswith("ancestors_rename_proposal:"):
                in_list = True
                continue
            if not in_list:
                continue
            stripped = ln.rstrip("\n")
            if stripped.startswith("  - id_old:"):
                if cur:
                    entries.append(cur)
                cur = {}
                _parse_field(cur, stripped[4:])
            elif stripped.startswith("    "):
                if cur is None:
                    continue
                _parse_field(cur, stripped[4:])
            elif stripped.strip() == "":
                continue
            else:
                # end of list
                break
    if cur:
        entries.append(cur)
    return entries


def _parse_field(d: dict, line: str) -> None:
    """Parse 'key: value' line. Strip surrounding quotes."""
    if ":" not in line:
        return
    k, _, v = line.partition(":")
    k = k.strip()
    v = v.strip()
    # strip quotes
    if v.startswith('"') and v.endswith('"'):
        v = v[1:-1].replace('\\"', '"').replace('\\\\', '\\')
    if k == "genetic":
        v = (v == "true")
    d[k] = v


def normalize_code(code: str) -> str:
    """Normalize wiki code for lookup: 'AB 01' -> 'AB 01', 'BB AB 14' -> 'BB AB 14'."""
    return re.sub(r"\s+", " ", code.strip())


def build_id_map(proposals: list[dict]) -> dict[str, dict]:
    """Map normalized legacy_code -> proposal entry (for active_effects rename lookup)."""
    return {normalize_code(p["legacy_code"]): p for p in proposals}


def parse_active_effects_ancestors(path: str) -> list[dict]:
    """Extract every ancestor block: trait_id + provenance.code + line span."""
    entries = []
    with open(path, encoding="utf-8") as f:
        lines = f.readlines()

    cur = None
    for i, ln in enumerate(lines):
        m = re.match(r"^  (ancestor_[a-z0-9_]+):\s*$", ln)
        if m:
            if cur:
                entries.append(cur)
            cur = {"id_old": m.group(1), "start_line": i, "code": None, "end_line": i}
        elif cur:
            mc = re.match(r"^      code:\s*\"?([^\"\n]+?)\"?\s*$", ln)
            if mc:
                cur["code"] = mc.group(1).strip()
            mb = re.match(r"^  ([a-z][a-z0-9_]+):\s*$", ln)
            if mb and not mb.group(1).startswith("ancestor_"):
                cur["end_line"] = i
                entries.append(cur)
                cur = None
    if cur:
        entries.append(cur)
    return entries


def rename_active_effects(
    src_path: str,
    id_old_to_new: dict[str, str],
    id_old_to_proposal: dict[str, dict],
    dry_run: bool = False,
) -> tuple[int, int]:
    """Rename trait keys in active_effects.yaml + inject label_it / label_en / description_it.
    Strategy:
    - Replace `^  <old_id>:` -> `^  <new_id>:`
    - Replace `log_tag: <old_id>` -> `log_tag: <new_id>`
    - For each renamed block, inject `label_it: ...` + `label_en: ...` after the trait header
      if those fields don't already exist.
    Returns: (renamed_keys, injected_labels)
    """
    with open(src_path, encoding="utf-8") as f:
        content = f.read()

    renamed = 0
    injected = 0

    for old_id, new_id in id_old_to_new.items():
        if old_id == new_id:
            continue
        # Replace key header
        old_key_pattern = re.compile(r"^(  )" + re.escape(old_id) + r"(:\s*)$", re.MULTILINE)
        if old_key_pattern.search(content):
            content = old_key_pattern.sub(r"\1" + new_id + r"\2", content)
            renamed += 1
        # Replace log_tag (string-level, no anchor needed)
        old_logtag = "log_tag: " + old_id
        new_logtag = "log_tag: " + new_id
        content = content.replace(old_logtag, new_logtag)

    # Inject label_it / label_en after each trait header that doesn't yet have them
    # Pattern: trait_id: \n    tier: ... → check if `label_it:` already exists in next ~20 lines
    for old_id, new_id in id_old_to_new.items():
        prop = id_old_to_proposal.get(old_id)
        if not prop:
            continue
        label_it = prop["label_it"]
        label_en = prop["label_en"]
        # Find block start
        header_pattern = re.compile(r"^(  )" + re.escape(new_id) + r"(:\s*)$", re.MULTILINE)
        m = header_pattern.search(content)
        if not m:
            continue
        # Check if label_it already in next 30 lines
        block_start = m.end()
        # find next trait or end-of-block by looking for "^  ancestor_" or "^  [a-z]+:" at indent 2
        next_trait_re = re.compile(r"\n  (?:ancestor_|[a-z][a-z0-9_]*:\s*\n)", re.MULTILINE)
        next_match = next_trait_re.search(content, block_start)
        block_end = next_match.start() if next_match else len(content)
        block = content[block_start:block_end]
        if "label_it:" in block:
            continue  # already injected

        # Build injection: after "<id>:\n", insert "    label_it: ...\n    label_en: ...\n"
        inject = f'\n    label_it: "{label_it}"\n    label_en: "{label_en}"'
        # Insert immediately after the header line newline
        insert_pos = m.end()
        content = content[:insert_pos] + inject + content[insert_pos:]
        injected += 1

    if not dry_run:
        # UTF-8 explicit + LF newline (CLAUDE.md encoding rule)
        with open(src_path, "w", encoding="utf-8", newline="\n") as f:
            f.write(content)

    return renamed, injected


def update_glossary(
    glossary_path: str,
    proposals: list[dict],
    id_old_to_new: dict[str, str],
    dry_run: bool = False,
) -> int:
    """Add 297 ancestor entries to glossary.json (additive, preserve existing keys)."""
    with open(glossary_path, encoding="utf-8") as f:
        glossary = json.load(f, object_pairs_hook=OrderedDict)

    traits = glossary.setdefault("traits", OrderedDict())

    added = 0
    # Build inverse map: code -> id_new (for non-wired 27 missing entries, just use proposal id_new)
    for prop in proposals:
        code = normalize_code(prop["legacy_code"])
        # For wired entries, glossary key = id used in active_effects (which is now id_new after rename)
        # For non-wired (27 missing), glossary key = proposal id_new directly
        glossary_key = prop["id_new"]
        if glossary_key in traits:
            continue
        traits[glossary_key] = OrderedDict([
            ("label_it", prop["label_it"]),
            ("label_en", prop["label_en"]),
            ("description_it", prop.get("description_it", "")),
            ("description_en", prop.get("description_en", "")),
        ])
        added += 1

    if not dry_run:
        with open(glossary_path, "w", encoding="utf-8", newline="\n") as f:
            json.dump(glossary, f, ensure_ascii=False, indent=2)
            f.write("\n")

    return added


def update_test_references(test_path: str, id_old_to_new: dict[str, str], dry_run: bool = False) -> int:
    """Replace ancestor IDs in tests/services/enemyTagGate.test.js."""
    with open(test_path, encoding="utf-8") as f:
        content = f.read()

    replaced = 0
    for old_id, new_id in id_old_to_new.items():
        # Match exact identifier in single quotes
        pattern_old = "'" + old_id + "'"
        pattern_new = "'" + new_id + "'"
        if pattern_old in content:
            count = content.count(pattern_old)
            content = content.replace(pattern_old, pattern_new)
            replaced += count
        # Also match without quotes (regression: ancestor_attack_fight_response in description text)
        # but ONLY in identifier context — skip casual occurrences
        # Use word-boundary regex
        pattern_word = re.compile(r"\b" + re.escape(old_id) + r"\b")
        # Avoid double-replacing already-quoted matches — check if not already replaced
        # Strategy: replace only in test description strings (after `'regression:` or in JSDoc)
        # For safety: just replace remaining word-boundary occurrences
        new_content, n = pattern_word.subn(new_id, content)
        if n > 0:
            content = new_content
            replaced += n

    if not dry_run:
        with open(test_path, "w", encoding="utf-8", newline="\n") as f:
            f.write(content)

    return replaced


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    # Load proposal v2
    proposals = parse_proposal_v2(PROPOSAL)
    print(f"loaded {len(proposals)} proposals from v2", file=sys.stderr)
    if len(proposals) != 297:
        print(f"WARN: expected 297 proposals, got {len(proposals)}", file=sys.stderr)
        return 1

    code_to_proposal = build_id_map(proposals)

    # Discover wired ancestor entries
    wired = parse_active_effects_ancestors(ACTIVE_EFFECTS)
    print(f"discovered {len(wired)} wired ancestor entries in active_effects.yaml", file=sys.stderr)

    # Build mapping old_id -> new_id by matching provenance.code
    id_old_to_new: dict[str, str] = {}
    id_old_to_proposal: dict[str, dict] = {}
    unmatched = []
    for w in wired:
        code = w["code"]
        if not code:
            unmatched.append(w["id_old"] + " (no code)")
            continue
        norm = normalize_code(code)
        prop = code_to_proposal.get(norm)
        if not prop:
            # Range codes "FR 02-03" / "BB FR 01-04": collapse to first code
            range_match = re.match(r"^(.+?)\s+(\d+)-(\d+)$", norm)
            if range_match:
                base = range_match.group(1)
                first_num = int(range_match.group(2))
                # Build "BB FR 02" or "FR 02" depending on prefix
                first_code = f"{base} {first_num:02d}"
                prop = code_to_proposal.get(first_code)
        if not prop:
            unmatched.append(f"{w['id_old']} (code={code})")
            continue
        new_id = prop["id_new"]
        id_old_to_new[w["id_old"]] = new_id
        id_old_to_proposal[w["id_old"]] = prop

    if unmatched:
        print(f"\nWARN: {len(unmatched)} wired entries unmatched:", file=sys.stderr)
        for u in unmatched:
            print(f"  - {u}", file=sys.stderr)

    print(f"\nMapping: {len(id_old_to_new)} old_id -> new_id", file=sys.stderr)

    # Sample mappings for verification
    sample_keys = list(id_old_to_new.keys())[:5]
    for k in sample_keys:
        print(f"  {k} -> {id_old_to_new[k]}", file=sys.stderr)

    # Apply rename to active_effects.yaml
    renamed, injected = rename_active_effects(
        ACTIVE_EFFECTS, id_old_to_new, id_old_to_proposal, dry_run=args.dry_run
    )
    print(f"\nactive_effects: renamed {renamed} keys, injected {injected} label_it/en blocks",
          file=sys.stderr)

    # Update glossary.json (additive)
    added = update_glossary(GLOSSARY, proposals, id_old_to_new, dry_run=args.dry_run)
    print(f"glossary: added {added} ancestor entries", file=sys.stderr)

    # Update test references
    test_replaced = update_test_references(TEST_FILE, id_old_to_new, dry_run=args.dry_run)
    print(f"tests: replaced {test_replaced} ancestor ID references", file=sys.stderr)

    if args.dry_run:
        print("\n[DRY RUN] no files modified", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
