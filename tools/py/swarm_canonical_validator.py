"""
swarm_canonical_validator.py — IMPLEMENTATION (post-Phase-B-accept Path γ)

✅ STATUS: PRODUCTION (Sprint Q+ Q-7 ship 2026-05-10 sera, ADR-2026-05-05
   Phase B Path γ ACCEPTED 2026-05-10 sera).

Purpose: cross-verification swarm artifact JSON claims vs canonical
         data/core/ Game prima merge. Closes Engine-LIVE-Surface-DEAD
         pattern recurrence per evo-swarm pipeline (vedi
         docs/museum/cards/evo-swarm-run-5-discarded-claims.md).

Gate criteria (master-dd verdict 2026-05-08 OD-022 IMPLICIT ACCEPT):
  - Reject merge if hallucination_ratio > 0.30 (run #5 = 0.54 oltre soglia)
  - Each claim must include `canonical_ref` field with path:line citation
  - Validator emit verification table embedded in distillation doc

Reference card: docs/museum/cards/evo-swarm-run-5-discarded-claims.md
                M-2026-05-08-001 (10 discarded items = test corpus)
Reference OD: OPEN_DECISIONS.md OD-022
Reference research: docs/research/2026-05-08-od-022-validator-pre-design.md
Reference ADR: docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md §13

CLI usage:
    python tools/py/swarm_canonical_validator.py \\
        --artifact docs/research/2026-05-XX-evo-swarm-run-N-distillation.md \\
        --canonical-root . \\
        --gate-threshold 0.30 \\
        --output docs/research/swarm_validation_latest.md
    # exit 0 = clean, 1 = hallucination_ratio > threshold (regression)
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal


ClaimStatus = Literal["VERIFIED", "PARTIAL", "HALLUCINATED", "REDUNDANT"]


@dataclass
class SwarmClaim:
    """Single swarm artifact claim parsed from JSON output."""

    claim_id: str
    claim_text: str
    canonical_ref: str | None  # Path:line citation or None if missing
    swarm_score: float  # 0-10 swarm-side accept score
    cycle: int


@dataclass
class VerificationResult:
    """Cross-verification verdict per claim."""

    claim: SwarmClaim
    status: ClaimStatus
    canonical_match: str | None  # Actual canonical fragment if found
    failure_pattern: str | None  # "hallucinate-by-association" / "reinvent-canonical-wheel" / None
    notes: str


@dataclass
class RunVerificationReport:
    """Aggregate report for a swarm run."""

    run_id: str
    total_claims: int
    verified: int
    partial: int
    hallucinated: int
    redundant: int
    deferred: int
    hallucination_ratio: float  # hallucinated / total
    gate_pass: bool  # ratio <= GATE_THRESHOLD
    results: list[VerificationResult]


GATE_THRESHOLD = 0.30  # OD-022 IMPLICIT ACCEPT 2026-05-08


def parse_swarm_artifact(artifact_path: Path) -> list[SwarmClaim]:
    """Parse swarm artifact JSON file → list claims.

    Supports 2 formats:
    - Pure JSON array: [{ claim_id, claim_text, canonical_ref?, swarm_score?, cycle? }, ...]
    - Markdown distillation con embedded JSON code block (```json ... ```)
    """
    if not artifact_path.exists():
        raise FileNotFoundError(f"Artifact non trovato: {artifact_path}")
    raw = artifact_path.read_text(encoding="utf-8")
    data = None
    # Try direct JSON first.
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        # Extract embedded JSON code block from markdown.
        match = re.search(r"```json\s*(\[.*?\])\s*```", raw, re.DOTALL)
        if match:
            data = json.loads(match.group(1))
        else:
            raise ValueError(f"No JSON content in {artifact_path}")
    if not isinstance(data, list):
        raise ValueError(f"Expected JSON array of claims, got {type(data).__name__}")
    claims = []
    for i, item in enumerate(data):
        if not isinstance(item, dict):
            continue
        claims.append(
            SwarmClaim(
                claim_id=str(item.get("claim_id") or f"claim-{i}"),
                claim_text=str(item.get("claim_text") or item.get("claim") or ""),
                canonical_ref=item.get("canonical_ref"),
                swarm_score=float(item.get("swarm_score", 0.0)),
                cycle=int(item.get("cycle", 0)),
            )
        )
    return claims


def _resolve_canonical_path(canonical_ref: str, root: Path) -> tuple[Path, str | None]:
    """Resolve `data/core/species.yaml#dune_stalker.biome_affinity` → (file, jq-like path).

    Returns (file_path, fragment_path_or_None). Fragment is dotted-key for
    YAML traversal o regex line-marker.
    """
    if "#" in canonical_ref:
        file_part, fragment = canonical_ref.split("#", 1)
    else:
        file_part, fragment = canonical_ref, None
    return (root / file_part).resolve(), fragment


def verify_claim_canonical(claim: SwarmClaim, canonical_root: Path) -> VerificationResult:
    """Cross-reference single claim vs data/core/ canonical.

    Verification flow:
    1. canonical_ref missing → HALLUCINATED (cannot verify)
    2. canonical_ref points to non-existent file → HALLUCINATED
    3. canonical_ref file exists ma fragment non match claim text keywords →
       PARTIAL (real path, claim diverges)
    4. canonical_ref file + fragment match → VERIFIED
    5. Detected pattern hallucinate-by-association OR reinvent-canonical-wheel
       → HALLUCINATED with failure_pattern annotation
    """
    if not claim.canonical_ref:
        # Check redundancy: claim text mention canonical concept already?
        if _is_redundant_with_canonical(claim, canonical_root):
            return VerificationResult(
                claim=claim,
                status="REDUNDANT",
                canonical_match=None,
                failure_pattern=None,
                notes="No canonical_ref ma claim text duplicates existing canonical concept",
            )
        if detect_reinvent_canonical_wheel(claim, canonical_root):
            return VerificationResult(
                claim=claim,
                status="HALLUCINATED",
                canonical_match=None,
                failure_pattern="reinvent-canonical-wheel",
                notes="No canonical_ref + propone framework esistente sotto altro nome",
            )
        return VerificationResult(
            claim=claim,
            status="HALLUCINATED",
            canonical_match=None,
            failure_pattern=None,
            notes="Missing canonical_ref — non-verifiable",
        )

    file_path, fragment = _resolve_canonical_path(claim.canonical_ref, canonical_root)
    if not file_path.exists():
        return VerificationResult(
            claim=claim,
            status="HALLUCINATED",
            canonical_match=None,
            failure_pattern="hallucinate-by-association",
            notes=f"canonical_ref points to non-existent file: {file_path}",
        )

    content = file_path.read_text(encoding="utf-8", errors="replace")
    if fragment:
        # Try exact fragment lookup (substring match — pragmatic vs full YAML parse).
        if fragment.lower() in content.lower():
            # Match fragment present. Now verify claim text keywords actually align.
            claim_keywords = _extract_keywords(claim.claim_text)
            canonical_excerpt = _extract_excerpt_around(content, fragment, window=400)
            keyword_overlap = sum(
                1 for kw in claim_keywords if kw.lower() in canonical_excerpt.lower()
            )
            ratio = keyword_overlap / max(len(claim_keywords), 1)
            if ratio >= 0.5:
                return VerificationResult(
                    claim=claim,
                    status="VERIFIED",
                    canonical_match=canonical_excerpt[:200],
                    failure_pattern=None,
                    notes=f"Fragment match + {keyword_overlap}/{len(claim_keywords)} keywords align",
                )
            return VerificationResult(
                claim=claim,
                status="PARTIAL",
                canonical_match=canonical_excerpt[:200],
                failure_pattern="hallucinate-by-association",
                notes=f"Fragment exists ma claim keywords align solo {keyword_overlap}/{len(claim_keywords)}",
            )
        return VerificationResult(
            claim=claim,
            status="HALLUCINATED",
            canonical_match=None,
            failure_pattern="hallucinate-by-association",
            notes=f"Fragment '{fragment}' non trovato in {file_path.name}",
        )

    return VerificationResult(
        claim=claim,
        status="VERIFIED",
        canonical_match=None,
        failure_pattern=None,
        notes=f"Path-only ref valid: {file_path.name}",
    )


def _extract_keywords(text: str) -> list[str]:
    """Estrai parole significative da claim text (>= 4 chars, no stopwords)."""
    stopwords = {
        "che", "the", "and", "with", "del", "delle", "una", "uno", "per",
        "como", "this", "that", "alla", "delle", "from", "into", "have",
    }
    words = re.findall(r"\w+", text.lower())
    return [w for w in words if len(w) >= 4 and w not in stopwords][:20]


def _extract_excerpt_around(content: str, marker: str, window: int = 400) -> str:
    """Estrai snippet ±window chars attorno marker (case-insensitive)."""
    lower = content.lower()
    idx = lower.find(marker.lower())
    if idx < 0:
        return content[:window]
    start = max(0, idx - window // 2)
    end = min(len(content), idx + window // 2)
    return content[start:end]


def _is_redundant_with_canonical(claim: SwarmClaim, root: Path) -> bool:
    """Heuristic: claim duplicates existing canonical concept."""
    keywords = _extract_keywords(claim.claim_text)
    if not keywords:
        return False
    # Check top-3 keywords against species/biomes/traits index
    sample_files = [
        root / "data/core/species.yaml",
        root / "data/core/biomes.yaml",
        root / "data/core/traits/active_effects.yaml",
    ]
    for fp in sample_files:
        if not fp.exists():
            continue
        content = fp.read_text(encoding="utf-8", errors="replace").lower()
        matches = sum(1 for kw in keywords[:5] if kw in content)
        if matches >= 3:
            return True
    return False


def detect_hallucinate_by_association(claim: SwarmClaim, canonical_root: Path) -> bool:
    """Pattern: real identifier + non-canonical attributes.

    Test corpus: 8 examples in M-2026-05-08-001 §"hallucinate-by-association".
    Heuristic: identifier extracted from claim text exists in canonical YAML
    ma adjacent attributes (biome/trait names) DON'T match canonical context.
    """
    if not claim.canonical_ref or "#" not in claim.canonical_ref:
        return False
    file_path, fragment = _resolve_canonical_path(claim.canonical_ref, canonical_root)
    if not file_path.exists() or not fragment:
        return False
    content = file_path.read_text(encoding="utf-8", errors="replace").lower()
    if fragment.lower() not in content:
        return False
    keywords = _extract_keywords(claim.claim_text)
    excerpt = _extract_excerpt_around(content, fragment, window=400)
    keyword_overlap = sum(1 for kw in keywords if kw.lower() in excerpt.lower())
    ratio = keyword_overlap / max(len(keywords), 1)
    return ratio < 0.5


def detect_reinvent_canonical_wheel(claim: SwarmClaim, canonical_root: Path) -> bool:
    """Pattern: propose new framework when canonical pre-existing.

    Test corpus: 2 examples in M-2026-05-08-001 §"reinvent-canonical-wheel"
    (e.g., stress_environmental new framework when hazard.stress_modifiers
    already exists in 20+ biomes).
    """
    new_framework_markers = [
        "new framework",
        "propose a new",
        "novel system",
        "introduce a",
        "create a new",
        "nuovo framework",
        "nuovo sistema",
    ]
    text_lower = claim.claim_text.lower()
    has_marker = any(m in text_lower for m in new_framework_markers)
    if not has_marker:
        return False
    return _is_redundant_with_canonical(claim, canonical_root)


def aggregate_run_report(
    run_id: str, results: list[VerificationResult]
) -> RunVerificationReport:
    """Aggregate per-claim results into run-level report."""
    total = len(results)
    verified = sum(1 for r in results if r.status == "VERIFIED")
    partial = sum(1 for r in results if r.status == "PARTIAL")
    hallucinated = sum(1 for r in results if r.status == "HALLUCINATED")
    redundant = sum(1 for r in results if r.status == "REDUNDANT")
    deferred = total - verified - partial - hallucinated - redundant
    ratio = hallucinated / total if total > 0 else 0.0
    return RunVerificationReport(
        run_id=run_id,
        total_claims=total,
        verified=verified,
        partial=partial,
        hallucinated=hallucinated,
        redundant=redundant,
        deferred=deferred,
        hallucination_ratio=ratio,
        gate_pass=ratio <= GATE_THRESHOLD,
        results=results,
    )


def emit_verification_table_markdown(report: RunVerificationReport) -> str:
    """Render report as markdown table embeddable in distillation doc."""
    lines = [
        f"# Swarm Canonical Validation — Run {report.run_id}",
        "",
        f"- Total claims: **{report.total_claims}**",
        f"- Verified: {report.verified} | Partial: {report.partial} | "
        f"Hallucinated: **{report.hallucinated}** | Redundant: {report.redundant} | "
        f"Deferred: {report.deferred}",
        f"- Hallucination ratio: **{report.hallucination_ratio:.1%}** "
        f"(gate threshold: {GATE_THRESHOLD:.0%})",
        f"- Gate verdict: {'✅ PASS' if report.gate_pass else '❌ FAIL'}",
        "",
        "## Per-claim results",
        "",
        "| # | Claim ID | Status | Canonical ref | Failure pattern | Notes |",
        "|---|---|:-:|---|:-:|---|",
    ]
    for i, r in enumerate(report.results, 1):
        canonical = r.claim.canonical_ref or "_missing_"
        failure = r.failure_pattern or "—"
        notes = r.notes.replace("|", "\\|").replace("\n", " ")[:120]
        lines.append(
            f"| {i} | `{r.claim.claim_id}` | {r.status} | `{canonical}` | {failure} | {notes} |"
        )
    return "\n".join(lines) + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Swarm canonical validator")
    parser.add_argument("--artifact", required=True, type=Path, help="Swarm artifact JSON/MD")
    parser.add_argument(
        "--canonical-root", required=True, type=Path, help="Game repo root"
    )
    parser.add_argument(
        "--gate-threshold",
        type=float,
        default=GATE_THRESHOLD,
        help=f"Hallucination ratio max (default {GATE_THRESHOLD})",
    )
    parser.add_argument("--output", type=Path, help="Markdown report output path")
    parser.add_argument("--run-id", default="unknown", help="Run ID label")
    args = parser.parse_args(argv)

    threshold = args.gate_threshold

    try:
        claims = parse_swarm_artifact(args.artifact)
    except (FileNotFoundError, ValueError) as err:
        print(f"::error::artifact parse failed: {err}", file=sys.stderr)
        return 2
    if not claims:
        print(f"::warning::no claims parsed from {args.artifact}", file=sys.stderr)
        return 0

    results = [verify_claim_canonical(c, args.canonical_root) for c in claims]
    report = aggregate_run_report(args.run_id, results)
    # Override gate_pass per-CLI threshold (vs default GATE_THRESHOLD constant).
    report.gate_pass = report.hallucination_ratio <= threshold
    md = emit_verification_table_markdown(report)
    # Encode-safe stdout per Windows cp1252 (emoji ASCII fallback).
    try:
        sys.stdout.write(md)
    except UnicodeEncodeError:
        sys.stdout.buffer.write(md.encode("utf-8"))
    if args.output:
        args.output.write_text(md, encoding="utf-8")

    if not report.gate_pass:
        print(
            f"::error::hallucination ratio {report.hallucination_ratio:.1%} > "
            f"threshold {threshold:.0%}",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
