"""Utility per l'endpoint telemetry.alert_context.

Il modulo fornisce funzioni per validare il payload degli alert HUD e
serializzarlo in forma compressa così da poter essere trasferito tra
servizi con un payload minimo. L'encoding è `base64(zlib(json))`.
"""

from __future__ import annotations

import base64
import json
import math
import zlib
from typing import Any, Dict, Mapping, MutableMapping, Sequence

ALLOWED_SEVERITIES = {"info", "warning", "error"}


class AlertContextSchemaError(ValueError):
  """Errore sollevato quando il payload non rispetta lo schema atteso."""


def _ensure_string(value: Any, field: str) -> str:
  if not isinstance(value, str) or not value.strip():
    raise AlertContextSchemaError(f"{field} deve essere una stringa non vuota")
  return value.strip()


def _normalize_json_value(value: Any, field: str) -> Any:
  if value is None or isinstance(value, (bool, int)):
    return value

  if isinstance(value, float):
    if not math.isfinite(value):
      raise AlertContextSchemaError(
        f"{field} contiene un valore numerico non finito, impossibile serializzare",
      )
    return value

  if isinstance(value, str):
    return value

  if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
    return [
      _normalize_json_value(item, f"{field}[{index}]")
      for index, item in enumerate(value)
    ]

  if isinstance(value, Mapping):
    normalized: Dict[str, Any] = {}
    for key, item in value.items():
      key_str = str(key)
      normalized[key_str] = _normalize_json_value(item, f"{field}.{key_str}")
    return normalized

  raise AlertContextSchemaError(
    f"{field} contiene un valore non serializzabile in JSON",
  )


def _validate_metadata(metadata: Any) -> Dict[str, Any]:
  if metadata is None:
    return {}
  if not isinstance(metadata, Mapping):
    raise AlertContextSchemaError("metadata deve essere un mapping")

  normalized: Dict[str, Any] = {}
  for key, value in metadata.items():
    key_str = str(key)
    normalized[key_str] = _normalize_json_value(value, f"metadata.{key_str}")

  return normalized


def _validate_alerts(alerts: Any) -> Sequence[Mapping[str, Any]]:
  if not isinstance(alerts, Sequence) or isinstance(alerts, (str, bytes)):
    raise AlertContextSchemaError("alerts deve essere una lista")

  normalized = []
  for index, raw in enumerate(alerts):
    if not isinstance(raw, Mapping):
      raise AlertContextSchemaError(f"alerts[{index}] deve essere un mapping")

    alert_id = _ensure_string(raw.get("id"), f"alerts[{index}].id")
    severity = _ensure_string(raw.get("severity"), f"alerts[{index}].severity")
    if severity not in ALLOWED_SEVERITIES:
      raise AlertContextSchemaError(
        f"alerts[{index}].severity deve essere una tra {sorted(ALLOWED_SEVERITIES)}",
      )

    message = _ensure_string(raw.get("message"), f"alerts[{index}].message")
    metadata = _validate_metadata(raw.get("metadata"))

    normalized.append(
      {
        "id": alert_id,
        "severity": severity,
        "message": message,
        "metadata": metadata,
      },
    )

  return normalized


def _validate_filters(filters: Any) -> Dict[str, Any]:
  if filters is None:
    return {}
  if not isinstance(filters, Mapping):
    raise AlertContextSchemaError("filters deve essere un mapping")

  normalized: MutableMapping[str, Any] = {}

  if "threshold" in filters:
    threshold = filters["threshold"]
    if not isinstance(threshold, (int, float)):
      raise AlertContextSchemaError("filters.threshold deve essere numerico")
    normalized["threshold"] = float(threshold)

  if "roster" in filters:
    roster = filters["roster"]
    if not isinstance(roster, Sequence) or isinstance(roster, (str, bytes)):
      raise AlertContextSchemaError("filters.roster deve essere una lista di stringhe")
    normalized["roster"] = [_ensure_string(member, "filters.roster[]") for member in roster]

  if "mission_tags" in filters:
    tags = filters["mission_tags"]
    if not isinstance(tags, Sequence) or isinstance(tags, (str, bytes)):
      raise AlertContextSchemaError("filters.mission_tags deve essere una lista di stringhe")
    normalized["mission_tags"] = [_ensure_string(tag, "filters.mission_tags[]") for tag in tags]

  return dict(normalized)


def validate_alert_context(payload: Mapping[str, Any]) -> Dict[str, Any]:
  """Valida il payload e restituisce una copia normalizzata."""

  if not isinstance(payload, Mapping):
    raise AlertContextSchemaError("Il payload deve essere un mapping")

  mission_id = _ensure_string(payload.get("mission_id"), "mission_id")
  mission_tag: str | None = None
  if payload.get("mission_tag") is not None:
    mission_tag = _ensure_string(payload.get("mission_tag"), "mission_tag")

  normalized: Dict[str, Any] = {
    "mission_id": mission_id,
    "alerts": list(_validate_alerts(payload.get("alerts", []))),
  }

  filters = _validate_filters(payload.get("filters"))
  if filters:
    normalized["filters"] = filters

  if mission_tag:
    normalized["mission_tag"] = mission_tag

  return normalized


def encode_alert_context(data: Mapping[str, Any]) -> str:
  """Serializza il payload validato in forma compressa."""

  raw = json.dumps(data, sort_keys=True, separators=(",", ":")).encode("utf-8")
  compressed = zlib.compress(raw, level=9)
  return base64.b64encode(compressed).decode("ascii")


def decode_alert_context(encoded: str) -> Dict[str, Any]:
  """Decodifica un payload precedentemente serializzato."""

  compressed = base64.b64decode(encoded)
  raw = zlib.decompress(compressed)
  return json.loads(raw.decode("utf-8"))


def telemetry_alert_context(payload: Mapping[str, Any]) -> str:
  """Endpoint logico per telemetry.alert_context."""

  normalized = validate_alert_context(payload)
  return encode_alert_context(normalized)


__all__ = [
  "ALLOWED_SEVERITIES",
  "AlertContextSchemaError",
  "decode_alert_context",
  "encode_alert_context",
  "telemetry_alert_context",
  "validate_alert_context",
]
