import json
import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parents[2]))

from scripts.api.telemetry_alerts import (
  AlertContextSchemaError,
  decode_alert_context,
  telemetry_alert_context,
  validate_alert_context,
)


def test_validate_alert_context_normalizes_payload():
  payload = {
    "mission_id": "alpha-01",
    "mission_tag": "deep-watch",
    "filters": {
      "threshold": 0.6,
      "roster": ["echo", "delta"],
      "mission_tags": ["deep-watch", "gamma-net"],
    },
    "alerts": [
      {
        "id": "risk-high:alpha-01",
        "severity": "warning",
        "message": "Risk EMA oltre soglia 0.60",
        "metadata": {"turn": 7},
      },
    ],
  }

  normalized = validate_alert_context(payload)
  assert normalized["mission_id"] == "alpha-01"
  assert normalized["mission_tag"] == "deep-watch"
  assert normalized["filters"] == {
    "threshold": pytest.approx(0.6),
    "roster": ["echo", "delta"],
    "mission_tags": ["deep-watch", "gamma-net"],
  }
  assert normalized["alerts"][0]["id"] == "risk-high:alpha-01"


def test_telemetry_alert_context_roundtrip():
  payload = {
    "mission_id": "alpha-02",
    "alerts": [
      {
        "id": "risk-high:alpha-02",
        "severity": "error",
        "message": "Critical threshold exceeded",
        "metadata": {"turn": 12, "weightedIndex": 0.71},
      },
    ],
  }

  encoded = telemetry_alert_context(payload)
  decoded = decode_alert_context(encoded)

  assert json.loads(json.dumps(decoded)) == validate_alert_context(payload)


@pytest.mark.parametrize(
  "payload, expected_error",
  [
    ({"mission_id": "", "alerts": []}, "mission_id"),
    ({"mission_id": "alpha", "alerts": [{"id": "a", "severity": "bad", "message": ""}]}, "severity"),
    ({"mission_id": "alpha", "alerts": [{"id": 3, "severity": "info", "message": "ciao"}]}, "alerts[0].id"),
    ({"mission_id": "alpha", "filters": {"threshold": "nope"}, "alerts": []}, "filters.threshold"),
  ],
)
def test_validate_alert_context_errors(payload, expected_error):
  with pytest.raises(AlertContextSchemaError) as excinfo:
    validate_alert_context(payload)
  assert expected_error in str(excinfo.value)
