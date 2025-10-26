"""Generate a daily summary of merged pull requests and update documentation.

This script queries the GitHub API for pull requests merged on a specific day
and produces a Markdown report alongside synthesized highlights that are
injected into key documentation files. The script is designed to run inside CI
(job `daily-pr-summary`) but can be executed locally as long as a valid
`GITHUB_TOKEN` is available.
"""
from __future__ import annotations

import argparse
import datetime as dt
import os
import re
import sys
from dataclasses import dataclass
from textwrap import shorten
from typing import List, Sequence

import requests

ISO_FORMAT = "%Y-%m-%d"
USER_AGENT = "daily-pr-summary-script"


@dataclass
class PullRequest:
    number: int
    title: str
    author: str
    merged_at: str
    html_url: str
    body: str | None
    labels: Sequence[str]

    @property
    def merged_date(self) -> dt.date:
        return dt.datetime.fromisoformat(self.merged_at.replace("Z", "+00:00")).date()


class DailySummaryError(RuntimeError):
    """Custom error used to exit with a helpful message."""


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate a daily PR summary")
    parser.add_argument("--repo", required=False, default=os.getenv("GITHUB_REPOSITORY"),
                        help="Owner/repository pair, e.g. org/project")
    parser.add_argument("--date", required=False,
                        help="Target date (UTC) in YYYY-MM-DD. Defaults to current UTC date.")
    parser.add_argument("--output-dir", default="docs/chatgpt_changes",
                        help="Directory where the detailed report will be written.")
    parser.add_argument("--dry-run", action="store_true",
                        help="Fetch data but avoid writing files")
    parser.add_argument("--max-body-lines", type=int, default=10,
                        help="Maximum number of non-empty body lines to include in the report.")
    args = parser.parse_args(argv)
    if not args.repo:
        raise DailySummaryError("--repo or GITHUB_REPOSITORY must be set")
    if args.date:
        try:
            target_date = dt.date.fromisoformat(args.date)
        except ValueError as exc:
            raise DailySummaryError(f"Invalid --date value: {args.date}") from exc
    else:
        target_date = dt.datetime.utcnow().date()
    args.target_date = target_date
    return args


def get_token() -> str:
    token = os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN")
    if not token:
        raise DailySummaryError("GITHUB_TOKEN (or GH_TOKEN) is required to query the GitHub API")
    return token


def github_request(url: str, token: str, params: dict | None = None) -> dict:
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": USER_AGENT,
    }
    response = requests.get(url, headers=headers, params=params, timeout=30)
    if response.status_code != 200:
        raise DailySummaryError(
            f"GitHub API request failed ({response.status_code}): {response.text.strip()}"
        )
    return response.json()


def fetch_prs(repo: str, token: str, target_date: dt.date) -> List[PullRequest]:
    query_date = target_date.strftime(ISO_FORMAT)
    search_url = "https://api.github.com/search/issues"
    query = f"repo:{repo} is:pr is:merged merged:{query_date}"
    data = github_request(search_url, token, params={"q": query, "per_page": 100})
    items = data.get("items", [])
    prs: List[PullRequest] = []
    for item in items:
        number = item["number"]
        pr_url = f"https://api.github.com/repos/{repo}/pulls/{number}"
        pr_data = github_request(pr_url, token)
        merged_at = pr_data.get("merged_at")
        if not merged_at:
            # The PR may have been closed without merge; skip defensively.
            continue
        pr = PullRequest(
            number=pr_data["number"],
            title=pr_data["title"],
            author=pr_data["user"]["login"],
            merged_at=merged_at,
            html_url=pr_data["html_url"],
            body=pr_data.get("body"),
            labels=sorted(label["name"] for label in pr_data.get("labels", [])),
        )
        if pr.merged_date != target_date:
            # When merging near midnight, GitHub's merged filter can return adjacent days.
            continue
        prs.append(pr)
    prs.sort(key=lambda pr: pr.merged_at)
    return prs


