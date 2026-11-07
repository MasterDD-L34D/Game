"""Redirect smoke test tool for staging and other environments.

Uso rapido (staging):
    python scripts/redirect_smoke_test.py \
        --host http://localhost:8000 \
        --environment staging \
        --output reports/redirects/redirect-smoke-staging.json

Il comando legge il mapping dei redirect da ``docs/planning/REF_REDIRECT_PLAN_STAGING.md``
(di default) oppure da un file alternativo passato con ``--mapping``. Esegue richieste
HTTP verso i percorsi indicati senza seguire i redirect, confrontando status code e
header ``Location``. I risultati vengono stampati su stdout e, se richiesto, salvati
in JSON (inclusi i casi ``SKIP``/``ERROR``). L'exit code è 0 solo quando non sono
presenti esiti ``FAIL`` o ``ERROR``.

Per i ticket #1204/#1205 archiviare i report generati (es. ``reports/redirects/redirect-smoke-staging.json``)
in ``reports/`` o in una sottocartella dedicata (es. ``reports/redirects/``) e allegarli
ai rispettivi ticket di go-live.
"""
from __future__ import annotations

import argparse
import json
import os
import socket
from dataclasses import dataclass
from http.client import HTTPConnection, HTTPSConnection, HTTPResponse
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlparse, urljoin


DEFAULT_MAPPING_PATH = "docs/planning/REF_REDIRECT_PLAN_STAGING.md"
DEFAULT_TIMEOUT = 5.0
DEFAULT_OUTPUT_PATH = "reports/redirects/redirect-smoke-staging.json"


@dataclass
class RedirectEntry:
    identifier: str
    source: str
    target: str
    expected_status: Optional[int]
    raw_status: str


@dataclass
class RedirectResult:
    identifier: str
    source: str
    target: str
    expected_status: Optional[int]
    actual_status: Optional[int]
    expected_location: Optional[str]
    actual_location: Optional[str]
    outcome: str
    message: str


class NoRedirectHTTPConnection:
    def __init__(self, scheme: str, netloc: str, timeout: float) -> None:
        self.scheme = scheme
        self.netloc = netloc
        self.timeout = timeout
        if scheme == "https":
            self._conn = HTTPSConnection(netloc, timeout=timeout)
        else:
            self._conn = HTTPConnection(netloc, timeout=timeout)

    def request(self, method: str, url: str) -> HTTPResponse:
        self._conn.request(method, url, headers={"User-Agent": "redirect-smoke-test"})
        return self._conn.getresponse()

    def close(self) -> None:
        self._conn.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Smoke test per redirect HTTP")
    parser.add_argument("--host", required=True, help="Host di destinazione con schema (es. https://staging.example.com)")
    parser.add_argument("--environment", default="staging", help="Etichetta ambiente salvata nel report")
    parser.add_argument("--mapping", default=DEFAULT_MAPPING_PATH, help="Percorso del file di mapping (Markdown)")
    parser.add_argument("--timeout", type=float, default=DEFAULT_TIMEOUT, help="Timeout HTTP in secondi")
    parser.add_argument(
        "--output",
        default=DEFAULT_OUTPUT_PATH,
        help=(
            "Percorso file JSON per salvare il report; default: "
            f"{DEFAULT_OUTPUT_PATH}"
        ),
    )
    return parser.parse_args()


def normalize_path(path: str) -> str:
    normalized = path.strip()
    if not normalized.startswith("/"):
        normalized = "/" + normalized
    return normalized


def parse_mapping(file_path: str) -> List[RedirectEntry]:
    entries: List[RedirectEntry] = []
    with open(file_path, "r", encoding="utf-8") as handle:
        lines = handle.readlines()

    in_table = False
    for line in lines:
        if line.startswith("| ID"):
            in_table = True
            continue
        if not in_table:
            continue
        if not line.startswith("|"):
            break
        cells = [cell.strip().strip("`") for cell in line.strip().split("|")[1:-1]]
        if not cells or cells[0].startswith("----"):
            continue
        identifier = cells[0] if len(cells) > 0 else ""
        source = cells[1] if len(cells) > 1 else ""
        target = cells[2] if len(cells) > 2 else ""
        status_cell = cells[3] if len(cells) > 3 else ""
        source_path = normalize_path(source) if source else ""
        target_path = normalize_path(target) if target else ""
        status_digits = status_cell.split()[0] if status_cell else ""
        expected_status = int(status_digits) if status_digits.isdigit() else None
        entries.append(
            RedirectEntry(
                identifier=identifier,
                source=source_path,
                target=target_path,
                expected_status=expected_status,
                raw_status=status_cell,
            )
        )
    return entries


def needs_skip(entry: RedirectEntry) -> Tuple[bool, str]:
    if not entry.source or not entry.target:
        return True, "Source o target mancante"
    if entry.expected_status is None:
        return True, "Status mancante o non numerico"
    if "<" in entry.source or "<" in entry.target:
        return True, "Placeholder nel mapping"
    return False, ""


