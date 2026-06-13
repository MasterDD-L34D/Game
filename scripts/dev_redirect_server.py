"""Development redirect server for local smoke tests.

This lightweight HTTP server serves the redirect map defined in
``docs/planning/REF_REDIRECT_PLAN_STAGING.md`` so that
``scripts/redirect_smoke_test.py`` can be executed against
``http://localhost:8000`` without requiring another stack.

Usage:
    python scripts/dev_redirect_server.py --host 0.0.0.0 --port 8000
"""
from __future__ import annotations

import argparse
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Dict, Tuple

RedirectMap = Dict[str, Tuple[int, str]]

REDIRECTS: RedirectMap = {
    "/data/species.yaml": (301, "/data/core/species.yaml"),
    "/data/traits": (301, "/data/core/traits"),
    "/data/analysis": (302, "/data/derived/analysis"),
}


class RedirectHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802 - http.server requires this name
        status, location = REDIRECTS.get(self.path, (404, ""))
        self.send_response(status)
        if location:
            self.send_header("Location", location)
        self.end_headers()

    def log_message(self, format: str, *args) -> None:  # noqa: A003 - signature fixed by BaseHTTPRequestHandler
        return  # Silence default stdout logging for clean smoke-test output


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Local redirect server for smoke tests")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind (default: 8000)")
    return parser.parse_args()


def run_server(host: str, port: int) -> None:
    httpd = HTTPServer((host, port), RedirectHandler)
    print(f"Serving redirect map on http://{host}:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()


if __name__ == "__main__":
    args = parse_args()
    run_server(args.host, args.port)
