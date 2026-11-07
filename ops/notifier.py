#!/usr/bin/env python3
"""Notifier utilities for Ops workflows.

This module parses the documentation diff produced by
`scripts/evo_tactics_metadata_diff.py` and notifies downstream channels
(Slack, Teams) when blocking differences are detected.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, List, Optional
from urllib.error import URLError, HTTPError
from urllib.request import Request, urlopen


@dataclass
class BlockingDiff:
    document: str
    reasons: List[str]

    def to_markdown(self) -> str:
        bullets = "\n".join(f"  - {reason}" for reason in self.reasons)
        return f"- **{self.document}**\n{bullets}"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Send notifications for Evo documentation drifts.")
    parser.add_argument("--diff-json", type=Path, required=True, help="Path to documentation_diff.json produced by the diff script.")
    parser.add_argument(
        "--issue-output",
        type=Path,
        help="Optional path where an issue payload (JSON) will be written.",
    )
    parser.add_argument(
        "--slack-webhook",
        default=os.getenv("EVO_NOTIFIER_SLACK_WEBHOOK"),
        help="Slack webhook URL. Falls back to EVO_NOTIFIER_SLACK_WEBHOOK env variable.",
    )
    parser.add_argument(
        "--teams-webhook",
        default=os.getenv("EVO_NOTIFIER_TEAMS_WEBHOOK"),
        help="Microsoft Teams webhook URL. Falls back to EVO_NOTIFIER_TEAMS_WEBHOOK env variable.",
    )
    parser.add_argument(
        "--slack-channel",
        default=os.getenv("EVO_NOTIFIER_SLACK_CHANNEL"),
        help=(
            "Override Slack destination channel (defaults to EVO_NOTIFIER_SLACK_CHANNEL env variable "
            "or the webhook default)."
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="If set, do not send network requests and simply print the summary to stdout.",
    )
    return parser.parse_args()


def load_diff(path: Path) -> Dict[str, object]:
    if not path.exists():
        raise SystemExit(f"Diff JSON non trovato: {path}")
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def detect_blocking(diffs: Iterable[Dict[str, object]]) -> List[BlockingDiff]:
    blocking: List[BlockingDiff] = []
    for diff in diffs:
        document = diff.get("consolidated") or "<unknown>"
        reasons: List[str] = []

        fm_missing_archive = diff.get("frontmatter_missing_in_archive") or []
        fm_missing_consolidated = diff.get("frontmatter_missing_in_consolidated") or []
        fm_mismatched = diff.get("frontmatter_mismatched") or {}
        anchors_added = diff.get("anchors_added") or []
        anchors_removed = diff.get("anchors_removed") or []

        if fm_missing_archive or fm_missing_consolidated or fm_mismatched:
            details = []
            if fm_missing_archive:
                details.append(f"mancano in archivio: {', '.join(fm_missing_archive)}")
            if fm_missing_consolidated:
                details.append(f"mancano in consolidato: {', '.join(fm_missing_consolidated)}")
            if fm_mismatched:
                keys = ", ".join(sorted(fm_mismatched.keys()))
                details.append(f"valori divergenti: {keys}")
            reasons.append("Frontmatter divergente (" + "; ".join(details) + ")")

        if anchors_removed:
            reasons.append(f"Ancore rimosse nel consolidato: {', '.join(anchors_removed[:10])}" + ("…" if len(anchors_removed) > 10 else ""))
        if anchors_added:
            reasons.append(f"Ancore mancanti nell'archivio: {', '.join(anchors_added[:10])}" + ("…" if len(anchors_added) > 10 else ""))

        if reasons:
            blocking.append(BlockingDiff(document=document, reasons=reasons))

    return blocking


def build_issue_payload(blocking: List[BlockingDiff]) -> Dict[str, str]:
    today = datetime.utcnow().strftime("%Y-%m-%d")
    title = f"Evo docs blocking diffs detected on {today}"
    if not blocking:
        summary = "Nessuna differenza bloccante rilevata."
        body = "Tutti i documenti analizzati sono allineati."
        return {"title": title, "body": body, "summary": summary}

    lines = [
        "Sono state rilevate differenze bloccanti tra documentazione consolidata e archivio.",
        "",
        "Dettaglio file:",
    ]
    for diff in blocking:
        lines.append(diff.to_markdown())

    lines.extend(
        [
            "",
            "Azioni consigliate:",
            "- Eseguire il backfill dei frontmatter per i file indicati.",
            "- Aggiornare o aggiungere le ancore mancanti nei documenti legacy.",
        ]
    )

    body = "\n".join(lines)
    summary = f"{len(blocking)} documenti con frontmatter/ancore da verificare."
    return {"title": title, "body": body, "summary": summary}


def send_webhook(url: Optional[str], payload: Dict[str, object], dry_run: bool = False) -> None:
    if not url:
        return
    if dry_run:
        print(f"[dry-run] Skip webhook: {url}")
        return

    data = json.dumps(payload).encode("utf-8")
    request = Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urlopen(request) as response:  # nosec B310
            response.read()
    except (HTTPError, URLError) as exc:
        print(f"Impossibile inviare la notifica ({url}): {exc}", file=sys.stderr)


def build_slack_payload(summary: str, blocking: List[BlockingDiff], channel: Optional[str] = None) -> Dict[str, object]:
    blocks: List[Dict[str, object]] = [
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"*:rotating_light: Evo docs alert*\n{summary}"},
        }
    ]
    if blocking:
        details = "\n".join(diff.to_markdown() for diff in blocking)
        blocks.append({"type": "section", "text": {"type": "mrkdwn", "text": details}})
    payload: Dict[str, object] = {"text": summary, "blocks": blocks}
    if channel:
        payload["channel"] = channel
        if not summary.lower().startswith("devrel/docs"):
            payload["text"] = f"DevRel/Docs · {summary}"
            payload["blocks"][0]["text"]["text"] = (
                "*:rotating_light: Evo docs alert (DevRel/Docs)*\n" + summary
            )
    return payload


def build_teams_payload(summary: str, blocking: List[BlockingDiff]) -> Dict[str, object]:
    facts = [
        {"name": "Documenti coinvolti", "value": str(len(blocking))},
    ]
    if blocking:
        details = "\n".join(diff.to_markdown() for diff in blocking)
        facts.append({"name": "Dettaglio", "value": details})

    return {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "summary": summary,
        "themeColor": "F04F47",
        "title": "Evo documentation gap",
        "sections": [
            {
                "activityTitle": "DevRel alert",
                "activitySubtitle": summary,
                "facts": facts,
            }
        ],
    }


def main() -> None:
    args = parse_args()
    payload = load_diff(args.diff_json)

    diffs = payload.get("diffs") or []
    blocking = detect_blocking(diffs) if isinstance(diffs, list) else []

    issue_payload = build_issue_payload(blocking)

    print(issue_payload["summary"])
    for diff in blocking:
        print(f"- {diff.document}: {', '.join(diff.reasons)}")

    if args.issue_output:
        args.issue_output.parent.mkdir(parents=True, exist_ok=True)
        with args.issue_output.open("w", encoding="utf-8") as handle:
            json.dump(
                {
                    "has_blocking": bool(blocking),
                    "issue_title": issue_payload["title"],
                    "issue_body": issue_payload["body"],
                    "summary": issue_payload["summary"],
                },
                handle,
                ensure_ascii=False,
                indent=2,
            )
            handle.write("\n")

    slack_payload = build_slack_payload(issue_payload["summary"], blocking, channel=args.slack_channel)
    teams_payload = build_teams_payload(issue_payload["summary"], blocking)

    send_webhook(args.slack_webhook, slack_payload, dry_run=args.dry_run)
    send_webhook(args.teams_webhook, teams_payload, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
