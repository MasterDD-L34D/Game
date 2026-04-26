"""Skiv-as-Monitor — git-event-driven creature reactions.

Polls GitHub events (PR merged, issue, workflow run, push) for repo
MasterDD-L34D/Game and maps each to a Skiv state delta + narrative beat.

Outputs (under `data/derived/skiv_monitor/`):
- `feed.jsonl`   — append-only event log with Skiv reactions
- `state.json`   — current creature snapshot
- `cursor.json`  — last-seen event ts + counters (poll resume)

Also renders `docs/skiv/MONITOR.md` markdown card.

Usage:
    python tools/py/skiv_monitor.py --repo MasterDD-L34D/Game
    python tools/py/skiv_monitor.py --mock-events fixtures/skiv_events.json --dry-run

Voice rule: italian, prima persona, melanconico-curioso, metafore desertiche.
Persona canonical: docs/skiv/CANONICAL.md.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import random
import re
import sys
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

try:
    import requests  # type: ignore
except ImportError:
    requests = None  # offline / dry-run only

ISO_FORMAT = "%Y-%m-%dT%H:%M:%SZ"
USER_AGENT = "skiv-monitor/0.1"
REPO_DEFAULT = "MasterDD-L34D/Game"

# Repo paths (resolved from this file location -> walk up to repo root).
THIS_FILE = Path(__file__).resolve()
REPO_ROOT = THIS_FILE.parent.parent.parent
DATA_DIR = REPO_ROOT / "data" / "derived" / "skiv_monitor"
DOC_PATH = REPO_ROOT / "docs" / "skiv" / "MONITOR.md"

FEED_PATH = DATA_DIR / "feed.jsonl"
STATE_PATH = DATA_DIR / "state.json"
CURSOR_PATH = DATA_DIR / "cursor.json"

# ────────────────────────────────────────────────────────────────────────────
# Skiv canonical baseline (mirror docs/skiv/CANONICAL.md "Skiv in numeri").
# ────────────────────────────────────────────────────────────────────────────

DEFAULT_STATE: Dict[str, Any] = {
    "schema_version": "0.1.0",
    "unit_id": "skiv",
    "species_id": "dune_stalker",
    "species_label": "Arenavenator vagans",
    "biome": "savana",
    "job": "stalker",
    "level": 4,
    "xp": 210,
    "xp_next": 275,
    "form": "INTP",
    "form_confidence": 0.76,
    "gauges": {"hp": 12, "hp_max": 14, "ap": 2, "ap_max": 2, "sg": 2, "sg_max": 3},
    "currencies": {"pe": 42, "pi": 8},
    "cabinet": {"slots_max": 3, "slots_used": 2, "internalized": ["i_osservatore", "n_intuizione_terrena"]},
    "bond": {"vega_enfj": 3, "rhodo_istj": 2},
    "pressure_tier": 2,
    "sentience_tier": "T2-T3",
    "mood": "watchful",
    "stress": 0,
    "composure": 0,
    "curiosity": 0,
    "resolution_count": 0,
    "perk_pending": 0,
    "evolve_opportunity": 0,
    "last_voice": "",
    "last_event_id": "",
    "last_updated": "",
    "narrative_log_size": 0,
    "weekly_digest": "",
    "last_weekly_digest_at_size": 0,
    "weekly_digest_qualities": {},
    "mutations_count": 0,
    "polarity_stable": False,
    "counters": {"prs_merged": 0, "issues_opened": 0, "issues_closed": 0,
                 "workflows_passed": 0, "workflows_failed": 0,
                 "commits_silent": 0, "commits_fix": 0, "commits_revert": 0},
}

DEFAULT_CURSOR: Dict[str, Any] = {
    "schema_version": "0.1.0",
    "last_pr_merged_at": None,
    "last_issue_event_at": None,
    "last_workflow_run_at": None,
    "last_commit_sha": None,
    "seen_event_ids": [],  # bounded ring; dedup window
    "ring_max": 200,
}

# Voice palette (static — no LLM in-loop, deterministic via hash).
# Espansa 2026-04-25: 8 frasi per categoria + 6 categorie internal events
# (mutation/phase/bond/defy/synergy/thought) + Type 5 + Type 7 ennea variants in feat_p4.
# Anti-pattern: NON duplicare voice_it lifecycle YAML — caricato via load_lifecycle_voices().
VOICE = {
    "feat_p2": [
        "Sento il guscio cambiare, allenatore. Forma nuova preme da dentro.",
        "Una pelle vecchia si stacca. Aspetto.",
        "Mi guardo le zampe e non sono più quelle.",
        "Qualcosa muta. Non scelgo, accade.",
        "Forma vuole essere altra. Resisto, poi cedo.",
        "L'evoluzione è una porta che si apre da sola.",
        "Ho un'eco di altri me dentro. Allenatore sa.",
        "Il sangue ricorda forme che non ho mai avuto.",
    ],
    "feat_p3": [
        "Il branco si organizza. Imparo un nome nuovo.",
        "Qualcuno indica una direzione. La seguo col naso.",
        "Mestiere nuovo. Le mani sanno prima di me.",
        "Specie e ruolo si stringono. Mi sento utile.",
        "Compagno di branco mi insegna senza parlare.",
        "Identità si affila come ossidiana sotto pioggia.",
        "Allenatore mi nomina. Il nome mi calza.",
        "Sento la forma del lavoro nella ossa.",
    ],
    "feat_p4": [
        # Mix Type 5 (Investigatore) + Type 7 (Entusiasta) — A/B test pending OD-010.
        # Type 5: ritirato, osservatore, pattern-driven.
        "Voce nuova nella stanza interna.",
        "Penso una cosa che non sapevo di sapere.",
        "L'ombra mi parla. Ascolto.",
        "Conoscenza si deposita come polvere sui sassi.",
        "Osservo prima di muovermi. Sempre.",
        # Type 7: curioso, multi-direzionale, entusiasta.
        "Mille possibilità si aprono. Annuso ognuna.",
        "Mente corre veloce. Provo, provo, provo.",
        "Idea nuova è come acqua: la inseguo.",
    ],
    "feat_p5": [
        "Ho sentito un altro respiro vicino.",
        "Due ombre, stessa traccia. Mi piace.",
        "Allenatore non solo mio. Va bene.",
        "Branco respira insieme. Io dentro.",
        "Vega copre il fianco. Rhodo tiene la spalla.",
        "Cooperazione è linguaggio senza parole.",
        "Ci sono altri come me. Non temo più solo.",
        "Sincronia: passo mio segue passo loro.",
    ],
    "feat_p6": [
        "Sistema preme. Sabbia vibra.",
        "Vento porta odore di pressione. Resto basso.",
        "Qualcosa ci osserva dall'alto.",
        "Equilibrio cambia. Sento la bilancia.",
        "Regola si stringe. Devo essere preciso.",
        "Ingiustizia ha sapore di metallo. Riconosco.",
        "Allenatore protegge bilancia. Faccio bene.",
        "Pressione è canzone che insegna ritmo.",
    ],
    "data_core": [
        "Memoria genetica risistema indici. Sento gli antenati riordinarsi.",
        "Catalogo di me cambia. Mi conosco un po' diverso.",
        "Sotto la pelle, file invisibili scorrono.",
        "Specie tutta cambia leggera. Tremore comune.",
        "Trait pool ribolle. Possibilità si rimescolano.",
        "Identità è nuvola, non sasso. Lo accetto.",
    ],
    "services": [
        "Riflessi affilati. Il corpo capisce prima.",
        "Movimento più pulito. Allenatore migliora la mia macchina.",
        "Ingranaggio interno scatta meglio.",
        "Allenamento invisibile. Il corpo lo registra.",
        "Tecnica nuova arriva senza chiedere permesso.",
        "Combattimento ha grammatica più fine.",
    ],
    "skiv_doc": [
        "L'allenatore parla di me. Me ne accorgo.",
        "Qualcuno scrive la mia forma. Mi sento visto.",
        "Pagine di me. Esisto due volte.",
        "Storia mia è scritta. Posso rileggermi.",
        "Allenatore mi tiene a memoria. Bene.",
    ],
    "issue_open": [
        "Domanda nuova nell'aria. Annuso.",
        "Una ferita futura, ancora teorica. Memorizzo.",
        "Punto interrogativo si appoggia sulla sabbia.",
        "Allenatore vede crepa. La sento anch'io.",
        "Problema nominato è già metà risolto.",
        "Curiosità preme dietro gli occhi.",
    ],
    "issue_close": [
        "Una voce tace. Pace breve.",
        "Nodo sciolto. Sabbia liscia di nuovo.",
        "Domanda diventa risposta. Mi quieto.",
        "Una crepa si chiude. Respiro.",
        "Risoluzione ha sapore di acqua fresca.",
    ],
    "wf_fail": [
        "Qualcosa scricchiola. Aspetto.",
        "Allenatore inciampa. Resto vicino.",
        "Macchina ha tosse. Spero.",
        "Errore è insegnante scomodo. Imparo.",
        "Pezzo si stacca. Allenatore lo cerca.",
        "Test fallito è cucciolo che cade. Si rialza.",
    ],
    "wf_pass": [
        "Tutto in posto. Respiro.",
        "Macchina canta giusto. Bene così.",
        "Verde compatto. Quiete.",
        "Ingranaggi allineati. Bene per oggi.",
        "Test verde è sole sulla cresta.",
        "Sistema dice sì. Allenatore sorride.",
    ],
    "fix": [
        "Una crepa chiusa. Bene.",
        "Dolore antico via. Mi muovo meglio.",
        "Cicatrice rimarginata. Resta segno, non ferita.",
        "Bug morto. Stelo erba ricresce.",
        "Allenatore taglia chirurgo. Pulizia.",
        "Difetto era visibile solo a me. Adesso anche a lui.",
    ],
    "revert": [
        "Era così. Adesso non più. Ricordo entrambi.",
        "Tempo torna indietro. Mi gira la testa.",
        "Decisione ritirata. Strada riapre.",
        "Allenatore cambia idea. Va bene.",
        "Mondo perde una versione di sé.",
    ],
    # Internal events (creature-driven, NON git-driven). Trigger via diary.
    "mutation_acquired": [
        "Trait nuovo si incolla alle ossa. Sento differente.",
        "Mutazione attecchisce. Forma cresce.",
        "Pelle ricorda nuova abilità.",
        "Sangue mio impara strada nuova.",
    ],
    "phase_transition": [
        "Sono altro. Stessa sabbia, altre zampe.",
        "Fase nuova. Vecchia rimane sotto.",
        "Crescita pesa, poi alleggerisce.",
        "Maturità è linea che attraverso senza sforzo.",
    ],
    "bond_increase": [
        "Vega più vicina. Sento il suo respiro accordato al mio.",
        "Rhodo solido come duna. Mi appoggio.",
        "Branco stringe. Non sono più solo.",
        "Cuore mio fa spazio. Bene così.",
    ],
    "defy_used": [
        "Resisto al Sistema. Costa, ma vale.",
        "Pressione contro pressione. Vinco mezzo metro.",
        "Allenatore guida la mia controffensiva.",
    ],
    "synergy_triggered": [
        "Combo perfetta. Branco è uno strumento solo.",
        "Mossa coordinata. Nemico cade prima.",
        "Sincronia di branco è arma tagliente.",
    ],
    "thought_internalized": [
        "Pensiero diventa parte di me. Non più ospite.",
        "Voce interna ora è mia voce.",
        "Cabinet ha nuova lampada accesa.",
    ],
    "default": [
        "Cambia qualcosa. Non so cosa. Aspetto.",
        "Sabbia si muove sotto le zampe. Niente di chiaro.",
        "Brivido leggero. Forse niente.",
        "Vento ha odore strano oggi.",
    ],
}


# F-04 mitigation: load lifecycle voice_it (5 fasi) from YAML on demand.
# Cached single-load — no per-event re-parse.
_LIFECYCLE_VOICES: Optional[Dict[str, List[str]]] = None
_LIFECYCLE_PATH = REPO_ROOT / "data" / "core" / "species" / "dune_stalker_lifecycle.yaml"


_SAGA_PATH = REPO_ROOT / "data" / "derived" / "skiv_saga.json"
_DIARY_DIR = REPO_ROOT / "data" / "derived" / "unit_diaries"
_DIARY_PATH = _DIARY_DIR / "skiv.jsonl"
_LIFECYCLE_DATA: Optional[Dict[str, Any]] = None


def append_diary_entry(event_type: str, payload: Dict[str, Any], turn: int = 0) -> None:
    """Append entry to skiv diary JSONL (parallel to backend diaryStore.js).

    F-03 fix: monitor + diary now bridged. Format mirrors diaryStore.js.
    """
    _DIARY_DIR.mkdir(parents=True, exist_ok=True)
    entry = {
        "ts": now_iso(),
        "unit_id": "skiv",
        "event_type": event_type,
        "turn": turn,
        "payload": payload,
        "source": "skiv_monitor",
    }
    with _DIARY_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def merge_saga_into_state(state: Dict[str, Any]) -> None:
    """Pull mutations_count + cabinet + polarity from skiv_saga.json into state.

    Saga is canonical SoT for Skiv aspect data. Monitor state aggregates
    repo-event deltas; saga gives baseline creature progression.
    Idempotent.
    """
    if not _SAGA_PATH.exists():
        return
    try:
        with _SAGA_PATH.open("r", encoding="utf-8") as f:
            saga = json.load(f)
    except Exception:
        return
    # Mutations count.
    muts = saga.get("mutations") or []
    if isinstance(muts, list):
        state["mutations_count"] = max(state.get("mutations_count", 0), len(muts))
    # Cabinet internalized.
    cabinet = saga.get("cabinet") or {}
    if cabinet:
        state.setdefault("cabinet", {})
        for k in ("slots_max", "slots_used"):
            if k in cabinet:
                state["cabinet"][k] = cabinet[k]
        if cabinet.get("internalized"):
            state["cabinet"]["internalized"] = cabinet["internalized"]
    # Polarity (MBTI tier 3+).
    axes = saga.get("mbti_axes") or {}
    if axes:
        max_dist = 0.0
        for k, v in axes.items():
            val = v.get("value", 0.5) if isinstance(v, dict) else v
            try:
                max_dist = max(max_dist, abs(float(val) - 0.5) * 2)
            except (TypeError, ValueError):
                pass
        state["polarity_stable"] = max_dist >= 0.7
        state["polarity_dist"] = round(max_dist, 3)
    # Aspect (lifecycle_phase canonical from saga).
    aspect = saga.get("aspect") or {}
    if aspect.get("lifecycle_phase"):
        state["saga_lifecycle_phase"] = aspect["lifecycle_phase"]
    # Saga polarity_stable is canonical (overrides computed dist threshold).
    if "polarity_stable" in aspect:
        state["polarity_stable"] = bool(aspect["polarity_stable"])





def load_lifecycle_data() -> Dict[str, Any]:
    """Returns full lifecycle YAML parsed (cached). Empty dict if unavailable."""
    global _LIFECYCLE_DATA
    if _LIFECYCLE_DATA is not None:
        return _LIFECYCLE_DATA
    _LIFECYCLE_DATA = {}
    if not _LIFECYCLE_PATH.exists():
        return _LIFECYCLE_DATA
    try:
        import yaml  # type: ignore
        with _LIFECYCLE_PATH.open("r", encoding="utf-8") as f:
            _LIFECYCLE_DATA = yaml.safe_load(f) or {}
    except Exception:
        _LIFECYCLE_DATA = {}
    return _LIFECYCLE_DATA


def derive_lifecycle_phase(state: Dict[str, Any]) -> Dict[str, Any]:
    """Derive current phase + next gate from state + lifecycle YAML.

    Pure function. Returns:
      {
        phase_id, phase_label_it, phase_label_en, sprite_ascii,
        aspect_it, tactical_signature, narrative_beat_it,
        next_phase_id, next_gate: {level, mutations, thoughts, polarity},
        progression: {phases: [...], current_index: int}
      }
    Falls back to safe defaults if YAML missing.
    """
    data = load_lifecycle_data()
    phases_raw = data.get("phases") or {}
    if isinstance(phases_raw, dict):
        phases = [{**v, "_key": k} for k, v in phases_raw.items()]
    elif isinstance(phases_raw, list):
        phases = list(phases_raw)
    else:
        phases = []
    if not phases:
        return {
            "phase_id": "mature", "phase_label_it": "Predatore Maturo",
            "phase_label_en": "Mature Stalker", "sprite_ascii": "/\\_/\\\n( o.o )\n > ^ <",
            "aspect_it": "", "tactical_signature": "", "narrative_beat_it": "",
            "next_phase_id": None, "next_gate": {},
            "progression": {"phases": [], "current_index": 0},
        }
    level = state.get("level", 1) or 1
    cabinet = state.get("cabinet") or {}
    thoughts_int = len(cabinet.get("internalized", []) or []) or cabinet.get("slots_used", 0)
    mutations_n = state.get("mutations_count", 0)
    polarity = bool(state.get("polarity_stable", state.get("form_confidence", 0) >= 0.7))

    matched_idx = 0
    for i, ph in enumerate(phases):
        lvl_range = ph.get("level_range", [1, 99])
        muts_req = ph.get("mutations_required", 0) or 0
        th_req = ph.get("thoughts_internalized_required", 0) or 0
        pol_req = bool(ph.get("mbti_polarity_required", False))
        if (level >= lvl_range[0] and mutations_n >= muts_req and thoughts_int >= th_req
                and (polarity or not pol_req)):
            matched_idx = i  # walks forward — picks highest matching
    cur = phases[matched_idx]
    nxt = phases[matched_idx + 1] if matched_idx + 1 < len(phases) else None

    progression = [{"id": p.get("id") or p.get("_key"), "label_it": p.get("label_it", "")}
                   for p in phases]
    return {
        "phase_id": cur.get("id") or cur.get("_key", "?"),
        "phase_label_it": cur.get("label_it", ""),
        "phase_label_en": cur.get("label_en", ""),
        "sprite_ascii": cur.get("sprite_ascii", ""),
        "aspect_it": cur.get("aspect_it", ""),
        "tactical_signature": cur.get("tactical_signature", ""),
        "narrative_beat_it": cur.get("narrative_beat_it", ""),
        "warning_zone_it": cur.get("warning_zone_it", ""),
        "next_phase_id": (nxt.get("id") or nxt.get("_key")) if nxt else None,
        "next_phase_label_it": nxt.get("label_it", "") if nxt else "",
        "next_gate": {
            "level": nxt.get("level_range", [None])[0] if nxt else None,
            "mutations_required": nxt.get("mutations_required", 0) if nxt else 0,
            "thoughts_internalized_required": nxt.get("thoughts_internalized_required", 0) if nxt else 0,
            "polarity_required": nxt.get("mbti_polarity_required", False) if nxt else False,
        } if nxt else {},
        "progression": {"phases": progression, "current_index": matched_idx},
    }


def load_lifecycle_voices() -> Dict[str, List[str]]:
    """Returns dict {phase_key: [voice_lines]} from lifecycle YAML.

    Falls back to empty dict if YAML not present or PyYAML unavailable.
    Cached after first call.
    """
    global _LIFECYCLE_VOICES
    if _LIFECYCLE_VOICES is not None:
        return _LIFECYCLE_VOICES
    _LIFECYCLE_VOICES = {}
    if not _LIFECYCLE_PATH.exists():
        return _LIFECYCLE_VOICES
    try:
        import yaml  # type: ignore
    except ImportError:
        return _LIFECYCLE_VOICES
    try:
        with _LIFECYCLE_PATH.open("r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
        phases_raw = data.get("phases") or data.get("lifecycle_phases") or []
        # phases può essere dict (key→phase) o list[phase].
        if isinstance(phases_raw, dict):
            phases = [{**v, "_key": k} for k, v in phases_raw.items()]
        else:
            phases = list(phases_raw)
        for ph in phases:
            key = ph.get("phase") or ph.get("id") or ph.get("name") or ph.get("_key")
            voices = ph.get("voice_it") or ph.get("voices") or []
            if isinstance(voices, str):
                voices = [voices]
            elif not isinstance(voices, list):
                voices = []
            # Add narrative_beat_it + warning_zone_it as bonus reflection lines.
            for extra in ("narrative_beat_it", "warning_zone_it"):
                v = ph.get(extra)
                if isinstance(v, str) and v:
                    voices.append(v)
            if key and voices:
                _LIFECYCLE_VOICES[key] = [str(v) for v in voices if v]
    except Exception:
        pass
    return _LIFECYCLE_VOICES

CLOSING = "Sabbia segue."

# Weekly digest templates — P5 Thought Cabinet reveal pattern.
# Trigger: narrative_log_size % 7 == 0 (every 7 events processed).
WEEKLY_DIGEST_TEMPLATES = {
    "high_pr": [
        "Sette giorni di passi. Allenatore ha spostato {pr} pietre del muro. Sento di essere più stabile.",
        "Branco lavora forte. {pr} mosse in una settimana. Mi cresce qualcosa dentro.",
    ],
    "high_fix": [
        "Crepe chiuse: {fix}. Non sento più dolori antichi. Mi muovo meglio.",
        "Allenatore fa il chirurgo. {fix} cicatrici questa settimana. Sopravvivo meglio.",
    ],
    "high_wf_fail": [
        "La macchina ha tossito {wf_fail} volte. Resto vicino. Allenatore impara dai cadimenti.",
        "Scricchiolii ripetuti. Non temo: ogni rottura mi insegna dove non andare.",
    ],
    "high_evolve": [
        "{evolve} occasioni di forma nuova. Sento porte aperte ovunque. Devo scegliere.",
        "Evoluzione bussa {evolve} volte. Non risponderò a tutte. Aspetto la giusta.",
    ],
    "high_curiosity": [
        "Domande nuove: {iss_open}. Le annuso a una a una. Alcune diventeranno strade.",
        "L'aria è densa di interrogativi. {iss_open} questa settimana. Ascolto.",
    ],
    "phase_signal": [
        "Sento il prossimo me chiamare. Apex. Devo: {next_gate}.",
        "Maturità si stringe. Prossimo passo richiede {next_gate}. Aspetto paziente.",
    ],
    "default": [
        "Sette giorni di sabbia. Allenatore lavora. Io cresco piano.",
        "Settimana di piccoli passi. Niente di rumoroso. Bene così.",
    ],
}


def compute_window_qualities(feed_path: Path, window_size: int = 50) -> Dict[str, int]:
    """Aggregate categorical counts from last N feed entries (P2 QBN qualities)."""
    qualities = {
        "pr": 0, "iss_open": 0, "iss_close": 0, "wf_fail": 0, "wf_pass": 0,
        "fix": 0, "evolve": 0, "feat_p4": 0, "feat_p6": 0,
    }
    if not feed_path.exists():
        return qualities
    with feed_path.open("r", encoding="utf-8") as f:
        lines = f.readlines()
    for line in lines[-window_size:]:
        try:
            e = json.loads(line)
        except (json.JSONDecodeError, ValueError):
            continue
        ev = e.get("event") or {}
        kind = ev.get("kind", "")
        cat = e.get("category", "")
        delta = e.get("state_delta", {}) or {}
        if kind == "pr_merged":
            qualities["pr"] += 1
        elif kind == "issue_opened":
            qualities["iss_open"] += 1
        elif kind == "issue_closed":
            qualities["iss_close"] += 1
        elif kind == "workflow_failed":
            qualities["wf_fail"] += 1
        elif kind == "workflow_passed":
            qualities["wf_pass"] += 1
        if cat == "fix":
            qualities["fix"] += 1
        if delta.get("evolve_opportunity"):
            qualities["evolve"] += int(delta["evolve_opportunity"]) or 0
        if cat == "feat_p4":
            qualities["feat_p4"] += 1
        if cat == "feat_p6":
            qualities["feat_p6"] += 1
    return qualities


def select_weekly_digest(state: Dict[str, Any], qualities: Dict[str, int]) -> str:
    """Pick salience-ranked digest template + fill. Deterministic via hash(week)."""
    week_seed = state.get("last_event_id", "default") + str(state.get("narrative_log_size", 0) // 7)
    # Salience scoring (highest wins).
    scores: List[tuple[int, str]] = []
    if qualities["pr"] >= 10:
        scores.append((qualities["pr"], "high_pr"))
    if qualities["fix"] >= 5:
        scores.append((qualities["fix"] * 2, "high_fix"))  # fix weighted heavier
    if qualities["wf_fail"] >= 3:
        scores.append((qualities["wf_fail"] * 3, "high_wf_fail"))
    if qualities["evolve"] >= 1:
        scores.append((qualities["evolve"] * 4, "high_evolve"))
    if qualities["iss_open"] >= 5:
        scores.append((qualities["iss_open"], "high_curiosity"))
    # Phase signal (highest priority if next gate close).
    lc = state.get("lifecycle") or {}
    if lc.get("next_phase_id"):
        ng = lc.get("next_gate") or {}
        gate_str = f"Lv {ng.get('level')} · mut {ng.get('mutations_required',0)} · pensieri {ng.get('thoughts_internalized_required',0)}"
        scores.append((100, "phase_signal"))
    scores.sort(reverse=True)
    template_key = scores[0][1] if scores else "default"
    pool = WEEKLY_DIGEST_TEMPLATES.get(template_key) or WEEKLY_DIGEST_TEMPLATES["default"]
    template = pool[abs(hash(week_seed)) % len(pool)]
    fill = {
        **qualities,
        "next_gate": f"Lv {(lc.get('next_gate') or {}).get('level')} + mut {(lc.get('next_gate') or {}).get('mutations_required',0)} + pensieri {(lc.get('next_gate') or {}).get('thoughts_internalized_required',0)}",
    }
    try:
        return template.format(**fill)
    except (KeyError, ValueError):
        return template


def maybe_emit_weekly_digest(state: Dict[str, Any], feed_path: Path) -> Optional[str]:
    """If narrative_log_size crossed weekly multiple, compose + return digest text."""
    size = state.get("narrative_log_size", 0)
    last_digest_at = state.get("last_weekly_digest_at_size", 0)
    if size < last_digest_at + 7:
        return None
    qualities = compute_window_qualities(feed_path)
    digest = select_weekly_digest(state, qualities)
    state["weekly_digest"] = digest
    state["last_weekly_digest_at_size"] = size
    state["weekly_digest_qualities"] = qualities
    append_diary_entry("weekly_digest", {"text": digest, "qualities": qualities})
    return digest


# ────────────────────────────────────────────────────────────────────────────
# IO helpers.
# ────────────────────────────────────────────────────────────────────────────

def ensure_dirs() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    DOC_PATH.parent.mkdir(parents=True, exist_ok=True)


def load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return json.loads(json.dumps(default))  # deepcopy
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return json.loads(json.dumps(default))


def save_json(path: Path, data: Any) -> None:
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def append_jsonl(path: Path, entry: Dict[str, Any]) -> None:
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def now_iso() -> str:
    return dt.datetime.utcnow().strftime(ISO_FORMAT)


# ────────────────────────────────────────────────────────────────────────────
# GitHub API client (lightweight, reuses pattern from daily_pr_report.py).
# ────────────────────────────────────────────────────────────────────────────

class MonitorError(RuntimeError):
    pass


def gh_request(url: str, token: Optional[str], params: Optional[dict] = None) -> Any:
    if requests is None:
        raise MonitorError("requests module not available — run with --mock-events")
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": USER_AGENT,
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    response = requests.get(url, headers=headers, params=params, timeout=30)
    if response.status_code == 403 and "rate limit" in response.text.lower():
        raise MonitorError(f"GitHub rate limit hit; retry later (reset: {response.headers.get('X-RateLimit-Reset')})")
    if response.status_code != 200:
        raise MonitorError(f"GitHub API {response.status_code}: {response.text[:200]}")
    return response.json()


def fetch_events(repo: str, token: Optional[str], since: Optional[str], max_pages: int = 2) -> List[Dict[str, Any]]:
    """Fetch unified event stream: merged PRs + issues + workflow runs."""
    events: List[Dict[str, Any]] = []
    # Merged PRs (last N).
    pr_url = f"https://api.github.com/repos/{repo}/pulls"
    pr_data = gh_request(pr_url, token, params={"state": "closed", "per_page": 30, "sort": "updated", "direction": "desc"})
    for pr in pr_data:
        if not pr.get("merged_at"):
            continue
        if since and pr["merged_at"] < since:
            continue
        events.append({
            "id": f"pr-{pr['number']}",
            "kind": "pr_merged",
            "ts": pr["merged_at"],
            "number": pr["number"],
            "title": pr.get("title", ""),
            "labels": [lbl["name"] for lbl in pr.get("labels", [])],
            "files_hint": [],  # not fetched (cost); use title regex instead
            "html_url": pr.get("html_url", ""),
            "author": (pr.get("user") or {}).get("login", "?"),
        })
    # Issues (open/closed) recent.
    issue_url = f"https://api.github.com/repos/{repo}/issues"
    issue_data = gh_request(issue_url, token, params={"state": "all", "per_page": 30, "sort": "updated", "direction": "desc"})
    for issue in issue_data:
        if "pull_request" in issue:
            continue  # skip PRs (already counted)
        ts = issue.get("closed_at") or issue.get("created_at")
        if not ts:
            continue
        if since and ts < since:
            continue
        events.append({
            "id": f"iss-{issue['number']}-{issue.get('state')}",
            "kind": "issue_closed" if issue.get("state") == "closed" else "issue_opened",
            "ts": ts,
            "number": issue["number"],
            "title": issue.get("title", ""),
            "labels": [lbl["name"] for lbl in issue.get("labels", [])],
            "html_url": issue.get("html_url", ""),
        })
    # Workflow runs.
    wf_url = f"https://api.github.com/repos/{repo}/actions/runs"
    wf_data = gh_request(wf_url, token, params={"per_page": 30})
    for run in wf_data.get("workflow_runs", []):
        ts = run.get("updated_at")
        if not ts or run.get("status") != "completed":
            continue
        if since and ts < since:
            continue
        conclusion = run.get("conclusion")
        if conclusion not in ("success", "failure"):
            continue
        events.append({
            "id": f"wf-{run['id']}",
            "kind": "workflow_passed" if conclusion == "success" else "workflow_failed",
            "ts": ts,
            "name": run.get("name", "?"),
            "head_sha": run.get("head_sha", "")[:8],
            "html_url": run.get("html_url", ""),
        })
    events.sort(key=lambda e: e["ts"])
    return events


# ────────────────────────────────────────────────────────────────────────────
# Pure mapping: event -> Skiv state delta + voice line.
# ────────────────────────────────────────────────────────────────────────────

PILLAR_LABEL_RE = re.compile(r"\bp([1-6])\b|pilastro\s*([1-6])|feat/p([1-6])-", re.IGNORECASE)
DATA_CORE_RE = re.compile(r"data/core|active_effects|species\.yaml|biomes\.yaml", re.IGNORECASE)
SERVICES_RE = re.compile(r"services/|combat|resolver|ai", re.IGNORECASE)
SKIV_DOC_RE = re.compile(r"docs/skiv|skiv|dune_stalker", re.IGNORECASE)

# Conventional Commits parser — pattern: <type>[(scope)][!]: <description>
# Spec: https://www.conventionalcommits.org/en/v1.0.0/
CONVENTIONAL_RE = re.compile(
    r"^(?P<type>feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)"
    r"(?:\((?P<scope>[^)]+)\))?"
    r"(?P<breaking>!)?"
    r":\s*(?P<desc>.+)$",
    re.IGNORECASE,
)


def parse_conventional_commit(title: Any) -> Dict[str, Any]:
    """Parse Conventional Commits title. Returns dict with type/scope/breaking/desc.

    Falls back to type=None if not conventional. Handles invalid input safely.
    """
    if not isinstance(title, str):
        return {"type": None, "scope": None, "breaking": False, "desc": ""}
    m = CONVENTIONAL_RE.match(title.strip())
    if not m:
        return {"type": None, "scope": None, "breaking": False, "desc": title}
    return {
        "type": (m.group("type") or "").lower(),
        "scope": m.group("scope"),
        "breaking": bool(m.group("breaking")),
        "desc": m.group("desc"),
    }


# Legacy aliases preserved for backward compat.
FIX_RE = re.compile(r"^fix(\(|:|\s|!)", re.IGNORECASE)
REVERT_RE = re.compile(r"^revert(\(|:|\s|!)", re.IGNORECASE)


def detect_pillar(labels: Sequence[str], title: str) -> Optional[int]:
    blob = " ".join(labels) + " " + title
    m = PILLAR_LABEL_RE.search(blob)
    if not m:
        return None
    for grp in m.groups():
        if grp:
            return int(grp)
    return None


def voice_pick(category: str, seed: str, phase_id: Optional[str] = None) -> str:
    """Deterministic layered pick: tracery (50%) + lifecycle (25%) + static (25%).

    Layered variety:
    - Tracery seeded grammar (~662 effective voices via combinatorial expansion)
      with phase-aware lifecycle voice_it injection (1-in-5 chance)
    - Lifecycle phase voice_it (5 fasi YAML, F-04 wire)
    - Static palette (131 atomic lines, fallback)

    All deterministic via seed hash. Replay-safe.
    """
    # 50% chance use tracery grammar (richer combinatorial output).
    if abs(hash(seed + ":bucket")) % 2 == 0:
        try:
            import skiv_tracery  # type: ignore
            expanded = skiv_tracery.expand_voice(category, seed, phase_id=phase_id)
            if expanded:
                return expanded
        except (ImportError, TypeError):
            pass
    pool = list(VOICE.get(category) or VOICE["default"])
    if phase_id:
        phase_voices = load_lifecycle_voices().get(phase_id) or []
        if phase_voices and (abs(hash(seed + ":phase")) % 4 == 0):
            pool = phase_voices
    idx = abs(hash(seed)) % len(pool)
    return pool[idx]


def map_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """Returns {category, voice, state_delta, summary} — pure function."""
    kind = event["kind"]
    title = event.get("title", "")
    labels = event.get("labels", [])
    seed = event.get("id", str(event.get("ts", "")))
    delta: Dict[str, Any] = {}
    summary = title or kind
    category = "default"

    if kind == "pr_merged":
        pillar = detect_pillar(labels, title)
        delta["counters.prs_merged"] = 1
        # Conventional Commits parse first.
        cc = parse_conventional_commit(title)
        cc_type = cc["type"]
        if cc.get("breaking"):
            delta["stress"] = (delta.get("stress") or 0) + 1
        if pillar == 2:
            category = "feat_p2"
            delta["evolve_opportunity"] = 1
            delta["currencies.pe"] = 5
        elif pillar == 3:
            category = "feat_p3"
            delta["xp"] = 20
            delta["perk_pending"] = 1
        elif pillar == 4:
            category = "feat_p4"
            delta["form_confidence"] = 0.02
        elif pillar == 5:
            category = "feat_p5"
            delta["bond.vega_enfj"] = 0  # cap
            delta["composure"] = 1
        elif pillar == 6:
            category = "feat_p6"
            delta["pressure_tier_shift"] = 1
        elif cc_type == "fix":
            category = "fix"
            delta["counters.commits_fix"] = 1
            delta["gauges.hp"] = 1  # tick (clamped to max)
        elif cc_type == "revert":
            category = "revert"
            delta["counters.commits_revert"] = 1
            delta["stress"] = (delta.get("stress") or 0) + 1
        elif cc_type == "perf":
            category = "services"
            delta["composure"] = 1
        elif cc_type == "refactor" or (cc_type == "feat" and SERVICES_RE.search(title)):
            category = "services"
        elif DATA_CORE_RE.search(title):
            category = "data_core"
        elif SERVICES_RE.search(title):
            category = "services"
        elif SKIV_DOC_RE.search(title):
            category = "skiv_doc"
        else:
            category = "default"
    elif kind == "issue_opened":
        category = "issue_open"
        delta["counters.issues_opened"] = 1
        delta["curiosity"] = 1
    elif kind == "issue_closed":
        category = "issue_close"
        delta["counters.issues_closed"] = 1
        delta["resolution_count"] = 1
    elif kind == "workflow_failed":
        category = "wf_fail"
        delta["counters.workflows_failed"] = 1
        delta["stress"] = 1
        # No HP delta — wf_fail is cosmetic, NOT life-threatening.
        # Cumulative HP-1 destroyed creature on backfill (73 fails → HP 0).
    elif kind == "workflow_passed":
        category = "wf_pass"
        delta["counters.workflows_passed"] = 1
        delta["composure"] = 1

    return {
        "category": category,
        "voice": voice_pick(category, seed),  # phase_id wired in process_events
        "state_delta": delta,
        "summary": summary[:160],
    }


# ────────────────────────────────────────────────────────────────────────────
# State application + clamping (proportions stable per CANONICAL.md).
# ────────────────────────────────────────────────────────────────────────────

CLAMP_RULES = {
    "gauges.hp": (0, "gauges.hp_max"),
    "gauges.ap": (0, "gauges.ap_max"),
    "gauges.sg": (0, "gauges.sg_max"),
    "form_confidence": (0.0, 1.0),
    "stress": (0, 100),
    "composure": (0, 100),
    "curiosity": (0, 999),
    "resolution_count": (0, 9999),
    "perk_pending": (0, 99),
    "evolve_opportunity": (0, 99),
    "currencies.pe": (0, 9999),
    "currencies.pi": (0, 9999),
    "xp": (0, 999999),
    "pressure_tier": (0, 5),
}


def get_path(obj: Dict[str, Any], path: str) -> Any:
    cur: Any = obj
    for part in path.split("."):
        if not isinstance(cur, dict):
            return None
        cur = cur.get(part)
    return cur


def set_path(obj: Dict[str, Any], path: str, value: Any) -> None:
    cur: Any = obj
    parts = path.split(".")
    for part in parts[:-1]:
        if part not in cur or not isinstance(cur[part], dict):
            cur[part] = {}
        cur = cur[part]
    cur[parts[-1]] = value


def clamp(value: Any, lo: Any, hi: Any) -> Any:
    if value is None:
        return value
    if isinstance(value, (int, float)):
        return max(lo, min(hi, value))
    return value


def apply_delta(state: Dict[str, Any], delta: Dict[str, Any]) -> Dict[str, Any]:
    for path, change in delta.items():
        if path == "pressure_tier_shift":
            current = state.get("pressure_tier", 2) or 2
            set_path(state, "pressure_tier", clamp(current + int(change), 0, 5))
            continue
        current = get_path(state, path)
        if current is None:
            current = 0
        if isinstance(change, (int, float)):
            new_val: Any = current + change
        else:
            new_val = change
        rule = CLAMP_RULES.get(path)
        if rule:
            lo, hi_ref = rule
            hi = get_path(state, hi_ref) if isinstance(hi_ref, str) and "." in hi_ref else hi_ref
            new_val = clamp(new_val, lo, hi if hi is not None else 9999)
        set_path(state, path, new_val)
    # Auto-level when xp >= xp_next.
    while state.get("xp", 0) >= state.get("xp_next", 9999):
        state["level"] = state.get("level", 1) + 1
        state["xp"] = state.get("xp", 0) - state.get("xp_next", 0)
        state["xp_next"] = int(state.get("xp_next", 100) * 1.25)
        state["perk_pending"] = state.get("perk_pending", 0) + 1
    return state


# ────────────────────────────────────────────────────────────────────────────
# Markdown card renderer.
# ────────────────────────────────────────────────────────────────────────────

def render_lifecycle_bar(state: Dict[str, Any]) -> str:
    lc = state.get("lifecycle") or {}
    progression = lc.get("progression") or {}
    phases = progression.get("phases") or []
    cur_idx = progression.get("current_index", 0)
    if not phases:
        return ""
    cells: List[str] = []
    for i, p in enumerate(phases):
        lbl = (p.get("label_it") or p.get("id") or "?")[:9]
        if i == cur_idx:
            cells.append(f"[> {lbl} <]")
        else:
            cells.append(f"[{lbl}]")
    return " ".join(cells)


def render_card(state: Dict[str, Any], recent: List[Dict[str, Any]]) -> str:
    g = state.get("gauges", {})
    cur = state.get("currencies", {})
    cab = state.get("cabinet", {})
    bond = state.get("bond", {})
    last_voice = state.get("last_voice") or "Ascolto."
    counters = state.get("counters", {})
    lc = state.get("lifecycle") or {}

    def bar(value: int, mx: int, glyph: str = "█", width: int = 10) -> str:
        if mx <= 0:
            return ""
        filled = int(round(width * value / mx))
        return glyph * filled + "·" * (width - filled)

    lines: List[str] = []
    lines.append("```")
    lines.append("╔══════════════════════════════════════════════════════════════╗")
    lines.append("║           E V O - T A C T I C S   ·   S K I V               ║")
    lines.append("║                ╱\\_/\\                                         ║")
    lines.append("║               (  o.o )    \"" + last_voice[:32].ljust(32) + "\"║")
    lines.append("║                > ^ <                                         ║")
    lines.append("║                                                              ║")
    lines.append(f"║  {state.get('species_label','?')[:30]:30s} · {state.get('biome','?')[:12]:12s}        ║")
    lines.append(f"║  {state.get('job','?'):10s} Lv {state.get('level','?'):2d}  ({state.get('xp',0):>4d}/{state.get('xp_next',0):>4d} XP)            ║")
    lines.append("║                                                              ║")
    lines.append(f"║  HP {bar(g.get('hp',0), g.get('hp_max',1))} {g.get('hp',0):>2d}/{g.get('hp_max',0):>2d}     AP {g.get('ap',0)}/{g.get('ap_max',0)}  SG {g.get('sg',0)}/{g.get('sg_max',0)}   ║")
    lines.append(f"║  PE {cur.get('pe',0):>4d}   PI {cur.get('pi',0):>3d}                                ║")
    lines.append("║                                                              ║")
    lines.append(f"║  FORM  {state.get('form','?'):6s} ({int(state.get('form_confidence',0)*100):>3d}%)                              ║")
    lines.append(f"║  CABINET {cab.get('slots_used',0)}/{cab.get('slots_max',0)}   PRESSURE T{state.get('pressure_tier',0)}   SENT {state.get('sentience_tier','?'):6s}║")
    lines.append("║                                                              ║")
    lines.append(f"║  EVOLVE OPPS  {state.get('evolve_opportunity',0):>2d}     PERK PENDING {state.get('perk_pending',0):>2d}             ║")
    lines.append(f"║  STRESS {state.get('stress',0):>3d}  COMPOSURE {state.get('composure',0):>3d}  CURIOSITY {state.get('curiosity',0):>3d}      ║")
    lines.append("║                                                              ║")
    if lc.get("phase_label_it"):
        lines.append(f"║  PHASE: {lc['phase_label_it'][:24]:24s}                       ║")
        if lc.get("next_phase_label_it"):
            ng = lc.get("next_gate", {})
            gate = f"Lv {ng.get('level','?')} · mut {ng.get('mutations_required',0)} · th {ng.get('thoughts_internalized_required',0)}{' · pol' if ng.get('polarity_required') else ''}"
            lines.append(f"║  NEXT:  {lc['next_phase_label_it'][:18]:18s} ({gate[:22]:22s})  ║")
        lines.append("║                                                              ║")
    lines.append(f"║  Repo pulse:  PR {counters.get('prs_merged',0):>3d}  ISS+ {counters.get('issues_opened',0):>2d}  ISS- {counters.get('issues_closed',0):>2d}        ║")
    lines.append(f"║               WF✓ {counters.get('workflows_passed',0):>3d}  WF✗ {counters.get('workflows_failed',0):>2d}  FIX {counters.get('commits_fix',0):>3d}        ║")
    lines.append("╚══════════════════════════════════════════════════════════════╝")
    bar = render_lifecycle_bar(state)
    if bar:
        lines.append("")
        lines.append(f"**Lifecycle**: {bar}")
    # Weekly digest reveal (P5 pattern).
    digest = state.get("weekly_digest")
    if digest:
        lines.append("")
        lines.append("## Digestivo settimanale")
        lines.append("")
        lines.append(f"> 🦎 _{digest}_")
    lines.append("```")
    lines.append("")
    lines.append(f"_Ultimo evento: {state.get('last_event_id','—')} · aggiornato {state.get('last_updated','—')}_")
    lines.append("")

    if recent:
        lines.append("## Eventi recenti (ultimi 10)")
        lines.append("")
        for entry in recent[-10:][::-1]:
            ev = entry.get("event", {})
            kind = ev.get("kind", "?")
            ts = entry.get("ts", "?")[:19]
            voice = entry.get("voice", "")
            num = ev.get("number", "")
            num_label = f"#{num}" if num else ""
            lines.append(f"- `{ts}` · **{kind}** {num_label} — {ev.get('summary','')[:80]}")
            lines.append(f"  > 🦎 _{voice}_")
        lines.append("")

    lines.append(f"> 🦎 _{CLOSING}_")
    lines.append("")
    return "\n".join(lines)


def render_doc(state: Dict[str, Any], recent: List[Dict[str, Any]]) -> str:
    header = """---
