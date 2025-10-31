"""Worker persistente per il bridge Node → Python del generation orchestrator."""
from __future__ import annotations

import json
import os
import sys
import threading
import time
import traceback
from pathlib import Path
from typing import Any, Dict, Mapping

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from services.generation.orchestrator import (  # noqa: E402
    GenerationError,
    GenerationOrchestrator,
    SpeciesBatchRequest,
    SpeciesGenerationRequest,
    build_trait_diagnostics,
)

try:  # pragma: no cover - non disponibile su Python < 3.7
    sys.stdout.reconfigure(line_buffering=True)  # type: ignore[attr-defined]
except AttributeError:  # pragma: no cover - fallback legacy
    pass

_HEARTBEAT_INTERVAL_MS = max(
    1000,
    int(os.environ.get("ORCHESTRATOR_WORKER_HEARTBEAT_INTERVAL_MS", "5000")),
)


def _emit(message: Mapping[str, Any]) -> None:
    sys.stdout.write(json.dumps(message, ensure_ascii=False))
    sys.stdout.write("\n")
    sys.stdout.flush()


def _heartbeat_loop(stop_event: threading.Event) -> None:
    payload = {"type": "heartbeat", "pid": os.getpid()}
    interval = _HEARTBEAT_INTERVAL_MS / 1000.0
    while not stop_event.wait(interval):
        payload["timestamp"] = time.time()
        try:
            _emit(payload)
        except Exception:  # pragma: no cover - log su stderr
            traceback.print_exc()
            return


def _handle_request(
    orchestrator: GenerationOrchestrator,
    message: Mapping[str, Any],
) -> Dict[str, Any]:
    request_id = message.get("id")
    action = message.get("action")
    payload = message.get("payload") or {}

    response: Dict[str, Any] = {"type": "response", "id": request_id}

    try:
        if action == "generate-species":
            request = SpeciesGenerationRequest.from_payload(payload)
            result = orchestrator.generate_species(request)
            response["status"] = "ok"
            response["result"] = result.to_payload()
            return response
        if action == "generate-species-batch":
            batch = SpeciesBatchRequest.from_payload(payload)
            result = orchestrator.generate_species_batch(batch.entries)
            response["status"] = "ok"
            response["result"] = result.to_payload()
            return response
        if action == "trait-diagnostics":
            diagnostics = build_trait_diagnostics()
            response["status"] = "ok"
            response["result"] = diagnostics
            return response
        if action == "shutdown":
            response["status"] = "ok"
            response["result"] = {"message": "shutdown"}
            return response
        raise ValueError(f"Azione non supportata: {action}")
    except GenerationError as error:
        response["status"] = "error"
        response["error"] = str(error)
        response["code"] = "GENERATION_ERROR"
    except Exception as error:  # pragma: no cover - difetti runtime
        response["status"] = "error"
        response["error"] = str(error)
        response["code"] = "UNEXPECTED_ERROR"
        traceback.print_exc()
    return response


def _serve_once() -> int:
    orchestrator = GenerationOrchestrator()
    _emit({"type": "ready", "pid": os.getpid()})

    stop_event = threading.Event()
    heartbeat_thread = threading.Thread(
        target=_heartbeat_loop, args=(stop_event,), daemon=True
    )
    heartbeat_thread.start()

    try:
        for raw_line in sys.stdin:
            line = raw_line.strip()
            if not line:
                continue
            try:
                message = json.loads(line)
            except json.JSONDecodeError:
                _emit(
                    {
                        "type": "response",
                        "status": "error",
                        "code": "INVALID_MESSAGE",
                        "error": "Messaggio JSON non valido",
                        "id": None,
                    }
                )
                continue

            if message.get("action") == "shutdown":
                _emit(_handle_request(orchestrator, message))
                return 0

            response = _handle_request(orchestrator, message)
            _emit(response)
    except KeyboardInterrupt:  # pragma: no cover - terminazione esterna
        return 0
    except Exception:
        raise
    finally:
        stop_event.set()
        heartbeat_thread.join(timeout=1.0)

    return 0


def main() -> int:
    backoff_seconds = 0.5
    while True:
        try:
            return _serve_once()
        except KeyboardInterrupt:  # pragma: no cover - terminazione esterna
            return 0
        except Exception:  # pragma: no cover - condizioni di crash inattese
            traceback.print_exc()
            time.sleep(backoff_seconds)
            backoff_seconds = min(backoff_seconds * 2, 5.0)


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
