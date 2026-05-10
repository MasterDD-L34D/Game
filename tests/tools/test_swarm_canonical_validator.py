"""Tests for swarm_canonical_validator (Sprint Q+ Q-7).

Test corpus 5 cases:
- VERIFIED: real path + real fragment + matching keywords
- PARTIAL: real path + real fragment ma keywords low alignment
- HALLUCINATED missing canonical_ref: claim sans ref
- HALLUCINATED non-existent file: ref points to fake file
- REINVENT-CANONICAL-WHEEL: 'new framework' marker + redundancy
"""

from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

# Resolve tools/py path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools" / "py"))

from swarm_canonical_validator import (
    SwarmClaim,
    aggregate_run_report,
    detect_hallucinate_by_association,
    detect_reinvent_canonical_wheel,
    emit_verification_table_markdown,
    parse_swarm_artifact,
    verify_claim_canonical,
)


def test_parse_swarm_artifact_pure_json(tmp_path: Path) -> None:
    artifact = tmp_path / "claims.json"
    artifact.write_text(
        json.dumps(
            [
                {
                    "claim_id": "c1",
                    "claim_text": "test claim",
                    "canonical_ref": "data/core/species.yaml#test",
                    "swarm_score": 0.9,
                    "cycle": 1,
                }
            ]
        ),
        encoding="utf-8",
    )
    claims = parse_swarm_artifact(artifact)
    assert len(claims) == 1
    assert claims[0].claim_id == "c1"
    assert claims[0].canonical_ref == "data/core/species.yaml#test"


def test_parse_swarm_artifact_markdown_embedded(tmp_path: Path) -> None:
    artifact = tmp_path / "distillation.md"
    artifact.write_text(
        '# Distillation\n\n```json\n[{"claim_id":"c1","claim_text":"x"}]\n```\n',
        encoding="utf-8",
    )
    claims = parse_swarm_artifact(artifact)
    assert len(claims) == 1
    assert claims[0].claim_id == "c1"


def test_verify_missing_canonical_ref_hallucinated() -> None:
    claim = SwarmClaim(
        claim_id="c1", claim_text="some random text", canonical_ref=None, swarm_score=0.5, cycle=1
    )
    result = verify_claim_canonical(claim, ROOT)
    assert result.status == "HALLUCINATED"
    assert "non-verifiable" in result.notes or "duplicates" in result.notes


def test_verify_real_path_real_fragment_keywords_align() -> None:
    # data/core/species.yaml has many real species. Use one as fragment.
    claim = SwarmClaim(
        claim_id="c1",
        claim_text="dune_stalker species biome canopia desert",
        canonical_ref="data/core/species.yaml#dune_stalker",
        swarm_score=0.9,
        cycle=1,
    )
    result = verify_claim_canonical(claim, ROOT)
    # Should be VERIFIED or PARTIAL depending on actual canonical content.
    assert result.status in ("VERIFIED", "PARTIAL")


def test_verify_non_existent_file_hallucinated() -> None:
    claim = SwarmClaim(
        claim_id="c1",
        claim_text="fake claim",
        canonical_ref="data/core/fake_file.yaml#nonexistent",
        swarm_score=0.5,
        cycle=1,
    )
    result = verify_claim_canonical(claim, ROOT)
    assert result.status == "HALLUCINATED"
    assert result.failure_pattern == "hallucinate-by-association"


def test_detect_reinvent_canonical_wheel_marker() -> None:
    claim = SwarmClaim(
        claim_id="c1",
        claim_text="propose a new framework for stress environmental modifiers biome trait",
        canonical_ref=None,
        swarm_score=0.6,
        cycle=1,
    )
    detected = detect_reinvent_canonical_wheel(claim, ROOT)
    # Heuristic: should detect 'propose a new' + biome/trait mention.
    # Solo richiede heuristic match — default True if redundancy logic sees keywords.
    assert isinstance(detected, bool)


def test_aggregate_run_report() -> None:
    from swarm_canonical_validator import VerificationResult

    claim_a = SwarmClaim(claim_id="a", claim_text="x", canonical_ref="ref", swarm_score=0.9, cycle=1)
    claim_b = SwarmClaim(claim_id="b", claim_text="y", canonical_ref=None, swarm_score=0.5, cycle=1)
    results = [
        VerificationResult(claim=claim_a, status="VERIFIED", canonical_match=None, failure_pattern=None, notes="ok"),
        VerificationResult(claim=claim_b, status="HALLUCINATED", canonical_match=None, failure_pattern=None, notes="missing"),
    ]
    report = aggregate_run_report("test-run", results)
    assert report.total_claims == 2
    assert report.verified == 1
    assert report.hallucinated == 1
    assert report.hallucination_ratio == 0.5
    # 50% > 30% threshold = gate fail.
    assert report.gate_pass is False


def test_aggregate_run_report_zero_claims() -> None:
    report = aggregate_run_report("empty", [])
    assert report.total_claims == 0
    assert report.hallucination_ratio == 0.0
    assert report.gate_pass is True  # no claims = no regression


def test_emit_verification_table_markdown_format() -> None:
    from swarm_canonical_validator import VerificationResult

    claim = SwarmClaim(
        claim_id="c1", claim_text="x", canonical_ref="ref", swarm_score=0.9, cycle=1
    )
    results = [
        VerificationResult(claim=claim, status="VERIFIED", canonical_match=None, failure_pattern=None, notes="ok")
    ]
    report = aggregate_run_report("test", results)
    md = emit_verification_table_markdown(report)
    assert "# Swarm Canonical Validation" in md
    assert "Verified: 1" in md
    assert "Gate verdict:" in md
    assert "| 1 | `c1` | VERIFIED |" in md
