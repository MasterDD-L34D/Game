#!/usr/bin/env python3
"""Crawla un sito di destinazione e genera un report CSV dei link trovati."""
from __future__ import annotations

import argparse
import csv
from collections import deque
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable, Set
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen


@dataclass
class LinkRecord:
    source: str
    target: str
    status: str
    note: str = ""


class AnchorParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: Set[str] = set()

    def handle_starttag(self, tag, attrs):
        if tag.lower() != "a":
            return
        href = dict(attrs).get("href")
        if href:
            self.links.add(href.strip())


def fetch_url(url: str, timeout: float) -> tuple[int | None, str]:
    try:
        req = Request(url, headers={"User-Agent": "SiteAuditBot/1.0"})
        with urlopen(req, timeout=timeout) as resp:
            return resp.getcode(), resp.headers.get("Content-Type", "")
    except Exception as exc:  # pragma: no cover - dipende dal network
        return None, str(exc)


def status_str(code: int | None) -> str:
    return "error" if code is None else str(code)


def crawl(start_url: str, max_pages: int, timeout: float) -> tuple[list[LinkRecord], set[str]]:
    parsed_start = urlparse(start_url)
    allowed_netloc = parsed_start.netloc

    to_visit: deque[str] = deque([start_url])
    visited_pages: Set[str] = set()
    discovered_links: Set[str] = set()
    report: list[LinkRecord] = []

    while to_visit and len(visited_pages) < max_pages:
        url = to_visit.popleft()
        if url in visited_pages:
            continue
        visited_pages.add(url)

        status, note = fetch_url(url, timeout)
        if status is None or status >= 400:
            report.append(LinkRecord(url, url, status_str(status), note))
            continue

        body = b""
        try:
            req = Request(url, headers={"User-Agent": "SiteAuditBot/1.0"})
            with urlopen(req, timeout=timeout) as resp:
                body = resp.read()
        except Exception as exc:  # pragma: no cover - dipende dal network
            report.append(LinkRecord(url, url, status_str(None), str(exc)))
            continue

        parser = AnchorParser()
        try:
            parser.feed(body.decode("utf-8", errors="ignore"))
        except Exception:
            pass

        for href in parser.links:
            absolute = urljoin(url, href)
            parsed = urlparse(absolute)
            if parsed.scheme not in ("http", "https"):
                continue
            if parsed.netloc != allowed_netloc:
                continue
            absolute = parsed._replace(fragment="").geturl()
            if absolute not in discovered_links:
                discovered_links.add(absolute)
                to_visit.append(absolute)
            status_link, note_link = fetch_url(absolute, timeout)
            report.append(LinkRecord(url, absolute, status_str(status_link), note_link if status_link is None else ""))

    return report, visited_pages


def write_report(path: Path, records: Iterable[LinkRecord]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["source", "target", "status", "note"])
        for rec in records:
            writer.writerow([rec.source, rec.target, rec.status, rec.note])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--start-url", required=True)
    ap.add_argument("--max-pages", type=int, default=100)
    ap.add_argument("--timeout", type=float, default=10.0)
    ap.add_argument("--out", default="ops/site-audit/_out/link_report.csv")
    args = ap.parse_args()

    records, visited = crawl(args.start_url, args.max_pages, args.timeout)
    write_report(Path(args.out), records)
    print(f"[links] pagine visitate: {len(visited)} | link verificati: {len(records)} → {args.out}")


if __name__ == "__main__":
    main()
