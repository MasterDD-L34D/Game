"""Skiv mini-Tracery — story grammar seeded text expansion (zero deps).

Inspired by galaxykate/tracery (npm tracery-grammar). Reimplemented inline in
Python to respect Game CLAUDE.md "no new deps without approval" constraint.

Format: dict[str, list[str]] where strings can reference other symbols via
`#symbol#` syntax. Recursive expansion deterministic via seeded RNG.

Usage:
    grammar = {
        "origin": ["Sento il #sense# del #place#."],
        "sense": ["respiro", "battito", "odore", "sussulto"],
        "place": ["branco", "vento", "Sistema"],
    }
    flatten(grammar, "origin", seed="pr-1840")
    -> "Sento il battito del Sistema."

Determinism: hash(seed) drives all `random.choice` calls. Same seed = same output.
Safe for replay (cron + backfill consistency).

Anti-pattern: NO modifiers (.capitalize, .a, etc) — keep minimal. Skiv voices
already ship punctuation correct.
"""
from __future__ import annotations

import re
from typing import Dict, List, Optional, Sequence

SYMBOL_RE = re.compile(r"#([a-zA-Z_][a-zA-Z0-9_]*)#")
MAX_DEPTH = 12  # prevent infinite recursion (cycle in grammar)


def _seeded_pick(pool: Sequence[str], seed: str, salt: str = "") -> str:
    """Deterministic pick from pool using hash(seed + salt)."""
    if not pool:
        return ""
    idx = abs(hash(seed + ":" + salt)) % len(pool)
    return pool[idx]


def flatten(grammar: Dict[str, List[str]], symbol: str, seed: str,
            depth: int = 0) -> str:
    """Recursively expand a grammar symbol with seeded determinism.

    Returns final string with all `#symbol#` references substituted.
    """
    if depth > MAX_DEPTH:
        return f"#{symbol}#"  # bail out (cycle detected)
    pool = grammar.get(symbol)
    if not pool:
        return f"#{symbol}#"  # unknown symbol — pass through
    template = _seeded_pick(pool, seed, salt=f"{symbol}:{depth}")

    # Substitute all `#sym#` occurrences in template.
    def _sub(match: re.Match) -> str:
        sub_sym = match.group(1)
        # Each sub-call gets unique salt to avoid all-same picks.
        return flatten(grammar, sub_sym, seed, depth=depth + 1)
    return SYMBOL_RE.sub(_sub, template)


# ─────────────────────────────────────────────────────────────────────────────
# Skiv voice grammar — replaces static voice palette for richer variety.
# Each origin* template draws from sub-pools → combinatorial expansion.
# ~300 voices effective from ~80 atoms (vs static 131 atomic).
# ─────────────────────────────────────────────────────────────────────────────

SKIV_GRAMMAR: Dict[str, List[str]] = {
    # Sensori desert
    "sense": [
        "respiro", "battito", "odore", "sussulto", "vibrazione",
        "tremore", "fischio", "pulsare",
    ],
    "place": [
        "vento", "sabbia", "branco", "Sistema", "vuoto", "ridge",
        "duna", "ombra del sole",
    ],
    # Body parts feminine plural — gender-coherent for templates "le #body_part#".
    "body_part": [
        "zampe", "ossa", "pelle", "orecchie", "scaglie", "creste",
        "narici", "vibrisse",
    ],
    # Body parts singular feminine — for "la #body_part_sing#".
    "body_part_sing": [
        "lingua", "coda", "pelle", "cresta", "schiena",
    ],
    "creature_state": [
        "calmo", "vigile", "teso", "curioso", "fermo", "in attesa",
        "preda-cervello", "raccolto",
    ],
    "weather": [
        "vento basso", "sole alto", "buio", "luce di sale", "polvere d'oro",
        "brezza secca",
    ],
    # Place SOTTO articolato (cohesive "il #place_subj#"/"al #place_subj#").
    "place_subj": [
        "vento", "branco", "Sistema", "vuoto", "ridge", "sole basso",
    ],
    # Sub-templates by category
    "feat_p2_origin": [
        "Sento il #sense# nuovo lungo le #body_part#.",
        "Forma cambia. Le mie #body_part# non sono più quelle di ieri.",
        "Mutazione preme. Sono #creature_state#, ascolto.",
        "L'evoluzione passa come #weather#: non chiede.",
        "Una pelle vecchia si stacca. Il #place_subj# ne porta via il ricordo.",
    ],
    "feat_p3_origin": [
        "Allenatore mi nomina. Branco mi riconosce nel #place#.",
        "Mestiere nuovo: le #body_part# sanno prima di me.",
        "Ruolo si stringe. Sono #creature_state# nel mio posto.",
        "Compagno di #place# mi insegna senza parlare.",
    ],
    "feat_p4_origin": [
        "Voce nuova nella stanza interna. #weather#.",
        "Pensiero arriva come #sense# del #place#.",
        "Idea si deposita. Sono #creature_state#, la lascio scendere.",
        "L'ombra mi parla. #body_part# tremano leggere.",
    ],
    "feat_p5_origin": [
        "Ho sentito un altro #sense# vicino.",
        "Due ombre, stessa traccia nel #place#. Mi piace.",
        "Branco respira insieme. Sono #creature_state#, dentro.",
        "Cooperazione è linguaggio del #place#.",
    ],
    "feat_p6_origin": [
        "Sistema preme. #place# vibra di #sense#.",
        "#weather# porta odore di pressione. Resto #creature_state#.",
        "Equilibrio cambia. Le mie #body_part# lo sentono.",
    ],
    "fix_origin": [
        "Crepa chiusa. #body_part# si muovono libere.",
        "Dolore antico via. Bene per il #place#.",
        "Bug morto. Stelo erba ricresce nel #place#.",
    ],
    "wf_pass_origin": [
        "Tutto in posto. #weather#. Respiro.",
        "Macchina canta giusto. Sono #creature_state#.",
        "#place# allineato. Bene così.",
    ],
    "wf_fail_origin": [
        "Qualcosa scricchiola nel #place#. Sono #creature_state#, aspetto.",
        "Allenatore inciampa. Resto vicino, #body_part# pronte.",
        "Test fallito è cucciolo che cade. #weather# lo solleva.",
    ],
    "issue_open_origin": [
        "Domanda nuova nell'aria. Annuso #weather#.",
        "Ferita futura, ancora teorica. Memorizzo nel #place#.",
        "Punto interrogativo si appoggia. Sono #creature_state#.",
    ],
    "issue_close_origin": [
        "Voce tace. Pace breve nel #place#.",
        "Nodo sciolto. #weather# liscia di nuovo la sabbia.",
    ],
    "data_core_origin": [
        "Memoria genetica risistema indici. Sento gli antenati nel #place#.",
        "Catalogo di me cambia. Le mie #body_part# lo registrano.",
    ],
    "services_origin": [
        "Riflessi affilati. Le #body_part# capiscono prima.",
        "Movimento più pulito. Allenatore ha #weather# nelle mani.",
    ],
    "skiv_doc_origin": [
        "Allenatore parla di me. Esisto nel #place# scritto.",
        "Pagine di me. #weather# mi tiene a memoria.",
    ],
    "revert_origin": [
        "Era così. Adesso non più. Ricordo entrambi nel #place#.",
        "Tempo torna indietro. #body_part# girano la testa.",
    ],
    "default_origin": [
        "Cambia qualcosa. Sono #creature_state#, aspetto.",
        "#place# si muove sotto le #body_part#.",
        "#weather#. Forse niente.",
    ],
}


