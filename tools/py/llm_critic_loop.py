#!/usr/bin/env python3
"""LLM-as-critic balance tune loop — Tier E quick win.

Source: docs/research/2026-04-26-tier-e-extraction-matrix.md #8 LLM-as-critic.
Pattern: balance loop "propose tune → simulate → LLM critique outcome →
propose new tune → re-run". Sostituisce manuale eyeball "iter1 96% → bump hp +3"
con loop auto-iterativo capped + user gate before apply.

Iterazione:
    1. Run calibration batch (current tune)
    2. Format result + acceptance criteria → LLM prompt
    3. LLM proposes new tune (delta su trait_mechanics.yaml o equivalent)
    4. User gate: print proposal, require user confirm (--auto-accept skips gate)
    5. Apply tune (modifica YAML)
    6. Re-run + check convergence

Cap: max iterations 3 (default). User can override --max-iter.

Critic gate: never auto-apply tune without --auto-accept. Default: print + exit 0
con proposal, user re-runs with confirm.

Usage:
    python tools/py/llm_critic_loop.py \\
        --batch-cmd "python tools/py/batch_calibrate_hardcore07.py --json --quiet" \\
        --target-win-pct 30 --tolerance 5 \\
        --tune-file packs/evo_tactics_pack/data/balance/trait_mechanics.yaml \\
        --max-iter 3
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def has_anthropic() -> bool:
    try:
        import anthropic  # noqa: F401
        return True
    except ImportError:
        return False


def call_llm_critic(prompt: str, model: str = "claude-haiku-4-5-20251001") -> str:
    """Call Anthropic API. Returns text response."""
    if not has_anthropic():
        return "ERROR: anthropic SDK missing — pip install anthropic"
    import anthropic
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return "ERROR: ANTHROPIC_API_KEY env var not set"
    client = anthropic.Anthropic(api_key=api_key)
    msg = client.messages.create(
        model=model,
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text if msg.content else ""


def run_batch(cmd: str) -> dict:
    """Execute batch-cmd, parse JSON last line."""
    try:
        out = subprocess.check_output(cmd, shell=True, text=True, timeout=600)
        for line in reversed(out.strip().split("\n")):
            line = line.strip()
            if line.startswith("{"):
                return json.loads(line)
        return {"error": "no JSON in batch output"}
    except (subprocess.CalledProcessError, json.JSONDecodeError) as e:
        return {"error": str(e)}


def format_critic_prompt(result: dict, target_win_pct: float, tolerance: float, tune_file: str) -> str:
    win_pct = result.get("win_pct") or result.get("win_rate", 0) * 100
    return f"""Sei un balance critic per il gioco tattico Evo-Tactics. Obiettivo: convergere a {target_win_pct}% win rate (tolleranza ±{tolerance}%).

**Risultato batch corrente**:
```json
{json.dumps(result, indent=2)}
```

**File tune target**: {tune_file}

**Win rate attuale**: {win_pct}%
**Target**: {target_win_pct}% ± {tolerance}%
**Delta**: {round(win_pct - target_win_pct, 1)}% {('OVER (troppo facile)' if win_pct > target_win_pct + tolerance else 'UNDER (troppo difficile)' if win_pct < target_win_pct - tolerance else 'IN BAND')}

**Proponi UNA modifica chirurgica** al file `{tune_file}` per spostare il win rate verso il target.

**Formato risposta** (strict):
```
TUNE PROPOSAL:
file: {tune_file}
field: <trait_id.field_name>
current_value: <value>
proposed_value: <value>
rationale: <1 frase max>
```

Se win rate è IN BAND, rispondi `NO_TUNE_NEEDED`.

Anti-pattern: NON proporre rebalance globale (>3 trait), NON rimuovere abilità,
NON modificare schemi. Solo numeric tweaks chirurgici."""


def loop_iteration(
    iteration: int,
    batch_cmd: str,
    target_win_pct: float,
    tolerance: float,
    tune_file: str,
    auto_accept: bool,
) -> dict:
    print(f"\n=== Iteration {iteration} ===", file=sys.stderr)
    print(f"Run batch: {batch_cmd}", file=sys.stderr)
    result = run_batch(batch_cmd)
    if "error" in result:
        return {"iteration": iteration, "status": "batch_failed", "error": result["error"]}

    win_pct = result.get("win_pct") or result.get("win_rate", 0) * 100
    print(f"Win rate: {win_pct}%", file=sys.stderr)

    if abs(win_pct - target_win_pct) <= tolerance:
        return {
            "iteration": iteration,
            "status": "converged",
            "win_pct": win_pct,
            "target": target_win_pct,
        }

    prompt = format_critic_prompt(result, target_win_pct, tolerance, tune_file)
    print(f"LLM critic call (model claude-haiku-4-5)...", file=sys.stderr)
    proposal = call_llm_critic(prompt)
    print(f"\n--- LLM PROPOSAL ---\n{proposal}\n--- END ---\n", file=sys.stderr)

    if "NO_TUNE_NEEDED" in proposal:
        return {
            "iteration": iteration,
            "status": "no_tune_needed",
            "win_pct": win_pct,
            "proposal": proposal,
        }

    if not auto_accept:
        return {
            "iteration": iteration,
            "status": "proposal_pending_user",
            "win_pct": win_pct,
            "proposal": proposal,
            "next_step": "review proposal, apply manually, then re-run with --max-iter 1",
        }

    # auto_accept gate is intentionally NOT implemented here — per anti-pattern
    # blocklist: NON apply tune without user confirm. Returns proposal for review.
    return {
        "iteration": iteration,
        "status": "proposal_auto_accept_blocked",
        "reason": "auto-apply BLOCKED — anti-pattern (loss of control). Apply manually.",
        "proposal": proposal,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--batch-cmd", required=True, help="Calibration batch shell cmd")
    ap.add_argument("--target-win-pct", type=float, required=True)
    ap.add_argument("--tolerance", type=float, default=5.0)
    ap.add_argument("--tune-file", required=True)
    ap.add_argument("--max-iter", type=int, default=3)
    ap.add_argument("--auto-accept", action="store_true", help="(BLOCKED) auto-apply proposals")
    args = ap.parse_args()

    if args.max_iter > 5:
        print("WARN: max_iter > 5 likely runaway loop — capping to 5", file=sys.stderr)
        args.max_iter = 5

    history = []
    for i in range(1, args.max_iter + 1):
        outcome = loop_iteration(
            iteration=i,
            batch_cmd=args.batch_cmd,
            target_win_pct=args.target_win_pct,
            tolerance=args.tolerance,
            tune_file=args.tune_file,
            auto_accept=args.auto_accept,
        )
        history.append(outcome)
        if outcome["status"] in ("converged", "batch_failed", "proposal_pending_user", "proposal_auto_accept_blocked"):
            break

    print(json.dumps({"history": history}, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