def build_expected_location(host: str, target: str) -> str:
    base = host.rstrip("/")
    return base + normalize_path(target)


def fetch_redirect(host: str, path: str, timeout: float) -> Tuple[Optional[int], Optional[str], Optional[str]]:
    parsed = urlparse(host)
    if not parsed.scheme or not parsed.netloc:
        raise ValueError(f"Host non valido: {host}")

    connection = NoRedirectHTTPConnection(parsed.scheme, parsed.netloc, timeout)
    combined_path = urljoin(parsed.path if parsed.path else "/", path.lstrip("/"))
    try:
        response = connection.request("GET", combined_path)
        status = response.status
        location = response.getheader("Location")
        return status, location, None
    except (socket.timeout, OSError) as exc:
        return None, None, str(exc)
    finally:
        connection.close()


def evaluate_entry(entry: RedirectEntry, host: str, timeout: float) -> RedirectResult:
    skip, reason = needs_skip(entry)
    expected_location = build_expected_location(host, entry.target) if not skip else None

    if skip:
        return RedirectResult(
            identifier=entry.identifier,
            source=entry.source,
            target=entry.target,
            expected_status=entry.expected_status,
            actual_status=None,
            expected_location=expected_location,
            actual_location=None,
            outcome="SKIP",
            message=reason,
        )

    try:
        status, location, error = fetch_redirect(host, entry.source, timeout)
    except ValueError as exc:
        return RedirectResult(
            identifier=entry.identifier,
            source=entry.source,
            target=entry.target,
            expected_status=entry.expected_status,
            actual_status=None,
            expected_location=expected_location,
            actual_location=None,
            outcome="ERROR",
            message=str(exc),
        )

    if error:
        return RedirectResult(
            identifier=entry.identifier,
            source=entry.source,
            target=entry.target,
            expected_status=entry.expected_status,
            actual_status=status,
            expected_location=expected_location,
            actual_location=location,
            outcome="ERROR",
            message=error,
        )

    status_ok = status == entry.expected_status
    location_ok = False
    message_parts = []

    if location:
        parsed_location = urlparse(location)
        if parsed_location.scheme and parsed_location.netloc:
            location_ok = parsed_location.path == entry.target or location == expected_location
        else:
            location_ok = normalize_path(location) == entry.target
    else:
        message_parts.append("Header Location assente")

    if not status_ok:
        message_parts.append(f"Status atteso {entry.expected_status}, ottenuto {status}")
    if status_ok and not location_ok:
        message_parts.append("Location inattesa")

    outcome = "PASS" if (status_ok and location_ok) else "FAIL"
    if outcome == "PASS":
        message_parts.append("Redirect conforme")
    elif not message_parts:
        message_parts.append("Esito non conforme")

    return RedirectResult(
        identifier=entry.identifier,
        source=entry.source,
        target=entry.target,
        expected_status=entry.expected_status,
        actual_status=status,
        expected_location=expected_location,
        actual_location=location,
        outcome=outcome,
        message="; ".join(message_parts),
    )


def generate_report(host: str, environment: str, results: List[RedirectResult]) -> Dict:
    summary = {
        "total": len(results),
        "pass": sum(1 for r in results if r.outcome == "PASS"),
        "fail": sum(1 for r in results if r.outcome == "FAIL"),
        "skip": sum(1 for r in results if r.outcome == "SKIP"),
        "error": sum(1 for r in results if r.outcome == "ERROR"),
    }
    return {
        "host": host,
        "environment": environment,
        "summary": summary,
        "results": [r.__dict__ for r in results],
    }


def print_results(results: List[RedirectResult]) -> None:
    for result in results:
        prefix = f"[{result.outcome}] {result.identifier}"
        detail = f"{result.source} -> {result.target}"
        message = result.message
        print(f"{prefix}: {detail} | {message}")


def print_summary(summary: Dict[str, int]) -> None:
    print(
        "\nTotale: {total} | PASS: {pass} | FAIL: {fail} | SKIP: {skip} | ERROR: {error}".format(
            **summary
        )
    )


def main() -> int:
    args = parse_args()
    try:
        entries = parse_mapping(args.mapping)
    except OSError as exc:
        print(f"Impossibile leggere il mapping '{args.mapping}': {exc}")
        return 1
    results = [evaluate_entry(entry, args.host, args.timeout) for entry in entries]

    report = generate_report(args.host, args.environment, results)
    print_results(results)
    print_summary(report["summary"])

    if args.output:
        directory = os.path.dirname(args.output) or "."
        os.makedirs(directory, exist_ok=True)
        with open(args.output, "w", encoding="utf-8") as handle:
            json.dump(report, handle, indent=2, ensure_ascii=False)
        print(f"Report salvato in {args.output}")

    exit_code = 1 if any(r.outcome in {"FAIL", "ERROR"} for r in results) else 0
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
