"""Worker persistente per il bridge Node -> Python del rules engine.

Espone due azioni JSON line su stdin/stdout:

- ``hydrate-encounter``: riceve ``{encounter, party, seed, session_id,
  encounter_id?, hostile_species_ids?, hostile_trait_ids?}`` e restituisce
  un ``CombatState`` iniziale conforme a ``combat.schema.json``.
- ``resolve-action``: riceve ``{state, action, seed, namespace?}`` e
  restituisce ``{next_state, turn_log_entry}`` dopo aver risolto l'azione
  con ``namespaced_rng(seed, namespace)``. Il ``namespace`` di default e'
  ``"attack"``.

Il pattern di handshake (``ready`` all'avvio, ``heartbeat`` periodico,
``response`` per ogni richiesta, ``shutdown`` per chiusura pulita) e'
identico a ``services/generation/worker.py`` per coerenza operativa e
per permettere al bridge Node di riusare lo stesso protocollo.

Il catalog ``trait_mechanics.yaml`` viene caricato una sola volta al boot
del worker e riutilizzato tra le richieste. Il path di default e'
``packs/evo_tactics_pack/data/balance/trait_mechanics.yaml`` relativo alla
root del repo; e' sovrascrivibile via env ``RULES_TRAIT_MECHANICS_PATH``
per scenari di test.
"""
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

# ``tools/py`` contiene ``game_utils.random_utils`` usato dal resolver.
_TOOLS_PY = REPO_ROOT / "tools" / "py"
if _TOOLS_PY.exists() and str(_TOOLS_PY) not in sys.path:
    sys.path.insert(0, str(_TOOLS_PY))

from game_utils.random_utils import namespaced_rng  # noqa: E402
from services.rules.hydration import (  # noqa: E402
    hydrate_encounter,
    load_trait_mechanics,
)
from services.rules.resolver import resolve_action  # noqa: E402

try:  # pragma: no cover - non disponibile su Python < 3.7
    sys.stdout.reconfigure(line_buffering=True)  # type: ignore[attr-defined]
except AttributeError:  # pragma: no cover - fallback legacy
    pass

_HEARTBEAT_INTERVAL_MS = max(
    1000,
    int(os.environ.get("RULES_WORKER_HEARTBEAT_INTERVAL_MS", "5000")),
)

_DEFAULT_MECHANICS_PATH = (
    REPO_ROOT
    / "packs"
    / "evo_tactics_pack"
    / "data"
    / "balance"
    / "trait_mechanics.yaml"
)

_DEFAULT_RNG_NAMESPACE = "attack"


class RulesWorkerError(Exception):
    """Errore gestito dal worker: il messaggio viene serializzato al caller."""


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


def _resolve_mechanics_path() -> Path:
    env_path = os.environ.get("RULES_TRAIT_MECHANICS_PATH")
    if env_path:
        return Path(env_path)
    return _DEFAULT_MECHANICS_PATH


def _load_catalog() -> Dict[str, Any]:
    path = _resolve_mechanics_path()
    if not path.exists():
        raise RulesWorkerError(f"trait_mechanics.yaml non trovato: {path}")
    return load_trait_mechanics(path)


def _validate_str(payload: Mapping[str, Any], key: str) -> str:
    value = payload.get(key)
    if not isinstance(value, str) or not value:
        raise RulesWorkerError(f"campo obbligatorio mancante o non stringa: {key}")
    return value


def _handle_hydrate(payload: Mapping[str, Any], catalog: Mapping[str, Any]) -> Dict[str, Any]:
    encounter = payload.get("encounter")
    party = payload.get("party")
    if not isinstance(encounter, Mapping):
        raise RulesWorkerError("payload.encounter deve essere un oggetto")
    if not isinstance(party, list):
        raise RulesWorkerError("payload.party deve essere una lista")

    seed = _validate_str(payload, "seed")
    session_id = _validate_str(payload, "session_id")

    encounter_id = payload.get("encounter_id")
    if encounter_id is not None and not isinstance(encounter_id, str):
        raise RulesWorkerError("payload.encounter_id deve essere stringa o null")

    hostile_species_ids = payload.get("hostile_species_ids")
    hostile_trait_ids = payload.get("hostile_trait_ids")
    if hostile_species_ids is not None and not isinstance(hostile_species_ids, list):
        raise RulesWorkerError("payload.hostile_species_ids deve essere lista o null")
    if hostile_trait_ids is not None and not isinstance(hostile_trait_ids, list):
        raise RulesWorkerError("payload.hostile_trait_ids deve essere lista o null")

    return hydrate_encounter(
        encounter=encounter,
        party=party,
        catalog=catalog,
        seed=seed,
        session_id=session_id,
        encounter_id=encounter_id,
        hostile_species_ids=hostile_species_ids,
        hostile_trait_ids=hostile_trait_ids,
    )


def _handle_resolve(payload: Mapping[str, Any], catalog: Mapping[str, Any]) -> Dict[str, Any]:
    state = payload.get("state")
    action = payload.get("action")
    if not isinstance(state, Mapping):
        raise RulesWorkerError("payload.state deve essere un oggetto CombatState")
    if not isinstance(action, Mapping):
        raise RulesWorkerError("payload.action deve essere un oggetto Action")

    seed = _validate_str(payload, "seed")
    namespace = payload.get("namespace") or _DEFAULT_RNG_NAMESPACE
    if not isinstance(namespace, str) or not namespace:
        raise RulesWorkerError("payload.namespace deve essere stringa non vuota")

    rng = namespaced_rng(seed, namespace)
    return resolve_action(state=state, action=action, catalog=catalog, rng=rng)


def _handle_request(
    catalog: Dict[str, Any],
    message: Mapping[str, Any],
) -> Dict[str, Any]:
    request_id = message.get("id")
    action = message.get("action")
    payload = message.get("payload") or {}

    response: Dict[str, Any] = {"type": "response", "id": request_id}

    try:
        if action == "hydrate-encounter":
            response["status"] = "ok"
            response["result"] = _handle_hydrate(payload, catalog)
            return response
        if action == "resolve-action":
            response["status"] = "ok"
            response["result"] = _handle_resolve(payload, catalog)
            return response
        if action == "shutdown":
            response["status"] = "ok"
            response["result"] = {"message": "shutdown"}
            return response
        raise RulesWorkerError(f"Azione non supportata: {action}")
    except RulesWorkerError as error:
        response["status"] = "error"
        response["error"] = str(error)
        response["code"] = "RULES_ERROR"
    except Exception as error:  # pragma: no cover - difetti runtime
        response["status"] = "error"
        response["error"] = str(error)
        response["code"] = "UNEXPECTED_ERROR"
        traceback.print_exc()
    return response


def _serve_once() -> int:
    catalog = _load_catalog()
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
                _emit(_handle_request(catalog, message))
                return 0

            response = _handle_request(catalog, message)
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
