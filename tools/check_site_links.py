#!/usr/bin/env python3
"""Verifica i collegamenti interni del sito statico."""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable, List, Optional
from urllib.parse import urlsplit


EXTERNAL_SCHEMES = {"http", "https", "mailto", "tel", "data"}


@dataclass
class LinkIssue:
  """Rappresenta un collegamento mancante rilevato durante il controllo."""

  source: Path
  attribute: str
  raw_value: str
  resolved: Path

  def __str__(self) -> str:  # pragma: no cover - formato human friendly
    relative_source = self.source.as_posix()
    relative_resolved = self.resolved.as_posix()
    return (
      f"{relative_source}: attributo {self.attribute!r} punta a "
      f"{self.raw_value!r} (risolto in {relative_resolved}) non trovato"
    )


class LinkCollector(HTMLParser):
  """Parser HTML minimale per estrarre attributi href e src."""

  def __init__(self) -> None:
    super().__init__()
    self.links: List[tuple[str, str]] = []

  def handle_starttag(self, tag: str, attrs: List[tuple[str, Optional[str]]]) -> None:
    for name, value in attrs:
      if name in {"href", "src"} and value:
        self.links.append((name, value))


def iter_html_files(root: Path) -> Iterable[Path]:
  for path in root.rglob("*.html"):
    if path.is_file():
      yield path


def resolve_link(base: Path, value: str, site_root: Path) -> Optional[Path]:
  value = value.strip()
  if not value or value.startswith("#"):
    return None

  parsed = urlsplit(value)
  if parsed.scheme and parsed.scheme.lower() in EXTERNAL_SCHEMES:
    return None

  target_path = parsed.path
  if not target_path:
    return None

  if target_path.startswith("/"):
    candidate = site_root / target_path.lstrip("/")
  else:
    candidate = (base.parent / target_path).resolve()

  try:
    candidate = candidate.relative_to(site_root.resolve())
  except ValueError:
    # Collegamento che esce dalla root del sito: segnaliamo comunque
    return (base.parent / target_path).resolve()

  candidate = site_root / candidate
  return candidate


def check_link(target: Path) -> bool:
  if target.exists():
    return True
  if target.suffix == "":
    # URL che punta a una directory implicita
    index_candidate = target / "index.html"
    if index_candidate.exists():
      return True
  if target.is_dir():
    return True
  if target.suffix == "":
    # ultima chance: aggiungere index.html anche se la directory non esiste come Path
    index_candidate = Path(f"{target.as_posix().rstrip('/')}/index.html")
    if index_candidate.exists():
      return True
  if target.suffix == "":
    return False
  if target.suffix == ".html" and not target.exists():
    return False
  return target.exists()


def collect_issues(site_root: Path) -> List[LinkIssue]:
  issues: List[LinkIssue] = []
  for html_file in iter_html_files(site_root):
    parser = LinkCollector()
    parser.feed(html_file.read_text(encoding="utf-8"))
    for attribute, raw_value in parser.links:
      resolved = resolve_link(html_file, raw_value, site_root)
      if resolved is None:
        continue
      if not check_link(resolved):
        issues.append(LinkIssue(html_file.relative_to(site_root), attribute, raw_value, resolved))
  return issues


def main(argv: Optional[Iterable[str]] = None) -> int:
  parser = argparse.ArgumentParser(description=__doc__)
  parser.add_argument(
    "root",
    nargs="?",
    default="docs",
    type=Path,
    help="Directory radice del sito (default: docs)",
  )
  args = parser.parse_args(list(argv) if argv is not None else None)

  site_root = args.root.resolve()
  if not site_root.exists():
    parser.error(f"La directory {site_root} non esiste")

  issues = collect_issues(site_root)
  if issues:
    print("Sono stati rilevati collegamenti mancanti:")
    for issue in issues:
      print(f" - {issue}")
    return 1

  print("Tutti i collegamenti interni risultano validi.")
  return 0


if __name__ == "__main__":  # pragma: no cover - entry point script
  sys.exit(main())