def ensure_directory(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def markdown_escape(text: str) -> str:
    return text.replace("|", "\\|")


def summarise_body(body: str | None, max_lines: int) -> str | None:
    if not body:
        return None
    lines = [line.strip() for line in body.splitlines() if line.strip()]
    if not lines:
        return None
    selected = lines[:max_lines]
    # Collapse consecutive paragraphs into a single blockquote.
    return "\n".join(selected)


def build_report(prs: Sequence[PullRequest], target_date: dt.date, max_body_lines: int) -> str:
    date_str = target_date.strftime(ISO_FORMAT)
    lines: List[str] = [f"# Daily PR Summary — {date_str}", ""]
    lines.append("_Generato automaticamente da `tools/py/daily_pr_report.py`._")
    lines.append("")
    if not prs:
        lines.append("Nessuna pull request è stata fusa in questa data.")
        lines.append("")
        return "\n".join(lines)

    lines.extend([
        "| PR | Titolo | Autore | Merged (UTC) |",
        "| --- | --- | --- | --- |",
    ])
    for pr in prs:
        lines.append(
            f"| [#{pr.number}]({pr.html_url}) | {markdown_escape(pr.title)} | @{pr.author} | {pr.merged_at} |"
        )
    lines.append("")

    for pr in prs:
        lines.append(f"## #{pr.number} — {pr.title}")
        lines.append("")
        lines.append(f"- Autore: @{pr.author}")
        label_text = ", ".join(pr.labels) if pr.labels else "(nessuna label)"
        lines.append(f"- Label: {label_text}")
        lines.append(f"- Merged: {pr.merged_at}")
        lines.append(f"- Link: {pr.html_url}")
        body_summary = summarise_body(pr.body, max_body_lines)
        if body_summary:
            lines.append("")
            lines.append("> " + "\n> ".join(body_summary.splitlines()))
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def build_highlight_line(prs: Sequence[PullRequest], target_date: dt.date) -> str:
    date_str = target_date.strftime(ISO_FORMAT)
    if not prs:
        return f"- **{date_str}** — Nessun merge registrato."
    segments = []
    for pr in prs:
        title = shorten(pr.title, width=70, placeholder="…")
        segments.append(f"[#{pr.number}]({pr.html_url}) {title}")
    joined = "; ".join(segments)
    report_path = f"chatgpt_changes/daily-pr-summary-{date_str}.md"
    return f"- **{date_str}** — {joined}. [Report]({report_path})"


def update_marked_section(path: str, marker: str, content: str) -> bool:
    start_marker = f"<!-- {marker}:start -->"
    end_marker = f"<!-- {marker}:end -->"
    with open(path, "r", encoding="utf-8") as fh:
        original = fh.read()
    if start_marker not in original or end_marker not in original:
        return False
    pattern = re.compile(
        rf"{re.escape(start_marker)}.*?{re.escape(end_marker)}",
        re.DOTALL,
    )
    replacement = f"{start_marker}\n{content}\n{end_marker}"
    updated = re.sub(pattern, replacement, original)
    if updated == original:
        return False
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(updated)
    return True


def ensure_marked_section(path: str, marker: str, heading: str) -> None:
    start_marker = f"<!-- {marker}:start -->"
    end_marker = f"<!-- {marker}:end -->"
    with open(path, "r", encoding="utf-8") as fh:
        contents = fh.read()
    if start_marker in contents and end_marker in contents:
        return
    if not contents.endswith("\n"):
        contents += "\n"
    insertion = f"\n{heading}\n{start_marker}\n{end_marker}\n"
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(contents + insertion)


def update_documents(prs: Sequence[PullRequest], target_date: dt.date) -> List[str]:
    highlight_line = build_highlight_line(prs, target_date)
    if not prs:
        # Avoid touching the documents if there is nothing to record.
        return []

    docs_to_update = {
        "docs/changelog.md": ("daily-pr-summary", "### Riepilogo PR giornalieri"),
        "docs/piani/roadmap.md": ("daily-pr-summary", "## Riepilogo PR giornaliero"),
        "docs/checklist/action-items.md": ("daily-pr-summary", "## Aggiornamenti giornalieri PR"),
        "docs/Canvas/feature-updates.md": ("daily-pr-summary", "## Riepilogo quotidiano PR"),
    }
    touched: List[str] = []
    for path, (marker, heading) in docs_to_update.items():
        ensure_marked_section(path, marker, heading)
        updated = update_marked_section(path, marker, highlight_line)
        if updated:
            touched.append(path)
    return touched


def write_report(path: str, content: str) -> None:
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(content)


def main(argv: Sequence[str] | None = None) -> int:
    try:
        args = parse_args(argv or sys.argv[1:])
        token = get_token()
        prs = fetch_prs(args.repo, token, args.target_date)
        report_content = build_report(prs, args.target_date, args.max_body_lines)
        highlight_touches: List[str] = []
        report_path = ""

        if not args.dry_run:
            if prs:
                ensure_directory(args.output_dir)
                report_filename = f"daily-pr-summary-{args.target_date.strftime(ISO_FORMAT)}.md"
                report_path = os.path.join(args.output_dir, report_filename)
                write_report(report_path, report_content)
                highlight_touches = update_documents(prs, args.target_date)
            else:
                # No PRs merged; nothing was written.
                pass
        else:
            print(report_content)

        if prs:
            print(f"Generated report for {len(prs)} merged PR(s) on {args.target_date}.")
            if report_path:
                print(f"Report written to: {report_path}")
            if highlight_touches:
                print("Updated highlight sections:")
                for path in highlight_touches:
                    print(f" - {path}")
        else:
            print(f"No merged pull requests found on {args.target_date}.")
        return 0
    except DailySummaryError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
