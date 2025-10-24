#!/usr/bin/env python3
"""Utility per sincronizzare conversazioni ChatGPT.

Lo script può interrogare l'API di OpenAI, importare un export manuale o
scaricare una pagina web (ad esempio il progetto condiviso su chatgpt.com).
Ogni istantanea viene salvata in una cartella datata all'interno di
``data/chatgpt`` con metadati e diff automatici. Gli errori sono registrati nel
file ``logs/chatgpt_sync.log``.
"""

from __future__ import annotations

import argparse
import datetime as dt
import difflib
import json
import logging
import os
import re
import shutil
import sys
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple, Union

SNAPSHOT_ROOT = Path("data/chatgpt")
LOG_FILE = Path("logs/chatgpt_sync.log")
DEFAULT_MODEL = "gpt-4o-mini"
SUMMARY_FILE = Path("logs/chatgpt_sync_last.json")

Payload = Union[Dict[str, Any], str, bytes]


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


def ensure_snapshot_dir(
    namespace: Optional[str] = None, date: Optional[dt.date] = None
) -> Path:
    """Return the directory where the snapshot should be stored."""

    if date is None:
        date = dt.date.today()

    base_dir = SNAPSHOT_ROOT
    if namespace:
        base_dir = base_dir / slugify(namespace)

    snapshot_dir = base_dir / date.isoformat()
    snapshot_dir.mkdir(parents=True, exist_ok=True)
    return snapshot_dir


def slugify(value: str) -> str:
    """Create a filesystem-friendly slug from ``value``."""

    slug = re.sub(r"[^a-zA-Z0-9-_]+", "-", value.strip())
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug.lower()


