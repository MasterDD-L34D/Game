#!/usr/bin/env python3
"""Run the complete site-audit toolchain used in CI."""

from __future__ import annotations

import argparse
import logging
import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence


LOGGER = logging.getLogger("ops.site_audit.run_suite")


@dataclass
class Step:
    """Single command executed as part of the audit suite."""

    name: str
    command: Sequence[str]
    requires_base_url: bool = False
    env: dict[str, str] | None = None


def run_step(step: Step) -> bool:
    """Execute *step* and return ``True`` on success."""

    display_cmd = " ".join(step.command)
    LOGGER.info("▶ %s", step.name)
    LOGGER.debug("   %s", display_cmd)
    result = subprocess.run(step.command, env=step.env, check=False)
    if result.returncode == 0:
        LOGGER.info("✔ %s completed", step.name)
        return True
    LOGGER.error("✖ %s failed with exit code %s", step.name, result.returncode)
    return False


def build_steps(
    *,
    repo_root: Path,
    base_url: str,
    max_pages: int,
    timeout: float,
    concurrency: int,
) -> Iterable[Step]:
    site_audit_root = Path(__file__).resolve().parent
    python = sys.executable
    out_dir = site_audit_root / "_out"
    out_dir.mkdir(parents=True, exist_ok=True)

    shared_env = os.environ.copy()
    shared_env["SITE_BASE_URL"] = base_url or "https://example.com"

    yield Step(
        name="build_sitemap",
        command=[python, str(site_audit_root / "build_sitemap.py")],
        env=shared_env,
    )

    yield Step(
        name="generate_search_index",
        command=[
            python,
            str(site_audit_root / "generate_search_index.py"),
            "--repo-root",
            str(repo_root),
        ],
    )

    yield Step(
        name="build_redirects",
        command=[python, str(site_audit_root / "build_redirects.py")],
    )

    link_report = out_dir / "link_report.csv"
    yield Step(
        name="check_links",
        command=[
            python,
            str(site_audit_root / "check_links.py"),
            "--start-url",
            base_url,
            "--max-pages",
            str(max_pages),
            "--timeout",
            str(timeout),
            "--concurrency",
            str(concurrency),
            "--out",
            str(link_report),
        ],
        requires_base_url=True,
    )

    yield Step(
        name="report_links",
        command=[
            python,
            str(site_audit_root / "report_links.py"),
            "--link-report",
            str(link_report),
            "--site",
            base_url,
        ],
        requires_base_url=True,
    )

    yield Step(
        name="generate_structured_data",
        command=[
            python,
            str(site_audit_root / "generate_structured_data.py"),
            "--base-url",
            base_url,
        ],
        requires_base_url=True,
    )


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base-url",
        default=os.getenv("SITE_BASE_URL", ""),
        help="Base URL of the deployed site used for remote checks.",
    )
    parser.add_argument(
        "--repo-root",
        default=Path(".").resolve(),
        type=Path,
        help="Repository root used for filesystem-based checks.",
    )
    parser.add_argument("--max-pages", type=int, default=2000)
    parser.add_argument("--timeout", type=float, default=10.0)
    parser.add_argument("--concurrency", type=int, default=10)
    parser.add_argument("--verbose", action="store_true")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(message)s",
    )

    base_url = args.base_url.rstrip("/")
    if not base_url:
        LOGGER.warning(
            "SITE_BASE_URL not provided; remote site checks will be skipped."
        )

    failures: list[str] = []
    for step in build_steps(
        repo_root=args.repo_root,
        base_url=base_url,
        max_pages=args.max_pages,
        timeout=args.timeout,
        concurrency=args.concurrency,
    ):
        if step.requires_base_url and not base_url:
            LOGGER.info("⏭  Skipping %s (requires SITE_BASE_URL)", step.name)
            continue
        if not run_step(step):
            failures.append(step.name)

    if failures:
        LOGGER.error("Site audit suite completed with failures: %s", ", ".join(failures))
        return 1

    LOGGER.info("Site audit suite completed successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
