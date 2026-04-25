---
title: Skiv Narrative Arc Research — Deterministic Long-Form from Event Log
workstream: cross-cutting
doc_status: draft
doc_owner: narrative-design-illuminator
last_verified: 2026-04-25
source_of_truth: false
language: it
review_cycle_days: 30
tags: [narrative, skiv, procedural, tracery, qbn, research]
---

# Skiv Narrative Arc Research

> Pattern hunt per narrative arc settimanale deterministico da `feed.jsonl`.
> NO LLM in-loop. Vincolo replay-safe.
> Budget read: skiv_monitor.py (673 LOC) + feed.jsonl (56 entries) + state.json.

---

## Contesto problema

`skiv_monitor.py` ha 14 categorie × 2-3 frasi = ~36 frasi statiche. 56 eventi feed =
14 frasi rotanti via `abs(hash(seed)) % len(pool)`. Player sente ripetizione dopo 3 giorni.

Gap: nessun meccanismo che componga "questa settimana ho visto X, Y, Z → ho imparato W".
Il pattern mancante è **narrative arc su finestra temporale** (7 giorni), non per-evento.

---

## Panoramica pattern candidati

| #   | Pattern                          | Effort | Deterministic | LLM-free | Fit Skiv |
| --- | -------------------------------- | ------ | :-----------: | :------: | :------: |
| P1  | Tracery grammar templating       | 3-4h   |   Si (seed)   |    Si    |   Alta   |
| P2  | QBN quality-gated storylet       | 4-5h   |      Si       |    Si    |   Alta   |
| P3  | Caves of Qud replacement grammar | 6-8h   |      Si       |    Si    |  Media   |
| P4  | Wildermyth tale-stitching        | 8-12h  |   Parziale    |    Si    |  Bassa   |
| P5  | Thought Cabinet weekly reveal    | 3-4h   |      Si       |    Si    |   Alta   |
| P6  | Ink knot/stitch composition      | 5-7h   |      Si       |    Si    |  Media   |

---

## P1 — Tracery grammar templating (RACCOMANDATO - TOP 1)

