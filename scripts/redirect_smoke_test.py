#!/usr/bin/env python3
"""Redirect smoke test runner for staging/go-live validation.

Reads the redirect mapping table from the staging planning document, performs
HTTP requests against a configurable host, and reports pass/fail/skip results
alongside an optional JSON report for ticket attachments.
"""
from __future__ import annotations

import argparse
import datetime as _dt
import http.client
import json
from pathlib import Path
import re
import sys
import urllib.parse
from typing import Dict, List, Optional

DEFAULT_MAPPING_PATH = Path("docs/planning/REF_REDIRECT_PLAN_STAGING.md")
USER_AGENT = "redirect-smoke-test/1.0"


def _normalize_host(host: str) -> str:
    parsed = urllib.parse.urlparse(host)
    if not parsed.scheme:
        parsed = urllib.parse.urlparse(f"https://{host}")
    if not parsed.netloc:
        raise ValueError(f"Host '{host}' is not valid. Provide a host such as https://staging.example.com")
    return urllib.parse.urlunparse((parsed.scheme, parsed.netloc, "", "", "", ""))


def _parse_statuses(raw: str) -> List[int]:
    statuses: List[int] = []
    for token in re.split(r"[,/]|\\s+", raw):
        token = token.strip()
        if token.isdigit():
            statuses.append(int(token))
    return statuses


def _parse_mapping_table(path: Path) -> List[Dict[str, str]]:
    lines = path.read_text(encoding="utf-8").splitlines()
    in_table = False
    rows: List[Dict[str, str]] = []

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("| ID") and "Source" in stripped and "Target" in stripped:
            in_table = True
            continue
        if not in_table:
            continue
        if not stripped.startswith("|"):
            if rows:
                break
            continue
        if re.match(r"^\|\s*-", stripped):
            continue

        cells = [cell.strip().strip("`") for cell in stripped.strip("|").split("|")]
        if len(cells) < 7:
            continue

        row = {
            "id": cells[0],
            "source": cells[1],
            "target": cells[2],
            "status": cells[3],
            "owner": cells[4],
            "ticket": cells[5],
            "note": cells[6],
            "expected_statuses": _parse_statuses(cells[3]),
        }
        rows.append(row)

    if not rows:
        raise ValueError(f"No mapping rows found in {path}")
    return rows


def _build_path(base_url: str, path: str) -> str:
    base = base_url.rstrip("/") + "/"
    return urllib.parse.urljoin(base, path.lstrip("/"))


def _normalized_location(location: Optional[str], base_url: str) -> Optional[str]:
    if not location:
        return None
    parsed = urllib.parse.urlparse(location)
    if parsed.scheme and parsed.netloc:
        return parsed.path or "/"
    return urllib.parse.urlparse(_build_path(base_url, location)).path or "/"


def _request_once(url: str, timeout: float) -> Dict[str, Optional[str]]:
    parsed = urllib.parse.urlparse(url)
    connection_cls = http.client.HTTPSConnection if parsed.scheme == "https" else http.client.HTTPConnection
    path = parsed.path or "/"
    if parsed.query:
        path = f"{path}?{parsed.query}"

    connection = connection_cls(parsed.hostname, parsed.port, timeout=timeout)
    try:
        connection.request(
            "GET",
            path,
            headers={"User-Agent": USER_AGENT},
        )
        response = connection.getresponse()
        body = response.read()  # noqa: F841 - ensure the response is fully consumed
        return {
            "status": response.status,
            "location": response.getheader("Location"),
        }
    finally:
        connection.close()


