"""Characterization tests for tools/py/vc_telemetry_harness.py (#2850 S3)."""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
TOOLS_PY = PROJECT_ROOT / "tools" / "py"
if str(TOOLS_PY) not in sys.path:
    sys.path.insert(0, str(TOOLS_PY))

import vc_telemetry_harness as h  # noqa: E402


def make_fakes(debrief_payload, tutorial=(200, None)):
    """Scripted fake runner endpoints. Returns (state, fake_get, fake_post, fake_detect)."""
    state = {"end_calls": 0, "start_body": None, "debrief_url": None}
    tut_default = {
        "units": [{"id": "e_rubro", "species": "rubrospina-velox"}, {"id": "pg1"}],
        "hazard_tiles": [],
        "sistema_pressure_start": 75,
    }
    def fake_get(url):
        if "/api/tutorial/" in url:
            st, payload = tutorial
            return st, (tut_default if payload is None else payload)
        if "/debrief" in url:
            state["debrief_url"] = url
            return debrief_payload
        raise AssertionError("unexpected GET " + url)
    def fake_post(url, body):
        if url.endswith("/api/session/start"):
            state["start_body"] = body
            return 200, {"session_id": "s1", "state": {"r": 1}}
        if url.endswith("/api/session/end"):
            state["end_calls"] += 1
            return 200, {}
        raise AssertionError("unexpected POST " + url)
    def fake_detect(s, tld):
        return "victory"
    return state, fake_get, fake_post, fake_detect


def test_clamp01():
    assert h._clamp01(0.5) == 0.5
    assert h._clamp01(-1) == 0.0
    assert h._clamp01(2) == 1.0
    assert h._clamp01(0) == 0.0
    assert h._clamp01(1) == 1.0


def test_index_value():
    assert h._index_value(None) == (None, None)
    assert h._index_value({"value": 0.4, "coverage": "partial"}) == (0.4, "partial")
    assert h._index_value({"value": "x", "coverage": "c"}) == (None, "c")
    assert h._index_value(0.7) == (0.7, "full")
    assert h._index_value("junk") == (None, None)
    assert h._index_value({"value": True}) == (True, None)


def test_constants():
    assert h.DERIVABLE_INDICES == ["aggro", "risk", "explore"]
    assert h.NON_DERIVABLE_INDICES == ["cohesion", "setup", "tilt"]
    assert sorted(h.SCENARIOS) == ["badlands_ambient_01", "badlands_elite_01", "foresta_pilot_01"]
    assert h.SCENARIOS["badlands_ambient_01"]["targets"] == {"rubrospina-velox", "ferriscroba-detrita"}
    assert h.SCENARIOS["badlands_elite_01"]["targets"] == {"ferrimordax-rutilus"}
    assert h.SCENARIOS["foresta_pilot_01"]["targets"] == {"nebulocornis-mollis", "arboryxis-lenis"}


def test_run_one_vc_happy(monkeypatch):
    deb = (200, {"vc_per_actor": {
        "e_rubro": {"aggregate_indices": {
            "aggro": {"value": 0.6, "coverage": "partial"},
            "risk": 0.3,
            "explore": {"value": 1.5, "coverage": "full"},
            "cohesion": None, "tilt": {"value": None}, "setup": None}},
        "pg1": {"aggregate_indices": {"aggro": {"value": 0.9, "coverage": "full"}}}}})
    state, g, p, d = make_fakes(deb)
    monkeypatch.setattr(h.runner, "get", g)
    monkeypatch.setattr(h.runner, "post", p)
    monkeypatch.setattr(h.runner, "detect_outcome", d)

    r = h.run_one_vc("http://x", "enc_x", "cls_x", {"rubrospina-velox"}, 7, 12)
    assert r["outcome"] == "victory"
    assert r["samples"] == {"rubrospina-velox": {
      "aggro": {"values": [0.6], "coverage": {"partial"}},
      "risk": {"values": [0.3], "coverage": {"full"}},
      "explore": {"values": [1.5], "coverage": {"full"}}}}

    assert state["start_body"]["seed"] == 7
    assert state["start_body"]["modulation"] == "full"
    assert state["start_body"]["encounter"] == {"id": "enc_x"}
    assert state["start_body"]["encounter_class"] == "cls_x"
    assert state["start_body"]["sistema_pressure_start"] == 75
    assert "outcome=victory" in state["debrief_url"]
    assert state["end_calls"] == 1


def test_run_one_vc_fetch_fail(monkeypatch):
    state, g, p, d = make_fakes(None, tutorial=(500, "boom"))
    monkeypatch.setattr(h.runner, "get", g)
    monkeypatch.setattr(h.runner, "post", p)
    monkeypatch.setattr(h.runner, "detect_outcome", d)

    r = h.run_one_vc("http://x", "enc_x", "cls_x", {"rubrospina-velox"}, None, 12)
    assert r == {"error": "fetch scenario failed: boom"}


def test_run_one_vc_telemetry_null(monkeypatch):
    deb = (200, {"vc_per_actor": None})
    state, g, p, d = make_fakes(deb)
    monkeypatch.setattr(h.runner, "get", g)
    monkeypatch.setattr(h.runner, "post", p)
    monkeypatch.setattr(h.runner, "detect_outcome", d)

    r = h.run_one_vc("http://x", "enc_x", "cls_x", {"rubrospina-velox"}, None, 12)
    assert r == {"error": "debrief telemetry unavailable (status=200, vc_per_actor=null)"}
    assert state["end_calls"] == 1
    assert "seed" not in state["start_body"]


def test_run_one_vc_telemetry_wrong_type(monkeypatch):
    deb = (200, {"vc_per_actor": ["x"]})
    state, g, p, d = make_fakes(deb)
    monkeypatch.setattr(h.runner, "get", g)
    monkeypatch.setattr(h.runner, "post", p)
    monkeypatch.setattr(h.runner, "detect_outcome", d)

    r = h.run_one_vc("http://x", "enc_x", "cls_x", {"rubrospina-velox"}, None, 12)
    assert r == {"error": "debrief telemetry unavailable (status=200, vc_per_actor=list)"}