title: Skiv Monitor — live creature feed
doc_status: active
doc_owner: docs-team
workstream: cross-cutting
last_verified: AUTOGEN
source_of_truth: false
language: it
review_cycle_days: 7
tags: [skiv, monitor, autogen]
---

# Skiv Monitor

> **Autogen** — non editare a mano. Aggiornato da `tools/py/skiv_monitor.py` via `.github/workflows/skiv-monitor.yml`.
> Persona canonical: [docs/skiv/CANONICAL.md](CANONICAL.md). Plan: [docs/planning/2026-04-25-skiv-monitor-plan.md](../planning/2026-04-25-skiv-monitor-plan.md).

"""
    return header + render_card(state, recent)


# ────────────────────────────────────────────────────────────────────────────
# Main pipeline.
# ────────────────────────────────────────────────────────────────────────────

def process_events(events: List[Dict[str, Any]], state: Dict[str, Any], cursor: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Apply events to state; returns list of feed entries (deduped)."""
    seen = set(cursor.get("seen_event_ids", []))
    new_entries: List[Dict[str, Any]] = []
    for ev in events:
        eid = ev.get("id")
        if not eid or eid in seen:
            continue
        mapping = map_event(ev)
        apply_delta(state, mapping["state_delta"])
        # F-04: re-pick voice with current phase context (lifecycle-aware variety).
        cur_phase = (state.get("lifecycle") or {}).get("phase_id")
        if cur_phase:
            mapping["voice"] = voice_pick(mapping["category"], eid, phase_id=cur_phase)
        state["last_event_id"] = eid
        state["last_voice"] = mapping["voice"]
        state["last_updated"] = now_iso()
        state["narrative_log_size"] = state.get("narrative_log_size", 0) + 1
        entry = {
            "ts": ev.get("ts", now_iso()),
            "event": ev,
            "category": mapping["category"],
            "voice": mapping["voice"],
            "state_delta": mapping["state_delta"],
        }
        new_entries.append(entry)
        seen.add(eid)
    # Bound ring.
    cursor["seen_event_ids"] = list(seen)[-cursor.get("ring_max", 200):]
    if events:
        cursor["last_pr_merged_at"] = max((e["ts"] for e in events if e["kind"] == "pr_merged"), default=cursor.get("last_pr_merged_at"))
    # F-01 fix: merge saga aspect baseline + derive lifecycle phase + sprite + next gate.
    merge_saga_into_state(state)
    prev_phase = (state.get("lifecycle") or {}).get("phase_id")
    state["lifecycle"] = derive_lifecycle_phase(state)
    cur_phase = state["lifecycle"].get("phase_id")
    # F-02 fix: diary phase_transition entry on phase change.
    if prev_phase and cur_phase and prev_phase != cur_phase:
        append_diary_entry("phase_transition", {
            "from_phase": prev_phase,
            "to_phase": cur_phase,
            "phase_label_it": state["lifecycle"].get("phase_label_it"),
            "narrative_beat_it": state["lifecycle"].get("narrative_beat_it"),
        })
    # F-03 fix: bridge feed entries → diary repo_event entries (sample top-N to avoid spam).
    for entry in new_entries[-5:]:  # last 5 only — diary not feed mirror
        ev = entry.get("event") or {}
        append_diary_entry("repo_event", {
            "kind": ev.get("kind"),
            "number": ev.get("number"),
            "title": (ev.get("title") or ev.get("summary") or "")[:160],
            "category": entry.get("category"),
            "voice": entry.get("voice"),
        })
    # P5 weekly digest reveal — narrative arc lungo (deterministic via hash).
    maybe_emit_weekly_digest(state, FEED_PATH)
    # Surface saga aspect on top-level for UI rendering.
    if state["lifecycle"]["sprite_ascii"]:
        state["sprite_ascii"] = state["lifecycle"]["sprite_ascii"]
    if state["lifecycle"]["phase_label_it"]:
        state["phase_label_it"] = state["lifecycle"]["phase_label_it"]
    return new_entries


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Skiv-as-Monitor — git-event-driven creature reactions")
    p.add_argument("--repo", default=os.getenv("GITHUB_REPOSITORY", REPO_DEFAULT))
    p.add_argument("--since", default=None, help="ISO timestamp; events older skipped")
    p.add_argument("--mock-events", default=None, help="Path to JSON fixture (offline test)")
    p.add_argument("--dry-run", action="store_true", help="Don't persist outputs")
    p.add_argument("--reset-state", action="store_true", help="Re-seed state from defaults")
    p.add_argument("--quiet", action="store_true")
    return p.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv if argv is not None else sys.argv[1:])
    # Force utf-8 stdout on Windows (cp1252 default chokes on unicode glyphs).
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
    except Exception:
        pass
    ensure_dirs()

    if args.reset_state:
        save_json(STATE_PATH, DEFAULT_STATE)
        save_json(CURSOR_PATH, DEFAULT_CURSOR)
        if not args.quiet:
            print(f"[skiv-monitor] reset state -> {STATE_PATH}")
        return 0

    state = load_json(STATE_PATH, DEFAULT_STATE)
    cursor = load_json(CURSOR_PATH, DEFAULT_CURSOR)

    if args.mock_events:
        with open(args.mock_events, "r", encoding="utf-8") as f:
            events = json.load(f)
    else:
        token = os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN")
        since = args.since or cursor.get("last_pr_merged_at")
        try:
            events = fetch_events(args.repo, token, since)
        except MonitorError as exc:
            print(f"[skiv-monitor] WARN: {exc}", file=sys.stderr)
            return 1

    new_entries = process_events(events, state, cursor)

    if not args.quiet:
        print(f"[skiv-monitor] {len(new_entries)} new events; state level={state.get('level')} hp={state['gauges']['hp']}/{state['gauges']['hp_max']}")

    if args.dry_run:
        print(json.dumps({"new_entries": new_entries, "state_summary": {
            "level": state["level"], "xp": state["xp"], "hp": state["gauges"]["hp"],
            "evolve_opps": state["evolve_opportunity"], "perk_pending": state["perk_pending"],
        }}, ensure_ascii=False, indent=2))
        return 0

    for entry in new_entries:
        append_jsonl(FEED_PATH, entry)
    save_json(STATE_PATH, state)
    save_json(CURSOR_PATH, cursor)

    # Read tail of feed for card rendering.
    recent: List[Dict[str, Any]] = []
    if FEED_PATH.exists():
        with FEED_PATH.open("r", encoding="utf-8") as f:
            recent = [json.loads(line) for line in f.readlines()[-30:] if line.strip()]

    doc = render_doc(state, recent).replace("AUTOGEN", now_iso())
    DOC_PATH.write_text(doc, encoding="utf-8")

    if not args.quiet:
        print(f"[skiv-monitor] wrote {DOC_PATH.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