def _evaluate_row(row: Dict[str, str], base_host: str, timeout: float) -> Dict[str, object]:
    source = row["source"]
    target = row["target"]
    expected_statuses = row["expected_statuses"]

    if "<" in source or "<" in target or not expected_statuses:
        return {
            "id": row["id"],
            "result": "skip",
            "reason": "Mapping incomplete (placeholder or missing expected status)",
            "source": source,
            "target_expected": target,
            "expected_statuses": expected_statuses,
        }

    url = _build_path(base_host, source)
    try:
        outcome = _request_once(url, timeout)
    except Exception as exc:  # noqa: BLE001
        return {
            "id": row["id"],
            "result": "error",
            "source": source,
            "target_expected": target,
            "expected_statuses": expected_statuses,
            "error": str(exc),
        }

    actual_status = int(outcome["status"])
    actual_location = outcome["location"]
    normalized_expected = _normalized_location(target, base_host)
    normalized_actual = _normalized_location(actual_location, base_host)

    status_ok = actual_status in expected_statuses
    location_ok = normalized_actual == normalized_expected

    result = "pass" if status_ok and location_ok else "fail"

    return {
        "id": row["id"],
        "result": result,
        "source": source,
        "target_expected": target,
        "expected_statuses": expected_statuses,
        "status_received": actual_status,
        "location_received": actual_location,
        "normalized_expected": normalized_expected,
        "normalized_received": normalized_actual,
        "status_match": status_ok,
        "location_match": location_ok,
        "note": row.get("note"),
    }


def _summarize(results: List[Dict[str, object]]) -> Dict[str, int]:
    summary = {"total": len(results), "pass": 0, "fail": 0, "skip": 0, "error": 0}
    for res in results:
        result = res.get("result")
        if result in summary:
            summary[result] += 1
    return summary


def _print_result(res: Dict[str, object]) -> None:
    base = f"[{res['result'].upper()}] {res['id']} {res.get('source')}"
    if res["result"] == "pass":
        print(
            f"{base} -> {res.get('status_received')} to {res.get('location_received') or '-'} (expected {res.get('expected_statuses')} to {res.get('target_expected')})"
        )
    elif res["result"] == "fail":
        print(
            f"{base} -> {res.get('status_received')} to {res.get('location_received') or '-'}; expected {res.get('expected_statuses')} and {res.get('target_expected')}"
        )
    elif res["result"] == "skip":
        print(f"{base} skipped: {res.get('reason')}")
    else:
        print(f"{base} error: {res.get('error')}")


def run(mapping_path: Path, host: str, environment: str, timeout: float, output: Optional[Path]) -> int:
    base_host = _normalize_host(host)
    rows = _parse_mapping_table(mapping_path)
    results = [_evaluate_row(row, base_host, timeout) for row in rows]
    summary = _summarize(results)

    print(f"Redirect smoke test for {environment} @ {base_host}")
    for res in results:
        _print_result(res)
    print(f"Summary: {summary}")

    report = {
        "environment": environment,
        "host": base_host,
        "generated_at": _dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
        "mapping_source": str(mapping_path),
        "summary": summary,
        "results": results,
    }

    if output:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"Report written to {output}")

    return 0 if summary["fail"] == 0 and summary["error"] == 0 else 1


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Run a redirect smoke test against staging/go-live mapping. "
            "Reads the mapping table from the planning doc and validates HTTP status + Location headers."
        )
    )
    parser.add_argument(
        "--mapping",
        type=Path,
        default=DEFAULT_MAPPING_PATH,
        help="Path to the markdown file containing the redirect mapping table (default: %(default)s)",
    )
    parser.add_argument("--host", required=True, help="Base host to query (e.g. https://staging.example.com)")
    parser.add_argument(
        "--environment",
        default="staging",
        help="Environment label stored in the report (default: %(default)s)",
    )
    parser.add_argument("--timeout", type=float, default=5.0, help="HTTP client timeout in seconds (default: %(default)s)")
    parser.add_argument("--output", type=Path, help="Optional path for the JSON report to attach to tickets")

    args = parser.parse_args(argv)

    try:
        return run(args.mapping, args.host, args.environment, args.timeout, args.output)
    except Exception as exc:  # noqa: BLE001
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
