#!/usr/bin/env python3
from __future__ import annotations

import concurrent.futures
import csv
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Iterable, List, Tuple

import requests


USER_AGENT = "EvoTacticsLinkChecker/1.0"
DEFAULT_CONCURRENCY = 8
DEFAULT_TIMEOUT = 10.0


def load_urls(sitemap_path: Path) -> List[str]:
    tree = ET.parse(sitemap_path)
    root = tree.getroot()

    namespace = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
    urls: List[str] = []

    for url in root.findall(f"{namespace}url"):
        loc = url.find(f"{namespace}loc")
        if loc is not None and loc.text:
            urls.append(loc.text.strip())

    return urls


def fetch(url: str, timeout: float) -> Tuple[str, str, str]:
    headers = {"User-Agent": USER_AGENT}
    try:
        response = requests.head(url, timeout=timeout, allow_redirects=True, headers=headers)
        if response.status_code in {405, 500} or response.headers.get("Content-Length") == "0":
            response = requests.get(url, timeout=timeout, allow_redirects=True, headers=headers)
        status = str(response.status_code)
        content_type = response.headers.get("Content-Type", "")
    except Exception as exc:  # pragma: no cover - network dependent
        status = f"ERROR: {exc}"
        content_type = ""
    return url, status, content_type


def check_urls(urls: Iterable[str], timeout: float, concurrency: int) -> List[Tuple[str, str, str]]:
    results: List[Tuple[str, str, str]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        future_to_url = {executor.submit(fetch, url, timeout): url for url in urls}
        for future in concurrent.futures.as_completed(future_to_url):
            results.append(future.result())
    results.sort(key=lambda row: row[0])
    return results


def main(argv: List[str]) -> int:
    if len(argv) < 2:
        print("Usage: python tools/sitemap_link_checker.py <sitemap.xml> [concurrency] [timeout]")
        return 1

    sitemap_path = Path(argv[1])
    if not sitemap_path.is_file():
        print(f"Error: {sitemap_path} is not a file", file=sys.stderr)
        return 1

    concurrency = int(argv[2]) if len(argv) > 2 else DEFAULT_CONCURRENCY
    timeout = float(argv[3]) if len(argv) > 3 else DEFAULT_TIMEOUT

    urls = load_urls(sitemap_path)
    results = check_urls(urls, timeout=timeout, concurrency=concurrency)

    writer = csv.writer(sys.stdout)
    writer.writerow(["url", "status", "content_type"])
    for row in results:
        writer.writerow(row)

    errors = [row for row in results if row[1].isdigit() and int(row[1]) >= 400]
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