def save_snapshot(
    data: Payload,
    suffix: str = "json",
    *,
    namespace: Optional[str] = None,
    label: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Path:
    """Save the snapshot data in the dated directory."""

    snapshot_dir = ensure_snapshot_dir(namespace)
    timestamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    base_name = f"snapshot-{timestamp}"
    if label:
        base_name = f"{base_name}-{slugify(label)}"
    snapshot_path = snapshot_dir / f"{base_name}.{suffix}"

    if isinstance(data, bytes):
        snapshot_path.write_bytes(data)
    elif isinstance(data, str):
        snapshot_path.write_text(data, encoding="utf-8")
    elif isinstance(data, dict):
        snapshot_path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    else:
        raise ValueError(f"Formato non supportato per il salvataggio: {type(data)!r}")

    meta_payload: Dict[str, Any] = {
        "created_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "namespace": namespace,
        "suffix": suffix,
        "snapshot_path": str(snapshot_path.resolve()),
    }
    if metadata:
        meta_payload.update(metadata)

    metadata_path = snapshot_path.parent / f"{snapshot_path.stem}.metadata.json"
    metadata_path.write_text(
        json.dumps(meta_payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    logging.info("Snapshot salvato in %s", snapshot_path)
    return snapshot_path


def copy_export_file(source: Path, *, namespace: Optional[str] = None) -> Path:
    """Copy the export file into the dated snapshot directory."""

    if not source.exists():
        raise FileNotFoundError(f"File di export non trovato: {source}")

    source_resolved = source.resolve()
    exports_root = (Path("data/exports").resolve())

    # Se il file proviene già dalla directory radice degli export, evitiamo di
    # duplicarlo e riutilizziamo direttamente il percorso canonico. In questo
    # modo manteniamo un'unica copia del file nel repository.
    try:
        source_resolved.relative_to(exports_root)
    except ValueError:
        pass
    else:
        logging.info(
            "Export già presente in %s, utilizzo il percorso originale",
            source_resolved,
        )
        return source_resolved

    snapshot_dir = ensure_snapshot_dir(namespace)
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


def import_export(export_file: Path, *, namespace: Optional[str] = None) -> Dict[str, Any]:
    """Import data from a manual ChatGPT export file."""

    copied_path = copy_export_file(export_file, namespace=namespace)
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


def fetch_from_web(
    url: str,
    *,
    method: str = "GET",
    headers: Optional[Dict[str, str]] = None,
    body: Optional[str] = None,
    timeout: int = 60,
) -> Tuple[str, Dict[str, Any]]:
    """Download a web page and return the text plus metadata."""

    try:
        import requests  # type: ignore
    except ImportError as exc:  # pragma: no cover - dipende dall'ambiente
        raise RuntimeError(
            "Libreria 'requests' non installata. Eseguire 'pip install requests'."
        ) from exc

    response = requests.request(
        method.upper(), url, headers=headers, data=body, timeout=timeout
    )
    response.raise_for_status()
    metadata = {
        "source": "web",
        "url": url,
        "status_code": response.status_code,
        "headers": dict(response.headers),
    }
    return response.text, metadata


def _parse_header(header: str) -> Tuple[str, str]:
    if ":" not in header:
        raise ValueError(
            "Le intestazioni devono essere nel formato 'Nome: Valore'. Ricevuto: %s"
            % header
        )
    name, value = header.split(":", 1)
    return name.strip(), value.strip()


def _load_lines(path: Path) -> List[str]:
    text = path.read_text(encoding="utf-8")
    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        return text.splitlines()
    formatted = json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True)
    return formatted.splitlines()


def _collect_snapshot_files(namespace: Optional[str] = None) -> List[Path]:
    base_dir = SNAPSHOT_ROOT
    if namespace:
        base_dir = base_dir / namespace
    if not base_dir.exists():
        return []
    snapshots: List[Path] = []
    for path in base_dir.rglob("snapshot-*"):
        if path.is_file() and not path.name.endswith("metadata.json"):
            snapshots.append(path)
    return sorted(snapshots, key=lambda p: str(p))


def _detect_namespace(snapshot: Path) -> Optional[str]:
    try:
        rel = snapshot.resolve().relative_to(SNAPSHOT_ROOT.resolve())
    except ValueError:
        return None
    parts = rel.parts
    if not parts:
        return None
    first = parts[0]
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", first):
        return None
    return first


def find_previous_snapshot(
    new_snapshot: Path, *, namespace: Optional[str] = None
) -> Optional[Path]:
    """Find the previous snapshot within the same namespace."""

    if namespace is None:
        namespace = _detect_namespace(new_snapshot)

    snapshots = _collect_snapshot_files(namespace)
    previous: Optional[Path] = None
    for candidate in snapshots:
        if candidate.resolve() == new_snapshot.resolve():
            return previous
        previous = candidate.resolve()
    return None


def build_diff(previous: Path, current: Path, *, context: int = 3) -> Iterable[str]:
    prev_lines = _load_lines(previous)
    curr_lines = _load_lines(current)
    return difflib.unified_diff(
        prev_lines,
        curr_lines,
        fromfile=str(previous),
        tofile=str(current),
        n=context,
        lineterm="",
    )


def write_diff_report(
    new_snapshot: Path,
    *,
    namespace: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Path]]:
    previous = find_previous_snapshot(new_snapshot, namespace=namespace)
    if previous is None:
        logging.info(
            "Nessuno snapshot precedente trovato per %s: skip diff", new_snapshot
        )
        return None

    namespace = namespace or _detect_namespace(new_snapshot)
    diff_lines = list(build_diff(previous, new_snapshot, context=5))

    date_folder = new_snapshot.parent.name
    report_dir = Path("docs/chatgpt_changes")
    if namespace:
        report_dir = report_dir / namespace
    report_dir = report_dir / date_folder
    report_dir.mkdir(parents=True, exist_ok=True)

    diff_path = report_dir / f"{new_snapshot.stem}.diff"
    diff_text = "\n".join(diff_lines)
    if diff_text:
        diff_text += "\n"
    diff_path.write_text(diff_text, encoding="utf-8")

    added = sum(1 for line in diff_lines if line.startswith("+") and not line.startswith("+++"))
    removed = sum(1 for line in diff_lines if line.startswith("-") and not line.startswith("---"))
    summary_lines = [
        f"# Report snapshot {new_snapshot.stem}",
        "",
        f"- **Namespace:** {namespace or 'default'}",
        f"- **Data cartella:** {date_folder}",
        f"- **File snapshot:** `{new_snapshot}`",
        f"- **File diff:** `{diff_path}`",
        f"- **Linee aggiunte:** {added}",
        f"- **Linee rimosse:** {removed}",
    ]
    if metadata:
        summary_lines.append("- **Origine:** %s" % metadata.get("source", "n/d"))
        if metadata.get("url"):
            summary_lines.append(f"- **URL:** {metadata['url']}")
        if metadata.get("name"):
            summary_lines.append(f"- **Fonte configurazione:** {metadata['name']}")
        if metadata.get("namespace_requested"):
            summary_lines.append(
                f"- **Namespace configurato:** {metadata['namespace_requested']}"
            )
        if metadata.get("model"):
            summary_lines.append(f"- **Modello:** {metadata['model']}")
        if metadata.get("stored_path"):
            summary_lines.append(f"- **Export salvato:** {metadata['stored_path']}")
        if metadata.get("original_export"):
            summary_lines.append(
                f"- **Export originale:** {metadata['original_export']}"
            )

    if diff_lines:
        summary_lines.append("\n## Estratto diff")
        summary_lines.extend("    " + line for line in diff_lines[:40])
        if len(diff_lines) > 40:
            summary_lines.append("    ...")
    else:
        summary_lines.append("\n_Nessuna differenza rispetto allo snapshot precedente._")

    summary_path = report_dir / f"{new_snapshot.stem}.md"
    summary_path.write_text("\n".join(summary_lines) + "\n", encoding="utf-8")

    logging.info("Diff scritto in %s", diff_path)
    return {"diff": diff_path, "summary": summary_path}


def parse_arguments(argv: Optional[list[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sincronizza conversazioni ChatGPT")
    parser.add_argument(
        "--source",
        choices=("api", "export", "web"),
        help="Fonte dei dati: 'api', 'export' o 'web'",
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
    parser.add_argument(
        "--namespace",
        help="Sottocartella opzionale dentro data/chatgpt dove salvare lo snapshot",
    )
    parser.add_argument(
        "--label",
        help="Etichetta da includere nel nome del file dello snapshot",
    )
    parser.add_argument(
        "--url",
        help="URL da scaricare quando la sorgente è 'web'",
    )
    parser.add_argument(
        "--method",
        default="GET",
        help="Metodo HTTP da usare per la sorgente 'web' (default: GET)",
    )
    parser.add_argument(
        "--header",
        action="append",
        default=[],
        help="Header HTTP aggiuntivi per la sorgente 'web' (formato 'Nome: Valore')",
    )
    parser.add_argument(
        "--body",
        help="Body opzionale per la richiesta HTTP (solo sorgente 'web')",
    )
    parser.add_argument(
        "--config",
        type=Path,
        help="File di configurazione (YAML/JSON) con più fonti da sincronizzare",
    )
    parser.add_argument(
        "--summary-file",
        type=Path,
        default=SUMMARY_FILE,
        help="File JSON dove salvare il riepilogo dell'ultima sincronizzazione",
    )
    parser.add_argument(
        "--skip-diff",
        action="store_true",
        help="Non generare i diff automatici dopo il download",
    )
    return parser.parse_args(argv)


def _load_config(path: Path) -> Dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    if path.suffix.lower() in {".yaml", ".yml"}:
        try:
            import yaml  # type: ignore
        except ImportError as exc:  # pragma: no cover - dipende dall'ambiente
            raise RuntimeError(
                "Libreria 'pyyaml' non installata. Eseguire 'pip install pyyaml'."
            ) from exc
        return yaml.safe_load(text) or {}
    return json.loads(text)


def _resolve_export_path(value: str, base_dir: Path) -> Path:
    candidate = Path(value)
    if not candidate.is_absolute():
        candidate = (base_dir / candidate).resolve()
    return candidate


def process_single_source(
    *,
    source: str,
    namespace: Optional[str],
    label: Optional[str],
    prompt: Optional[str],
    model: str,
    export_file: Optional[Path],
    url: Optional[str],
    method: str,
    headers: Dict[str, str],
    body: Optional[str],
    skip_diff: bool,
    extra_metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    namespace_slug = slugify(namespace) if namespace else None
    metadata: Dict[str, Any] = {"source": source, "namespace": namespace_slug}
    if namespace:
        metadata["namespace_requested"] = namespace
    if extra_metadata:
        metadata.update(extra_metadata)

    if source == "api":
        if not prompt:
            raise ValueError("È necessario fornire un --prompt per la sorgente 'api'.")
        metadata.update({"model": model, "prompt": prompt})
        snapshot = fetch_from_api(prompt, model)
        snapshot_path = save_snapshot(
            snapshot,
            suffix="json",
            namespace=namespace_slug,
            label=label,
            metadata=metadata,
        )
    elif source == "export":
        if not export_file:
            raise ValueError(
                "È necessario fornire --export-file quando la sorgente è 'export'."
            )
        metadata.update({"export_file": str(export_file.resolve())})
        snapshot_info = import_export(export_file, namespace=namespace_slug)
        if "stored_path" in snapshot_info:
            metadata["stored_path"] = snapshot_info.get("stored_path")
        if "original_path" in snapshot_info:
            metadata["original_export"] = snapshot_info.get("original_path")
        snapshot_path = save_snapshot(
            snapshot_info,
            suffix="json",
            namespace=namespace_slug,
            label=label,
            metadata=metadata,
        )
    elif source == "web":
        if not url:
            raise ValueError("È necessario fornire --url quando la sorgente è 'web'.")
        metadata.update({"url": url, "method": method})
        text, extra_meta = fetch_from_web(
            url, method=method, headers=headers, body=body
        )
        metadata.update(extra_meta)
        if body:
            metadata["body_length"] = len(body)
        snapshot_path = save_snapshot(
            text,
            suffix="html",
            namespace=namespace_slug,
            label=label or "page",
            metadata=metadata,
        )
    else:  # pragma: no cover - argparse garantisce i valori
        raise ValueError(f"Sorgente non supportata: {source}")

    diff_paths: Optional[Dict[str, Path]] = None
    if not skip_diff:
        diff_paths = write_diff_report(
            snapshot_path, namespace=namespace_slug, metadata=metadata
        )

    return {
        "snapshot": str(snapshot_path),
        "metadata": metadata,
        "diff": {k: str(v) for k, v in diff_paths.items()} if diff_paths else None,
    }


def process_config(
    config_path: Path, *, summary_file: Path, skip_diff: bool
) -> List[Dict[str, Any]]:
    config = _load_config(config_path)
    sources = config.get("sources")
    if not sources:
        raise ValueError("Il file di configurazione non contiene la chiave 'sources'.")

    base_dir = config_path.parent.resolve()
    results: List[Dict[str, Any]] = []

    for entry in sources:
        name = entry.get("name") or entry.get("id") or "source"
        mode = entry.get("mode") or entry.get("source")
        if not mode:
            raise ValueError(f"Voce di configurazione senza 'mode': {entry}")
        namespace = entry.get("namespace")
        label = entry.get("label") or name
        prompt = entry.get("prompt")
        model = entry.get("model", DEFAULT_MODEL)
        export_path = entry.get("path") or entry.get("export_file")
        url = entry.get("url")
        method = entry.get("method", "GET")
        headers_data = entry.get("headers") or {}
        body = entry.get("body")

        headers: Dict[str, str]
        if isinstance(headers_data, dict):
            headers = {str(k): str(v) for k, v in headers_data.items()}
        elif isinstance(headers_data, list):
            headers = {}
            for header in headers_data:
                key, value = _parse_header(header)
                headers[key] = value
        else:
            raise ValueError(
                f"Formato di headers non supportato per la fonte '{name}': {headers_data!r}"
            )

        export_file = None
        if export_path:
            export_file = _resolve_export_path(str(export_path), base_dir)

        logging.info("Processo fonte configurata '%s' (%s)", name, mode)
        result = process_single_source(
            source=mode,
            namespace=namespace,
            label=label,
            prompt=prompt,
            model=model,
            export_file=export_file,
            url=url,
            method=method,
            headers=headers,
            body=body,
            skip_diff=skip_diff,
            extra_metadata={"name": name},
        )
        result["name"] = name
        results.append(result)

    record_summary(results, summary_file, config_path=config_path)
    return results


def record_summary(
    results: List[Dict[str, Any]], summary_file: Path, *, config_path: Optional[Path] = None
) -> None:
    summary_file.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "run_timestamp": dt.datetime.now(dt.timezone.utc).isoformat(),
        "config": str(config_path) if config_path else None,
        "results": results,
    }
    summary_file.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    logging.info("Riepilogo scritto in %s", summary_file)


def main(argv: Optional[list[str]] = None) -> int:
    setup_logging()
    args = parse_arguments(argv)

    try:
        if args.config:
            process_config(args.config, summary_file=args.summary_file, skip_diff=args.skip_diff)
        else:
            if not args.source:
                raise ValueError(
                    "Specificare --source oppure fornire un file di configurazione con --config."
                )

            headers = {name: value for name, value in map(_parse_header, args.header)}
            result = process_single_source(
                source=args.source,
                namespace=args.namespace,
                label=args.label,
                prompt=args.prompt,
                model=args.model,
                export_file=args.export_file,
                url=args.url,
                method=args.method,
                headers=headers,
                body=args.body,
                skip_diff=args.skip_diff,
            )
            record_summary([result], args.summary_file)
    except Exception as exc:
        logging.exception("Errore durante la sincronizzazione: %s", exc)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
