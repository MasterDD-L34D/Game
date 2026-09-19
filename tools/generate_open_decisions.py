#!/usr/bin/env python3
"""Generate the OPEN_DECISIONS.md "Aperte" index from per-OD inline metadata (derive-don't-maintain).

Anti-drift (anti-pattern #19): the "Aperte" list is a GENERATED projection of each OD section's
machine-readable comment (`<!-- od id=… status=… -->`), injected between markers. Hand prose lives
OUTSIDE the markers and is preserved verbatim. A CI `git diff --exit-code` gate (R1) makes the
open-list impossible to drift: a section marked `status=resolved` is auto-excluded, so you can no
longer leave a resolved OD sitting in "Aperte".

Design: docs/superpowers/specs/2026-05-31-open-decisions-projection-design.md
- Source of truth = the `<!-- od … -->` comment under each `### [OD-…]` heading (the heading `✅`
  is human decoration, NOT read here).
- Generated block = a table between `<!-- gen:od-open -->` … `<!-- /gen:od-open -->`.
- Deterministic: stable sort (OD number asc) -> clean diffs. Prettier-aligned columns so prettier
  --write is a no-op (no fight with the fail-on-diff gate).

Checks (run by --check, alongside the R1 diff gate):
- R2 (WARN): status=open with governed_by=ADR-NNN whose status is Accepted/Superseded -> verify.
- R3 (WARN): status=resolved without resolved_by.
- R4 (ERROR): duplicate id; malformed id (not OD-NNN shape); comment id != heading id; comment without a preceding OD heading.
- R5 (WARN): heading `✅` presence disagrees with comment status (cosmetic).
- R6 (ERROR): id ends `-original-archive` XOR status=archived (must match both ways).
- R7 (ERROR): an OD heading with no adjacent <!-- od ... --> comment (else its open decision is silently omitted from the index).

Usage:
    python tools/generate_open_decisions.py            # rewrite OPEN_DECISIONS.md in place
    python tools/generate_open_decisions.py --check    # exit 1 if out of sync or any ERROR (CI gate)
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

# reuse status normalization from the DECISIONS_LOG generator (no duplication)
sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate_decisions_log import ADR_DIR, adr_status, parse_frontmatter  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[1]
OD_PATH = REPO_ROOT / "OPEN_DECISIONS.md"
BEGIN = "<!-- gen:od-open -->"
END = "<!-- /gen:od-open -->"

HEADING_RE = re.compile(r"^### \[(OD-[0-9.]+(?:-original-archive)?)\]\s*(.*)$")
COMMENT_RE = re.compile(r"^<!--\s*od\s+(.*?)\s*-->\s*$")
# key=value with optional double-quoted value
KV_RE = re.compile(r'(\w+)=(?:"([^"]*)"|(\S+))')
ADR_REF_RE = re.compile(r"ADR-\d{4}(?:-\d{2}){0,2}[A-Za-z0-9-]*")
PR_REF_RE = re.compile(r"PR #\d+|#\d+")
LIVELLO_RE = re.compile(r"^- \*\*Livello\*\*:\s*(.+?)\s*$")

VALID_STATUS = {"open", "resolved", "archived"}


class ODRecord:
    __slots__ = (
        "id",
        "status",
        "resolved_by",
        "governed_by",
        "title",
        "anchor",
        "livello",
        "ref",
        "heading_has_check",
        "comment_line",
    )

    def __init__(self, **kw):
        for k in self.__slots__:
            setattr(self, k, kw.get(k))


def _heading_title(raw: str) -> str:
    """Heading text minus a trailing `✅ …` decoration and trailing date noise."""
    # cut at the first status decoration marker
    title = re.split("✅|⚠️?", raw, maxsplit=1)[0].strip()
    # drop a trailing " - ..." tail (em-dash separated) if it duplicates the resolution prose
    title = re.split("\\s+—\\s+", title, maxsplit=1)[0].strip()
    return title or raw.strip()


def _anchor(heading_text: str) -> str:
    """GitHub-slugger anchor for the FULL heading text (after `### `), incl. the `[OD-NNN] … — tail`.
    Faithful to github-slugger: lowercase, strip punctuation (keep \\w/space/hyphen), each space ->
    hyphen WITHOUT collapsing (so `verdict — day` -> `verdict--day`, matching GitHub)."""
    slug = heading_text.strip().lower()
    slug = re.sub(r"[^\w\s-]", "", slug, flags=re.UNICODE)
    slug = re.sub(r"\s", "-", slug)
    return slug


def parse_records(text: str) -> tuple[list[ODRecord], list[str]]:
    """Parse OD records from heading+comment pairs. Returns (records, errors)."""
    lines = text.splitlines()
    records: list[ODRecord] = []
    errors: list[str] = []
    seen_ids: set[str] = set()
    covered: set[int] = set()  # heading line-nums that have an adjacent od-comment (R7)

    # index heading lines
    headings: dict[int, tuple[str, str, bool, str]] = {}
    heading_order: list[int] = []
    for i, ln in enumerate(lines):
        m = HEADING_RE.match(ln)
        if m:
            full = ln[4:] if ln.startswith("### ") else ln  # text after "### " for the anchor
            headings[i] = (m.group(1), _heading_title(m.group(2)), "✅" in ln, full)
            heading_order.append(i)

    for i, ln in enumerate(lines):
        cm = COMMENT_RE.match(ln)
        if not cm:
            continue
        fields = {k: (q or u) for k, q, u in KV_RE.findall(cm.group(1))}
        if "id" not in fields or "status" not in fields:
            errors.append(f"R4 ERROR L{i+1}: malformed od-comment (need id+status): {ln.strip()}")
            continue
        # nearest preceding heading
        prev = [h for h in heading_order if h < i]
        if not prev or (i - prev[-1]) > 3:
            errors.append(f"R4 ERROR L{i+1}: od-comment {fields['id']} has no OD heading above it")
            continue
        h_line = prev[-1]
        covered.add(h_line)  # this heading has an adjacent od-comment (R7 satisfied)
        h_id, h_title, h_check, h_full = headings[h_line]
        od_id = fields["id"]
        status = fields["status"]
        # R4: id must match the OD-NNN shape AND equal its heading id (a typo'd comment id must
        # not become a canonical row, e.g. `id=oops` under `### [OD-100]`).
        if not re.fullmatch(r"OD-[0-9.]+(?:-original-archive)?", od_id):
            errors.append(f"R4 ERROR L{i+1}: malformed id '{od_id}' (expected OD-NNN)")
            continue
        if od_id != h_id:
            errors.append(f"R4 ERROR L{i+1}: comment id '{od_id}' != heading id '{h_id}'")
            continue
        if status not in VALID_STATUS:
            errors.append(f"R4 ERROR L{i+1}: {od_id} invalid status '{status}'")
            continue
        if od_id in seen_ids:
            errors.append(f"R4 ERROR L{i+1}: duplicate id {od_id}")
            continue
        seen_ids.add(od_id)

        # section bound: this comment -> next OD heading
        next_h = next((h for h in heading_order if h > h_line), len(lines))
        section = lines[i + 1 : next_h]
        livello = "—"
        for s in section:
            lm = LIVELLO_RE.match(s)
            if lm:
                livello = lm.group(1)
                break
        # short ref: prefer explicit fields, else first ADR/PR token in-section
        ref = "—"
        for src in (fields.get("resolved_by", ""), fields.get("governed_by", "")):
            mref = ADR_REF_RE.search(src) or PR_REF_RE.search(src)
            if mref:
                ref = mref.group(0)
                break
        if ref == "—":
            for s in section:
                mref = ADR_REF_RE.search(s) or PR_REF_RE.search(s)
                if mref:
                    ref = mref.group(0)
                    break

        records.append(
            ODRecord(
                id=od_id,
                status=status,
                resolved_by=fields.get("resolved_by"),
                governed_by=fields.get("governed_by"),
                title=h_title,
                anchor=_anchor(h_full),
                livello=livello,
                ref=ref,
                heading_has_check=h_check,
                comment_line=i + 1,
            )
        )

    # R7: every OD heading must carry an adjacent <!-- od ... --> comment. Without this, a new
    # `### [OD-033]` whose author forgot the metadata line is silently skipped (the loop only scans
    # comments) -> --check passes + the open decision is omitted from the index = the exact
    # stale/missing-index drift this gate prevents.
    for h_line in heading_order:
        if h_line not in covered:
            errors.append(
                f"R7 ERROR L{h_line+1}: OD heading {headings[h_line][0]} has no adjacent <!-- od ... --> metadata"
            )

    return records, errors


def _od_sort_key(od_id: str) -> tuple[int, str]:
    m = re.search(r"OD-(\d+)", od_id)
    return (int(m.group(1)) if m else 9999, od_id)


def render_table(records: list[ODRecord]) -> str:
    """Prettier-aligned GFM table of status=open records (columns padded to max cell width)."""
    open_recs = sorted((r for r in records if r.status == "open"), key=lambda r: _od_sort_key(r.id))
    header = ["OD", "Titolo", "Livello", "Ref"]
    rows = []
    for r in open_recs:
        link = f"[{r.id}](#{r.anchor})"
        rows.append([link, r.title.replace("|", "\\|"), (r.livello or "—").replace("|", "\\|"), r.ref or "—"])
    # column widths (min 3 for the --- separator), prettier-style
    widths = [max(len(header[c]), 3, *(len(row[c]) for row in rows)) if rows else max(len(header[c]), 3) for c in range(4)]

    def fmt(cells: list[str]) -> str:
        return "| " + " | ".join(cells[c].ljust(widths[c]) for c in range(4)) + " |"

    out = [
        "_Generato da `tools/generate_open_decisions.py`. NON editare a mano: edita i comment "
        "`<!-- od … -->` di ogni sezione e rigenera._",
        "",
        fmt(header),
        "| " + " | ".join("-" * widths[c] for c in range(4)) + " |",
    ]
    out.extend(fmt(row) for row in rows)
    return "\n".join(out)


def build_block(records: list[ODRecord]) -> str:
    # blank lines after BEGIN / before END match prettier's markdown formatting, so `prettier
    # --write` is a no-op on the block and never fights the fail-on-diff gate (#2489 gotcha).
    return f"{BEGIN}\n\n{render_table(records)}\n\n{END}"


def apply(text: str, block: str) -> str:
    if BEGIN in text and END in text:
        pre = text.split(BEGIN, 1)[0]
        post = text.split(END, 1)[1]
        return f"{pre}{block}{post}"
    raise SystemExit("OPEN_DECISIONS.md: markers <!-- gen:od-open --> not found (run migration first)")


def validate(records: list[ODRecord], parse_errors: list[str]) -> tuple[list[str], list[str]]:
    """Return (errors, warns) from R2-R6 (R1 = diff, handled in main)."""
    errors = list(parse_errors)
    warns: list[str] = []
    for r in records:
        is_archive = r.id.endswith("-original-archive")
        # R6 archive coherence (both directions)
        if is_archive != (r.status == "archived"):
            errors.append(
                f"R6 ERROR L{r.comment_line}: {r.id} archive-suffix={is_archive} but status={r.status} (must match)"
            )
        # R3 resolved without ref
        if r.status == "resolved" and not r.resolved_by:
            warns.append(f"R3 WARN L{r.comment_line}: {r.id} status=resolved without resolved_by")
        # R5 marker coherence (cosmetic)
        if r.status == "resolved" and not r.heading_has_check:
            warns.append(f"R5 WARN L{r.comment_line}: {r.id} status=resolved but heading has no check-mark")
        if r.status == "open" and r.heading_has_check:
            warns.append(f"R5 WARN L{r.comment_line}: {r.id} status=open but heading has a check-mark")
        # R2 open governed_by an accepted ADR
        if r.status == "open" and r.governed_by:
            mref = ADR_REF_RE.search(r.governed_by)
            if mref:
                adr_file = ADR_DIR / f"{mref.group(0)}.md"
                if not adr_file.exists():
                    cands = list(ADR_DIR.glob(f"{mref.group(0)}*.md"))
                    adr_file = cands[0] if cands else adr_file
                if adr_file.exists():
                    st = adr_status(parse_frontmatter(adr_file.read_text(encoding="utf-8-sig")))
                    if st in ("Accepted", "Superseded"):
                        warns.append(
                            f"R2 WARN L{r.comment_line}: {r.id} status=open but governed_by {mref.group(0)} is {st} - verify if actually resolved"
                        )
    return errors, warns


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true", help="exit 1 if out of sync or any ERROR (CI gate)")
    args = ap.parse_args()

    current = OD_PATH.read_text(encoding="utf-8-sig")
    records, parse_errors = parse_records(current)
    errors, warns = validate(records, parse_errors)
    block = build_block(records)
    updated = apply(current, block)

    n_open = sum(1 for r in records if r.status == "open")
    n_res = sum(1 for r in records if r.status == "resolved")
    n_arch = sum(1 for r in records if r.status == "archived")
    summary = f"{len(records)} OD ({n_open} open, {n_res} resolved, {n_arch} archived)"

    for w in warns:
        print(f"[open-decisions] {w}", file=sys.stderr)
    for e in errors:
        print(f"[open-decisions] {e}", file=sys.stderr)

    if args.check:
        rc = 0
        if errors:
            print(f"[open-decisions] {len(errors)} ERROR(s) - fix before merge", file=sys.stderr)
            rc = 1
        if updated != current:
            print(
                f"[open-decisions] OUT OF SYNC ({summary}). Run: python tools/generate_open_decisions.py",
                file=sys.stderr,
            )
            rc = 1
        if rc == 0:
            print(f"[open-decisions] in sync + valid ({summary})")
        return rc

    if errors:
        # still regenerate the block, but signal the ERRORs loudly (CI --check is the hard gate)
        print(f"[open-decisions] WARN: {len(errors)} ERROR(s) present (see above) - fix the comments", file=sys.stderr)
    if updated != current:
        OD_PATH.write_text(updated, encoding="utf-8")
        print(f"[open-decisions] regenerated ({summary})")
    else:
        print(f"[open-decisions] no change ({summary})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
