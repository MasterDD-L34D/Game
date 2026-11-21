"""Lightweight redirect + static server for staging validation.

- Serves files from the repository root (so ``/data/core`` and ``/data/derived``
  are reachable directly).
- Applies redirect rules parsed from ``docs/planning/REF_REDIRECT_PLAN_STAGING.md``
  (same source used by ``scripts/redirect_smoke_test.py``) returning the
  expected status codes.

Usage:
    python scripts/redirect_server.py --host 0.0.0.0 --port 8000
"""
from __future__ import annotations

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Dict, Tuple

from redirect_smoke_test import DEFAULT_MAPPING_PATH, RedirectEntry, normalize_path, parse_mapping

RedirectMap = Dict[str, Tuple[int, str]]


def build_redirect_map(entries: list[RedirectEntry]) -> RedirectMap:
    """Create a lookup map {source_path: (status, target_path)}.

    Both trailing and non-trailing slash variants are included to make the
    redirect resilient to how the client formats the URL.
    """

    mapping: RedirectMap = {}
    for entry in entries:
        if not entry.source or not entry.target:
            continue
        status = entry.expected_status or 301
        target = normalize_path(entry.target)
        source = normalize_path(entry.source)
        candidates = {source}
        if source != "/":
            if source.endswith("/"):
                candidates.add(source.rstrip("/"))
            else:
                candidates.add(source + "/")
        for candidate in candidates:
            mapping[candidate] = (status, target)
    return mapping


class RedirectHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, redirects: RedirectMap, **kwargs):
        self.redirects = redirects
        super().__init__(*args, **kwargs)

    def _handle(self, head_only: bool = False) -> None:
        path = self.path.split("?")[0]
        redirect = self.redirects.get(path)
        if redirect:
            status, target = redirect
            self.send_response(status)
            self.send_header("Location", target)
            self.end_headers()
            return
        if head_only:
            return super().do_HEAD()
        return super().do_GET()

    def do_GET(self) -> None:  # noqa: N802 - external API
        self._handle(head_only=False)

    def do_HEAD(self) -> None:  # noqa: N802 - external API
        self._handle(head_only=True)



def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Redirect + static server for staging")
    parser.add_argument("--host", default="127.0.0.1", help="Address to bind (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind (default: 8000)")
    parser.add_argument(
        "--mapping",
        default=DEFAULT_MAPPING_PATH,
        help="Path to the markdown mapping file (default: docs/planning/REF_REDIRECT_PLAN_STAGING.md)",
    )
    parser.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="Root directory to serve (default: repository root)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    entries = parse_mapping(args.mapping)
    redirect_map = build_redirect_map(entries)

    handler = partial(RedirectHandler, redirects=redirect_map, directory=str(args.root))
    server = ThreadingHTTPServer((args.host, args.port), handler)
    print(f"[redirect-server] Serving {args.root} on http://{args.host}:{args.port}")
    print(f"[redirect-server] Loaded {len(redirect_map)} redirect rules from {args.mapping}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("[redirect-server] Shutting down")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
