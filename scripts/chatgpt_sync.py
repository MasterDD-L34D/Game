#!/usr/bin/env python3
"""Utility per sincronizzare conversazioni ChatGPT.

Lo script può interrogare l'API di OpenAI per salvare un'istantanea di una
conversazione o importare un export manuale. Ogni istantanea viene salvata in una
cartella datata all'interno di ``data/chatgpt``. Gli errori sono registrati nel
file ``logs/chatgpt_sync.log``.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import logging
import os
import shutil
import sys
from pathlib import Path
from typing import Any, Dict, Optional

SNAPSHOT_ROOT = Path("data/chatgpt")
LOG_FILE = Path("logs/chatgpt_sync.log")
DEFAULT_MODEL = "gpt-4o-mini"


def setup_logging() -> None:
    """Configure logging to write both to stdout and to the log file."""

    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)

    # Avoid duplicate handlers when the script is imported multiple times.
    if logger.handlers:
        return

    file_handler = logging.FileHandler(LOG_FILE, encoding="utf-8")
    file_handler.setFormatter(
        logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
    )
    logger.addHandler(file_handler)

    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(logging.Formatter("%(levelname)s: %(message)s"))
    logger.addHandler(stream_handler)


def ensure_snapshot_dir(date: Optional[dt.date] = None) -> Path:
    """Return the directory where the snapshot should be stored."""

    if date is None:
        date = dt.date.today()
    snapshot_dir = SNAPSHOT_ROOT / date.isoformat()
    snapshot_dir.mkdir(parents=True, exist_ok=True)
    return snapshot_dir


def save_snapshot(data: Dict[str, Any], suffix: str = "json") -> Path:
    """Save the snapshot data as JSON in the dated directory."""

    snapshot_dir = ensure_snapshot_dir()
    timestamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    snapshot_path = snapshot_dir / f"snapshot-{timestamp}.{suffix}"
    if suffix == "json":
        snapshot_path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    else:
        raise ValueError(f"Formato non supportato: {suffix}")
    logging.info("Snapshot salvato in %s", snapshot_path)
    return snapshot_path


def copy_export_file(source: Path) -> Path:
    """Copy the export file into the dated snapshot directory."""

    if not source.exists():
        raise FileNotFoundError(f"File di export non trovato: {source}")

    snapshot_dir = ensure_snapshot_dir()
    destination = snapshot_dir / source.name
    counter = 1
    while destination.exists():
        destination = snapshot_dir / f"{source.stem}-{counter}{source.suffix}"
        counter += 1
    shutil.copy2(source, destination)
    logging.info("Export copiato in %s", destination)
    return destination


def fetch_from_api(prompt: str, model: str = DEFAULT_MODEL) -> Dict[str, Any]:
    """Call the OpenAI API to obtain a ChatGPT response."""

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("Variabile d'ambiente OPENAI_API_KEY non impostata")

    try:
        import openai  # type: ignore
    except ImportError as exc:  # pragma: no cover - dipende dall'ambiente
        raise RuntimeError(
            "Libreria 'openai' non installata. Eseguire 'pip install openai'."
        ) from exc

    # Compatibilità con versioni diverse della libreria openai.
    response_content: str
    try:  # openai >=1.0.0
        from openai import OpenAI  # type: ignore

        client = OpenAI(api_key=api_key)
        response = client.responses.create(
            model=model,
            input=prompt,
        )
        response_content = response.output[0].content[0].text  # type: ignore[attr-defined]
    except Exception:  # pragma: no cover - fallback per versioni legacy
        openai.api_key = api_key
        completion = openai.ChatCompletion.create(  # type: ignore[attr-defined]
            model=model,
            messages=[{"role": "user", "content": prompt}],
        )
        response_content = completion["choices"][0]["message"]["content"]

    snapshot = {
        "source": "api",
        "model": model,
        "prompt": prompt,
        "response": response_content,
        "timestamp": dt.datetime.now(dt.timezone.utc).isoformat(),
    }
    return snapshot


def import_export(export_file: Path) -> Dict[str, Any]:
    """Import data from a manual ChatGPT export file."""

    copied_path = copy_export_file(export_file)
    snapshot = {
        "source": "export",
        "original_path": str(export_file.resolve()),
        "stored_path": str(copied_path.resolve()),
        "timestamp": dt.datetime.now(dt.timezone.utc).isoformat(),
    }

    if export_file.suffix.lower() == ".json":
        try:
            content = json.loads(export_file.read_text(encoding="utf-8"))
            snapshot["export_preview"] = content.get("conversations")
        except json.JSONDecodeError:
            logging.warning(
                "Impossibile decodificare il JSON; l'anteprima non sarà disponibile"
            )
    return snapshot


def parse_arguments(argv: Optional[list[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sincronizza conversazioni ChatGPT")
    parser.add_argument(
        "--source",
        choices=("api", "export"),
        required=True,
        help="Fonte dei dati: 'api' per interrogare OpenAI oppure 'export' per importare un file",
    )
    parser.add_argument(
        "--prompt",
        help="Prompt da inviare a ChatGPT quando la sorgente è 'api'",
    )
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help="Modello da utilizzare quando la sorgente è 'api'",
    )
    parser.add_argument(
        "--export-file",
        type=Path,
        help="Percorso del file di export da importare quando la sorgente è 'export'",
    )
    return parser.parse_args(argv)


def main(argv: Optional[list[str]] = None) -> int:
    setup_logging()
    args = parse_arguments(argv)

    try:
        if args.source == "api":
            if not args.prompt:
                raise ValueError("È necessario fornire un --prompt per la sorgente 'api'.")
            snapshot = fetch_from_api(args.prompt, args.model)
            save_snapshot(snapshot)
        elif args.source == "export":
            if not args.export_file:
                raise ValueError(
                    "È necessario fornire --export-file quando la sorgente è 'export'."
                )
            snapshot = import_export(args.export_file)
            save_snapshot(snapshot)
        else:  # pragma: no cover - case non raggiungibile con argparse
            raise ValueError(f"Sorgente non supportata: {args.source}")
    except Exception as exc:
        logging.exception("Errore durante la sincronizzazione: %s", exc)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