**Fonte**: [galaxykate/tracery](https://github.com/galaxykate/tracery) +
[Tracery PDF ResearchGate](https://www.researchgate.net/publication/300137911_Tracery_An_Author-Focused_Generative_Text_Tool) +
[tracery-grammar npm](https://www.npmjs.com/package/tracery-grammar)

**Meccanismo**: JSON grammar dove ogni chiave = simbolo, valore = array di espansioni.
`tracery.setRng(seededRng)` → deterministico dato seed fisso (es. hash della settimana ISO).

**Pattern "weekly digest" applicato a Skiv**:

Skiv ha state.json con contatori aggregati settimanali. La grammar legge quei numeri
e li traduce in simboli contestuali → espansione in frase italiana.

```python
# Pseudo-code: skiv_weekly_digest(state, feed_7days, seed)

GRAMMAR = {
  "origin": [
    "#week_opening#. #events_summary#. #closing_reflection#"
  ],
  "week_opening": [
    "Questa settimana ho sentito #n_pr# movimenti nel codice",
    "Il vento ha portato #n_pr# cambiamenti",
    "Ho contato #n_pr# trasformazioni nell'aria"
  ],
  "closing_reflection": [
    "#mood_reflection#. Sabbia segue.",
  ],
  # Condizionale per mood: resolved at grammar-push time, not expand time
  # (Tracery non ha if nativo — usiamo symbol lookup)
}

def build_weekly_grammar(state, feed_7days):
    n_pr = sum(1 for e in feed_7days if e["category"] != "wf_pass")
    dominant_category = Counter(e["category"] for e in feed_7days).most_common(1)[0][0]
    stress_level = "alto" if state["stress"] > 5 else "basso"

    # Push context symbols — Tracery li espande inline
    grammar["n_pr"] = [str(n_pr)]
    grammar["dominant_activity"] = ACTIVITY_LABELS[dominant_category]
    grammar["mood_reflection"] = MOOD_REFLECTIONS[stress_level][dominant_category]
    return grammar

def weekly_digest(state, feed_7days, week_seed):
    grammar = build_weekly_grammar(state, feed_7days)
    t = tracery.Grammar(grammar)
    t.add_modifiers(tracery.baseEngModifiers)
    t.rng = seeded_rng(week_seed)  # tracery.setRng equivalent
    return t.flatten("#origin#")
```

**Vantaggi per Skiv**:

- `tracery-grammar` npm package già installabile (zero overhead)
- Seed = `hash(ISO_week)` → stesso digest ogni run della stessa settimana
- Author scrive frasi in italiano con slot `#simbolo#` → maintainer non tocca codice
- Extensibile: aggiungere nuove categorie = aggiungere array al JSON

**Limiti**:

- Pure text: niente semantic model. Non "ricorda" ordine eventi.
- Variazione bassa su settimane simili (stesso dominant_category → stesso slot).
- Richiede autoring delle pool per ogni (stress_level × dominant_category) = ~28 combo.

**Effort**: 3-4h (1h setup tracery + 1h grammar design + 1h autoring frasi + 1h test).

---

## P2 — QBN quality-gated storylet (RACCOMANDATO - TOP 2)

**Fonte**: [Emily Short Beyond Branching](https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/) +
[Failbetter StoryNexus](https://www.failbettergames.com/news/narrative-snippets-storynexus-tricks) +
[Fallen London Wikipedia](https://en.wikipedia.org/wiki/Fallen_London)

**Meccanismo**: storylet = breve blocco testuale con prerequisiti numerici.
Il sistema valuta quale storylet ha i prerequisiti soddisfatti E il punteggio di salience
più alto → espone quella narrazione. Nessuna branching tree.

**Pattern "weekly digest" applicato a Skiv**:

State di Skiv ha già qualities numeriche: stress, composure, curiosity, prs_merged,
evolve_opportunity, form_confidence, pressure_tier. Questi sono esattamente qualities QBN.

```yaml
# data/core/narrative/skiv_weekly_storylets.yaml
storylets:
  - id: 'high_merge_week'
    requires:
      counters.prs_merged: { gte: 10, window: '7d' }
    text: >
      L'allenatore ha bruciato {n_pr} porte questa settimana.
      Io ho sentito ogni botta nel terreno sotto le zampe.
      Stanco, ma vivo.
    salience: 10

  - id: 'stress_peak'
    requires:
      stress: { gte: 5 }
      counters.workflows_failed: { gte: 2, window: '7d' }
    text: >
      Macchina ha tossito due volte. Io aspetto sulla roccia.
      Il sole tramonta lo stesso — questo mi fa bene.
    salience: 15 # trumps altri se stress alto

  - id: 'evolution_threshold'
    requires:
      evolve_opportunity: { gte: 1 }
      form_confidence: { gte: 0.8 }
    text: >
      Forma nuova preme. Non so ancora il suo nome.
      Ma il guscio si allarga.
    salience: 20 # highest — evolution è momento narrativo chiave

  - id: 'quiet_week'
    requires: {} # fallback sempre disponibile
    text: >
      Settimana silenziosa. Ho ascoltato molto.
      Il silenzio ha il suo odore — sabbia vecchia, polvere secca.
    salience: 1
```

```python
# Pseudo-code: select_weekly_storylet(state, feed_7days)

def evaluate_storylet(storylet, state, feed_7days):
    for field, rule in storylet["requires"].items():
        value = get_path_windowed(state, field, feed_7days, rule.get("window"))
        if "gte" in rule and value < rule["gte"]: return False
        if "lte" in rule and value > rule["lte"]: return False
    return True

def select_weekly_storylet(state, feed_7days, storylets):
    eligible = [s for s in storylets if evaluate_storylet(s, state, feed_7days)]
    # salience-based: highest score wins (deterministic tie-break via storylet id sort)
    return max(eligible, key=lambda s: s["salience"])
```

**Vantaggi per Skiv**:

- Qualities ESISTONO GIA' in state.json (stress/composure/prs_merged/etc.)
- Facile aggiungere storylet YAML senza toccare Python
- Tie-break deterministico via ordinamento ID → replay-safe
- Espressivo: storylet "evolution_threshold" triggera solo al momento giusto

**Limiti**:

- Storylet singola = frase singola, non paragrafo composito.
- Design upfront costoso se vuoi coprire tutti i corner case (stress × merge × evolution).
- Non cattura sequenza temporale (non sa che i PR sono venuti PRIMA delle workflow fail).

**Effort**: 4-5h (2h YAML design storylet pool + 1h selector Python + 1h test + 1h autoring).

---

## P3 — Caves of Qud replacement grammar (ex-post rationalization)

**Fonte**: [GDC Vault Procedurally Generating History](https://gdcvault.com/play/1024990/Procedurally-Generating-History-in-Caves) +
[Semantic Scholar paper](https://www.semanticscholar.org/paper/Subverting-historical-cause-&-effect:-generation-of-Grinblat-Bucklew/e73a3bcd1eca39a2de7add8940d6f36d15175d21)

**Meccanismo** (da paper Grinblat/Bucklew 2017):

1. Genera eventi storici sequenzialmente via state machine (ogni evento parametrizzato
   dallo state corrente, e cambia state).
2. Non simula causa→effetto. Genera eventi → razionalizza ex post facto.
3. Usa replacement grammar: template con slot `{subject}`, `{verb_past}`, `{object}` →
   sostituisce da pool parametrizzata per evento.

**Applicato a Skiv**: feed.jsonl IS già la storia eventi. Il problema è sintetizzarla.

```
Event log (7 days):
  pr_merged(feat_p4) → "feat_p4 event occurred"
  pr_merged(services) × 5 → "services event × 5"
  wf_fail × 2 → "workflow fail"
  pr_merged(feat_p2) → "evolution event"

Replacement grammar step:
  1. Identify dominant event type (services × 5)
  2. Lookup sentence template for type:
     services → "{agent} ha affilato {n} volte il riflesso del {body_part}"
  3. Fill slots: agent="io", n="cinque", body_part=RANDOM_BODY_PART[seed]
  4. Append exception clause for rare events:
     feat_p4 → "...e una voce nuova si è fatta sentire"
     wf_fail × 2 → "...il corpo ha tossito due volte"
  5. Compose: sentence1 + exception_clauses → paragraph
```

**Vantaggi**: produce testo molto variato e "literario".
**Limiti per Skiv**: overkill. Serve corpus 40k words per raggiungere l'effetto Qud.
Noi abbiamo ~100 frasi. Con <500 frasi authored l'output suona meccanico.

**Effort**: 6-8h. Non raccomandato per ora.

---

## P4 — Wildermyth tale-stitching

**Fonte**: [Wildermyth AIAS Podcast](https://gamemakersnotebook.libsyn.com/balancing-procedural-and-intimate-storytelling-in-wildermyth) +
[Vice review](https://www.vice.com/en/article/pkbz78/wildermyth-review) +
[Destructoid impressions](https://www.destructoid.com/wildermyth-impressions-procedural-story-rpg/)

**Meccanismo**: "story packets" hand-authored (deck di ~100-200 eventi brevi), ognuno con
trigger conditions. Game "draws" da deck semi-randomly e stitches in sequenza narrativa.
Inizio + fine capitolo sono authored fissi; tutto in mezzo è procedural draw.

**Applicato a Skiv**: ogni "settimana" = capitolo. Skiv "draws" 3 cards dal deck basato su
eventi della settimana. Le 3 cards si compongono come micro-storia.

**Limiti per Skiv**: authoring enorme. Wildermyth ha team di writers dedicati. Ogni card
deve funzionare in qualsiasi combinazione → N^2 compatibility issues. NON raccomandato
come base architecture, MA il pattern "3 cards → micro-story" è riusabile come
frame sopra P1 o P2.

**Effort**: 8-12h (solo per subset minimo). Skip per ora.

---

## P5 — Thought Cabinet weekly reveal (pattern Disco Elysium)

**Fonte**: [Thought Cabinet Devblog](https://discoelysium.com/devblog/2019/09/30/introducing-the-thought-cabinet) +
[Disco Elysium Wiki](https://discoelysium.wiki.gg/wiki/Thought_Cabinet) +
[Shacknews How Thought Cabinet Works](https://www.shacknews.com/article/114772/how-the-thought-cabinet-works-in-disco-elysium)

**Meccanismo**: Thought = oggetto narrativo con stato: `researching | internalized`.
Durante `researching` (timer in ore di gioco): small penalty/bonus.
Al completamento: "breakthrough" reveal + testo conclusivo + bonus permanente.
Player NON conosce il bonus prima del reveal → uncertainty + commitment.

**Applicato a Skiv — "weekly meditation"**:

Ogni settimana Skiv "medita" su un tema emergente dagli eventi. Al trigger (domenica,
o N-th poll run della settimana), genera un pensiero dalla categoria dominante,
lo mette in stato `meditating` per 24h, poi rivela il "digestivo" settimanale.

```python
# Pseudo-code: weekly meditation system

MEDITATIONS = {
  "feat_p4": {
    "title": "Voci della Stanza Interna",
    "research_text": "Qualcosa si agita. Non ancora chiaro.",
    "reveal_text": (
      "Ho capito: quando l'allenatore aggiunge una voce nuova al sistema, "
      "è come se io imparassi a sentire un tono che prima non percepivo. "
      "Non è rumore. È profondità."
    ),
    "bonus": "form_confidence += 0.03"
  },
  "services": {
    "title": "Corpo Affilato",
    "research_text": "Movimento. Tanti movimenti.",
    "reveal_text": (
      "Questa settimana il corpo ha cambiato. {n_services} ritocchi al meccanismo. "
      "Come quando un dune stalker impara a girare la zampa di 3 gradi — "
      "nessuno lo vede, ma la preda scivola via diversamente."
    ),
    "bonus": "composure += 2"
  }
}

def weekly_meditation(state, feed_7days, current_day):
    if current_day % 7 != 0:  # trigger domenica
        return None
    dominant = get_dominant_category(feed_7days)
    meditation = MEDITATIONS.get(dominant, MEDITATIONS["services"])
    # n_services = count for template fill
    n = sum(1 for e in feed_7days if e["category"] == dominant)
    reveal_text = meditation["reveal_text"].replace("{n_services}", italian_number(n))
    return {
      "title": meditation["title"],
      "reveal_text": reveal_text,
      "bonus": meditation["bonus"],
      "week_iso": current_week_iso()
    }
```

**Vantaggi**: narrativo potente. Il "reveal" settimanale è evento speciale, non routine.
Pacing naturale: 6 giorni di frasi brevi + 1 giorno di digest lungo.
Compatibile con stato esistente (state.json ha già `cabinet`).

**Limiti**: richiede autoring `reveal_text` per ogni categoria × sotto-variante.
Se la settimana è "mista" (feat_p4 + services uguale), la scelta dominant è arbitraria.

**Effort**: 3-4h (1h struttura Python + 1h autoring testi reveal + 1h integrazione render_card).

---

## P6 — Ink knot/stitch composition

**Fonte**: [WritingWithInk.md GitHub inkle](https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md) +
[Unfold Studio ink docs](https://docs.unfold.studio/user_guide/ink.html)

**Meccanismo**: `.ink` file con `VAR stress = 0` + knot condizionali. `narrativeEngine.js`
del repo già usa inkjs. Weekly digest potrebbe essere una Story ink caricata con
external functions che leggono state.json.

**Applicato a Skiv**:

```ink
VAR prs = 0
VAR stress = 0
VAR dominant = "default"

=== weekly_digest ===
{ dominant == "feat_p4":
    Voci nuove questa settimana. -> p4_reflection
- dominant == "services":
    Corpo cambiato. -> services_reflection
- else:
    Settimana ordinaria. -> default_reflection
}

=== p4_reflection ===
Ho sentito {prs} cambiamenti nel sistema delle voci interiori.
Ognuno lascia un'eco.
-> END
```

**Vantaggi**: stack già presente (`narrativeEngine.js` + `inkjs`).
Autoring visibile + testabile con Inky editor.
`bindExternalFunction` può iniettare state.json live.

**Limiti**: overhead di compilazione `.ink` → `.ink.json`. Setup toolchain.
Overkill per un weekly digest di 3-4 frasi.

**Effort**: 5-7h (setup toolchain + .ink file + binding). Non raccomandato come start.

---

## Top 2 raccomandati per shipping immediato

### Raccomandazione 1: P5 (Thought Cabinet weekly reveal) — ~3-4h

**Perché top**: pattern narrativo più ricco emotivamente. Crea evento speciale 1×settimana
invece di rumore continuo. Player (= autore che legge il monitor) sente il "reveal" come
momento distinto dalla routine quotidiana.

**Implementazione**: aggiungere `weekly_meditation()` function a `skiv_monitor.py`.
Trigger: `narrative_log_size % 7 == 0` (ogni 7 eventi) oppure check ISO week.
Output: campo `weekly_digest` in `state.json` + sezione separata in `MONITOR.md`.

**Effort**: 3-4h. Zero nuove deps.

### Raccomandazione 2: P1 (Tracery grammar) — ~3-4h

**Perché top 2**: variazione testuale immediata senza LLM. Seed deterministico = replay-safe.
JSON grammar = maintainable da non-coder. `tracery-grammar` è già su npm.

**Implementazione**: `tools/py/skiv_tracery_grammar.json` (Python ha port Tracery: `tracery` PyPI).
`generate_weekly_line(state, feed_7days, week_seed)` → stringa italiana variata.
Integrata in `render_card()` come "weekly flavor text" (sotto il box ASCII).

**Effort**: 3-4h. 1 pip dep (`tracery` / `tracery2` PyPI) — richiede approvazione.

---

## Pseudo-code: weekly digest deterministico da feed.jsonl (finestra 7 giorni)

```python
# Questo è il pattern ibrido P5 + P2 (senza nuove deps):

import json, hashlib, datetime
from collections import Counter
from pathlib import Path

WEEKLY_STORYLETS = [
    {
      "id": "evo_milestone",
      "requires": {"evolve_opportunity": {"gte": 1}, "form_confidence": {"gte": 0.80}},
      "salience": 20,
      "text": (
        "Questa settimana il guscio si è allargato. "
        "Ho {n_pr} passi nuovi nella memoria del corpo. "
        "La forma non ha ancora nome, ma preme da dentro come vento caldo."
      )
    },
    {
      "id": "high_pressure_week",
      "requires": {"stress": {"gte": 4}, "wf_fail_count": {"gte": 2}},
      "salience": 15,
      "text": (
        "Il sistema ha tossito {wf_fail_count} volte. "
        "Io ho aspettato sulla roccia. "
        "Non ogni tempesta porta pioggia — questa portava solo polvere."
      )
    },
    {
      "id": "ancestors_week",
      "requires": {"ancestors_trait_count": {"gte": 10}},
      "salience": 18,
      "text": (
        "Gli antenati si muovono nel sangue questa settimana. "
        "{ancestors_trait_count} memoria nuova nel catalogo. "
        "Quando corro, sento i loro passi sotto i miei."
      )
    },
    {
      "id": "quiet_default",
      "requires": {},  # always eligible
      "salience": 1,
      "text": (
        "Settimana silenziosa. {n_pr} movimenti nel vento. "
        "Ho ascoltato molto. Ho detto poco. "
        "La sabbia segue chi sa aspettare."
      )
    },
]

def load_feed_window(feed_path: Path, days: int = 7) -> list:
    cutoff = (datetime.datetime.utcnow() - datetime.timedelta(days=days)).isoformat()
    entries = []
    with feed_path.open("r", encoding="utf-8") as f:
        for line in f:
            e = json.loads(line)
            if e.get("ts", "") >= cutoff:
                entries.append(e)
    return entries

def compute_window_qualities(state: dict, feed_7days: list) -> dict:
    """Derived numeric qualities for storylet gating."""
    cat_counts = Counter(e.get("category", "default") for e in feed_7days)
    wf_fail = sum(1 for e in feed_7days if e.get("category") == "wf_fail")
    ancestors_traits = sum(
        1 for e in feed_7days
        if "ancestors" in e.get("event", {}).get("title", "").lower()
    )
    return {
        "evolve_opportunity": state.get("evolve_opportunity", 0),
        "form_confidence": state.get("form_confidence", 0.0),
        "stress": state.get("stress", 0),
        "composure": state.get("composure", 0),
        "wf_fail_count": wf_fail,
        "ancestors_trait_count": ancestors_traits,
        "n_pr": sum(1 for e in feed_7days if e.get("event", {}).get("kind") == "pr_merged"),
    }

def fill_template(text: str, qualities: dict) -> str:
    for key, val in qualities.items():
        text = text.replace("{" + key + "}", str(val))
    return text

def select_weekly_digest(state: dict, feed_7days: list) -> str:
    qualities = compute_window_qualities(state, feed_7days)
    eligible = []
    for storylet in WEEKLY_STORYLETS:
        ok = True
        for field, rule in storylet["requires"].items():
            val = qualities.get(field, 0)
            if "gte" in rule and val < rule["gte"]:
                ok = False; break
            if "lte" in rule and val > rule["lte"]:
                ok = False; break
        if ok:
            eligible.append(storylet)
    # Deterministic tie-break: sort by salience desc, then id asc
    eligible.sort(key=lambda s: (-s["salience"], s["id"]))
    winner = eligible[0]
    return fill_template(winner["text"], qualities)

def weekly_digest(feed_path: Path, state: dict) -> str | None:
    """Returns digest string if it's 'digest day' (every 7th log entry), else None."""
    n = state.get("narrative_log_size", 0)
    if n == 0 or n % 7 != 0:
        return None  # not digest day
    feed_7days = load_feed_window(feed_path, days=7)
    return select_weekly_digest(state, feed_7days)
```

**Integrazione in skiv_monitor.py**: dopo `apply_delta(state, ...)`, chiama
`weekly_digest()`. Se non-None → aggiungi campo `state["weekly_digest"]` + sezione
`## Digestivo settimanale` in `render_card()`.

**Zero nuove deps**. Autoring storylets in Python list o YAML esterno.

---

## Anti-pattern da evitare ora

- **LLM weekly summary**: grounding impossibile senza contesto completo. Output incoerente
  con persona Skiv. Vedi [Ian Bicking Hidden Door review](https://ianbicking.org/blog/2025/08/hidden-door-design-review-llm-driven-game).
- **Wildermyth full card-drawing system**: N=200+ cards per evitare ripetizioni.
  Noi abbiamo budget 50 frasi max.
- **Ink per weekly digest**: overhead toolchain non giustificato. Ink serve per branching
  dialogue interattivo, non per selezione testo one-way.
- **Tracery senza seed**: `Math.random()` default = non replay-safe. Sempre `setRng(seed)`.
- **QBN senza fallback storylet**: se nessuna quality gating è soddisfatta → crash/silence.
  Sempre un `requires: {}` catchall con salience 1.

---

## Fonti primarie

- [galaxykate/tracery GitHub](https://github.com/galaxykate/tracery)
- [tracery PDF ResearchGate](https://www.researchgate.net/publication/300137911_Tracery_An_Author-Focused_Generative_Text_Tool)
- [tracery-grammar npm](https://www.npmjs.com/package/tracery-grammar)
- [Emily Short Beyond Branching QBN + Salience](https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/)
- [Failbetter StoryNexus Tricks](https://www.failbettergames.com/news/narrative-snippets-storynexus-tricks)
- [Thought Cabinet Devblog Disco Elysium](https://discoelysium.com/devblog/2019/09/30/introducing-the-thought-cabinet)
- [GDC Vault Caves of Qud Procedural History](https://gdcvault.com/play/1024990/Procedurally-Generating-History-in-Caves)
- [Grinblat/Bucklew 2017 Semantic Scholar](https://www.semanticscholar.org/paper/Subverting-historical-cause-&-effect:-generation-of-Grinblat-Bucklew/e73a3bcd1eca39a2de7add8940d6f36d15175d21)
- [Wildermyth AIAS Podcast](https://gamemakersnotebook.libsyn.com/balancing-procedural-and-intimate-storytelling-in-wildermyth)
- [Vice Wildermyth review](https://www.vice.com/en/article/pkbz78/wildermyth-review)
- [Wildermyth SuperJump false AI promises](https://www.superjumpmagazine.com/wordplayer-wildermyth-lays-bare-the-false-promises-of-ai-storytelling/)