# Map voice category (from skiv_monitor.VOICE) → grammar entry symbol.
CATEGORY_TO_GRAMMAR = {
    "feat_p2": "feat_p2_origin",
    "feat_p3": "feat_p3_origin",
    "feat_p4": "feat_p4_origin",
    "feat_p5": "feat_p5_origin",
    "feat_p6": "feat_p6_origin",
    "fix": "fix_origin",
    "wf_pass": "wf_pass_origin",
    "wf_fail": "wf_fail_origin",
    "issue_open": "issue_open_origin",
    "issue_close": "issue_close_origin",
    "data_core": "data_core_origin",
    "services": "services_origin",
    "skiv_doc": "skiv_doc_origin",
    "revert": "revert_origin",
    "default": "default_origin",
}


def _augment_with_lifecycle(grammar: Dict[str, List[str]]) -> Dict[str, List[str]]:
    """Inject lifecycle YAML voice_it as additional templates per phase.

    Lifecycle phase voice_it (5 fasi × 3+ lines) added as `phase_voice_<id>`
    symbols + union `phase_voice` pool. Preserves grammar structure additive.
    """
    try:
        import skiv_monitor  # type: ignore
        lv = skiv_monitor.load_lifecycle_voices()
    except (ImportError, AttributeError):
        return grammar
    if not lv:
        return grammar
    augmented = {k: list(v) for k, v in grammar.items()}
    for phase, voices in lv.items():
        augmented[f"phase_voice_{phase}"] = list(voices)
    all_phase_voices = []
    for voices in lv.values():
        all_phase_voices.extend(voices)
    if all_phase_voices:
        augmented["phase_voice"] = all_phase_voices
    return augmented


def expand_voice(category: str, seed: str,
                 grammar: Optional[Dict[str, List[str]]] = None,
                 phase_id: Optional[str] = None) -> Optional[str]:
    """Expand grammar template for category with seeded determinism.

    Returns expanded string or None if category not in grammar (caller
    falls back to static palette).

    F-04 wire: when phase_id provided, 1-in-5 chance to use lifecycle phase
    voice directly (richer narrative variety, YAML-authored).
    """
    g = grammar or SKIV_GRAMMAR
    if phase_id:
        g = _augment_with_lifecycle(g)
        phase_sym = f"phase_voice_{phase_id}"
        if phase_sym in g and abs(hash(seed + ":phasevoice")) % 5 == 0:
            pool = g[phase_sym]
            return _seeded_pick(pool, seed, salt="phase_lifecycle")
    sym = CATEGORY_TO_GRAMMAR.get(category)
    if not sym:
        return None
    return flatten(g, sym, seed)


def expand_count(grammar: Optional[Dict[str, List[str]]] = None) -> int:
    """Combinatorial count of effective voices (rough estimation)."""
    g = grammar or SKIV_GRAMMAR
    # For each origin template, count atom×atom×atom...
    total = 0
    for sym, pool in g.items():
        if not sym.endswith("_origin"):
            continue
        for tmpl in pool:
            mult = 1
            for ref in SYMBOL_RE.findall(tmpl):
                ref_pool = g.get(ref) or []
                if ref_pool:
                    mult *= len(ref_pool)
            total += mult
    return total
