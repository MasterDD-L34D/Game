"""Capture and compare visual snapshots for the static dashboard and generator.

The baseline is stored as text (hashes and a tiny base64 thumbnail) inside
``config/visual_baseline.json`` so that no binary assets need to be committed.
Local PNG captures remain in ``logs/visual_baseline/`` for manual inspection
while comparison runs write reports under ``logs/visual_runs/``.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from PIL import Image, ImageChops

try:  # pragma: no cover - optional dependency handled at runtime
    from playwright.sync_api import sync_playwright
except Exception:  # pylint: disable=broad-except
    sync_playwright = None  # type: ignore[assignment]

REPO_ROOT = Path(__file__).resolve().parents[2]
BASELINE_FILE = REPO_ROOT / "config" / "visual_baseline.json"
BASELINE_SNAPSHOT_DIR = REPO_ROOT / "logs" / "visual_baseline"
RUN_ROOT = REPO_ROOT / "logs" / "visual_runs"
DEFAULT_PAGES = {
    "dashboard": REPO_ROOT / "docs" / "index.html",
    "generator": REPO_ROOT / "docs" / "evo-tactics-pack" / "generator.html",
}
VIEWPORT = {"width": 1440, "height": 900}
DEFAULT_TOLERANCE = 0.08
DEFAULT_ENGINE = "auto"


@dataclass
class SnapshotResult:
    name: str
    output_path: Path
    diff_path: Path | None
    score: float

    def to_dict(self) -> dict[str, object]:
        return {
            "name": self.name,
            "output_path": str(self.output_path.relative_to(REPO_ROOT)),
            "diff_path": str(self.diff_path.relative_to(REPO_ROOT)) if self.diff_path else None,
            "score": self.score,
        }


@dataclass
class Signature:
    hash_hex: str
    width: int
    height: int
    checksum: str

    def to_dict(self) -> dict[str, object]:
        return {
            "hash": self.hash_hex,
            "width": self.width,
            "height": self.height,
            "checksum": self.checksum,
        }


def _ensure_ready() -> None:
    BASELINE_SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    RUN_ROOT.mkdir(parents=True, exist_ok=True)


def _capture_with_wkhtml(page_name: str, target: Path, output_path: Path) -> None:
    command = [
        "wkhtmltoimage",
        "--quality",
        "90",
        "--enable-local-file-access",
        target.resolve().as_uri(),
        str(output_path),
    ]
    result = subprocess.run(command, check=False, capture_output=True, text=True)
    if result.returncode != 0 and not output_path.exists():
        raise RuntimeError(
            f"wkhtmltoimage non è riuscito a catturare '{page_name}': {result.stderr.strip() or result.stdout.strip()}"
        )
    if result.returncode != 0:
        print(
            f"wkhtmltoimage ha restituito codice {result.returncode} per '{page_name}' ma il file è stato creato;"
            " controllare eventuali asset bloccati."
        )


def _capture(page_name: str, target: Path, output_path: Path, engine: str) -> None:
    if not target.exists():
        raise FileNotFoundError(f"Pagina '{page_name}' non trovata: {target}")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    selected_engine = engine
    if engine == "auto":
        selected_engine = "playwright" if sync_playwright is not None else "wkhtml"

    if selected_engine == "wkhtml":
        _capture_with_wkhtml(page_name, target, output_path)
        return

    if sync_playwright is None:
        raise RuntimeError("Playwright non disponibile: installare i browser con 'playwright install' o usare --engine wkhtml")

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            context = browser.new_context(viewport=VIEWPORT, device_scale_factor=1)
            page = context.new_page()
            page.goto(target.resolve().as_uri(), wait_until="load")
            page.wait_for_timeout(500)
            page.screenshot(path=output_path, full_page=True)
            context.close()
            browser.close()
    except Exception as exc:  # pylint: disable=broad-except
        if engine == "playwright":
            raise RuntimeError(
                f"Playwright non è riuscito a catturare '{page_name}': {exc}"  # noqa: TRY003
            ) from exc
        print(f"Playwright non disponibile ({exc}); fallback su wkhtmltoimage per '{page_name}'.")
        _capture_with_wkhtml(page_name, target, output_path)


def _difference_hash(image: Image.Image) -> str:
    resized = image.convert("L").resize((33, 32), Image.LANCZOS)
    pixels = list(resized.getdata())
    bits: list[str] = []
    for row in range(32):
        row_offset = row * 33
        for col in range(32):
            left = pixels[row_offset + col]
            right = pixels[row_offset + col + 1]
            bits.append("1" if left < right else "0")
    return hex(int("".join(bits), 2))[2:].rjust(256 // 4, "0")


def _compute_signature(image_path: Path) -> Signature:
    image = Image.open(image_path)
    hash_hex = _difference_hash(image)
    checksum = hashlib.sha256(image_path.read_bytes()).hexdigest()
    width, height = image.size
    return Signature(hash_hex=hash_hex, width=width, height=height, checksum=checksum)


def _hash_distance(left: str, right: str) -> float:
    if len(left) != len(right):
        raise ValueError("Hash baseline e corrente hanno lunghezze diverse")
    left_int = int(left, 16)
    right_int = int(right, 16)
    xor = left_int ^ right_int
    distance = bin(xor).count("1")
    total_bits = len(left) * 4
    return distance / total_bits


def _load_baseline_store() -> dict[str, Any]:
    if not BASELINE_FILE.exists():
        return {}
    return json.loads(BASELINE_FILE.read_text(encoding="utf-8"))


def _save_baseline_store(store: dict[str, Any]) -> None:
    BASELINE_FILE.write_text(json.dumps(store, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def _compare_images(baseline: Path, candidate: Path, diff_target: Path) -> Path | None:
    if not baseline.exists():
        return None
    base_image = Image.open(baseline).convert("RGB")
    cand_image = Image.open(candidate).convert("RGB")
    if base_image.size != cand_image.size:
        return None
    diff = ImageChops.difference(base_image, cand_image)
    if diff.getbbox() is None:
        return None
    diff_target.parent.mkdir(parents=True, exist_ok=True)
    diff.save(diff_target)
    return diff_target


def _select_pages(requested: Iterable[str] | None) -> dict[str, Path]:
    if requested is None:
        return DEFAULT_PAGES
    missing = set(requested) - set(DEFAULT_PAGES)
    if missing:
        raise ValueError(f"Pagine non riconosciute: {sorted(missing)}")
    return {name: DEFAULT_PAGES[name] for name in requested}


def record_baseline(pages: Iterable[str] | None, engine: str) -> None:
    _ensure_ready()
    store = _load_baseline_store()
    timestamp = datetime.now(tz=timezone.utc).isoformat()
    for name, target in _select_pages(pages).items():
        output_path = BASELINE_SNAPSHOT_DIR / f"{name}.png"
        _capture(name, target, output_path, engine)
        signature = _compute_signature(output_path)
        store[name] = {
            **signature.to_dict(),
            "engine": engine,
            "updated_at": timestamp,
        }
        # Conserva una miniatura base64 testuale per contesti senza file binari.
        with Image.open(output_path) as original:
            thumbnail = original.copy()
        thumbnail.thumbnail((180, 120))
        buffer_path = BASELINE_SNAPSHOT_DIR / f"{name}-thumb.jpg"
        thumbnail.save(buffer_path, format="JPEG", quality=60)
        store[name]["thumbnail_base64"] = base64.b64encode(buffer_path.read_bytes()).decode("ascii")
        thumbnail.close()
        buffer_path.unlink(missing_ok=True)
        print(f"Baseline aggiornata per '{name}': firma hash {signature.hash_hex[:16]}…")
    _save_baseline_store(store)


def compare_snapshots(pages: Iterable[str] | None, tolerance: float, engine: str) -> list[SnapshotResult]:
    _ensure_ready()
    store = _load_baseline_store()
    timestamp = datetime.now(tz=timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_dir = RUN_ROOT / timestamp
    results: list[SnapshotResult] = []
    for name, target in _select_pages(pages).items():
        if name not in store:
            raise FileNotFoundError(f"Baseline mancante per '{name}'. Eseguire 'record-baseline'.")
        baseline_entry = store[name]
        baseline_engine = str(baseline_entry.get("engine", DEFAULT_ENGINE))
        capture_engine = engine
        if engine == "auto":
            capture_engine = baseline_engine if baseline_engine in {"playwright", "wkhtml"} else DEFAULT_ENGINE
        elif engine != baseline_engine:
            raise RuntimeError(
                f"La baseline di '{name}' è stata registrata con il motore '{baseline_engine}',"
                f" ma il confronto richiede '{engine}'. Rigenerare la baseline o usare --engine {baseline_engine}."
            )
        output_path = run_dir / f"{name}.png"
        _capture(name, target, output_path, capture_engine)
        signature = _compute_signature(output_path)
        expected_width = baseline_entry.get("width")
        expected_height = baseline_entry.get("height")
        if (expected_width, expected_height) != (signature.width, signature.height):
            raise ValueError(
                f"Dimensioni diverse rispetto alla baseline per '{name}': {signature.width}x{signature.height} vs {expected_width}x{expected_height}"
            )
        score = _hash_distance(signature.hash_hex, baseline_entry["hash"])
        diff_file = _compare_images(BASELINE_SNAPSHOT_DIR / f"{name}.png", output_path, run_dir / f"{name}-diff.png")
        results.append(SnapshotResult(name=name, output_path=output_path, diff_path=diff_file, score=score))
    run_dir.mkdir(parents=True, exist_ok=True)
    report = {
        "run_at": datetime.now(tz=timezone.utc).isoformat(),
        "tolerance": tolerance,
        "results": [item.to_dict() for item in results],
    }
    (run_dir / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    return results


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Gestisce baseline e confronti visuali delle pagine statiche")
    subparsers = parser.add_subparsers(dest="command", required=True)

    base_parser = subparsers.add_parser("record-baseline", help="Rigenera gli snapshot baseline (solo hash testuali)")
    base_parser.add_argument("--pages", nargs="*", help="Pagine da catturare (default tutte)")
    base_parser.add_argument(
        "--engine",
        choices={"auto", "playwright", "wkhtml"},
        default=DEFAULT_ENGINE,
        help="Motore di rendering da usare per gli screenshot",
    )

    compare_parser = subparsers.add_parser("compare", help="Confronta gli snapshot correnti con la baseline testuale")
    compare_parser.add_argument("--pages", nargs="*", help="Pagine da confrontare (default tutte)")
    compare_parser.add_argument(
        "--tolerance",
        type=float,
        default=DEFAULT_TOLERANCE,
        help="Soglia massima accettata (distanza hash normalizzata) prima di segnalare regressioni",
    )
    compare_parser.add_argument(
        "--engine",
        choices={"auto", "playwright", "wkhtml"},
        default=DEFAULT_ENGINE,
        help="Motore di rendering da usare per gli screenshot",
    )

    args = parser.parse_args(argv)

    if args.command == "record-baseline":
        record_baseline(args.pages, args.engine)
    else:
        results = compare_snapshots(args.pages, args.tolerance, args.engine)
        offenders = [item for item in results if item.score > args.tolerance]
        for item in results:
            print(f"{item.name}: distanza_hash={item.score:.4f}")
        if offenders:
            formatted = ", ".join(f"{item.name} ({item.score:.3f})" for item in offenders)
            raise SystemExit(f"Regressioni visuali rilevate: {formatted}")
        print("Nessuna regressione visuale rilevata")


if __name__ == "__main__":
    main()
