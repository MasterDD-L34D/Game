---
title: "Identity Stack Reconciliation — A.L.I.E.N.A. + Flint + Skiv-archetype (4 entità)"
workstream: cross-cutting
category: plan
doc_status: draft
doc_owner: narrative-design-illuminator
last_verified: "2026-04-27"
source_of_truth: false
language: it
review_cycle_days: 30
tags: [narrative, identity, aliena, flint, skiv, reconciliation]
---

# Identity Stack Reconciliation — A.L.I.E.N.A. + Flint + Skiv-archetype

**Data**: 2026-04-27  
**Agent**: narrative-design-illuminator (INFJ-A audit mode + INFP-A research mode)  
**Fonti real verificate**: `docs/reports/2026-04-26-lore-alien-event-swarm-redig.md`, `docs/skiv/CANONICAL.md`, `data/core/companion/skiv_archetype_pool.yaml`, `services/narrative/narrativeEngine.js`, `apps/play/src/codexPanel.js`, `docs/planning/codex-in-game-aliena-integration.md`, `memory/feedback_aliena_is_acronym_not_ai.md`

---

## TL;DR — 5 bullet verdict

1. **A.L.I.E.N.A. non parla mai**: è metodo design 6-dimensioni (confermato `docs/appendici/ALIENA_documento_integrato.md` + `memory/feedback_aliena_is_acronym_not_ai.md`). Il "A.L.I.E.N.A. AI voce asciutta" di v3.2 è un falso amico: il nome suona AI ma il contenuto è enciclopedico. Pattern consigliato: A.L.I.E.N.A. diventa struttura Codex (6 tab A/L/I/E/N/A) visibile al player — il metodo si manifesta come wiki, non come voce.

2. **PATTERN C2 raccomandato**: A.L.I.E.N.A. acronimo invisibile come struttura Codex + Flint voce world poetica anonima→nominata + Skiv-archetype compagno personale worldgen-aware. Tre ruoli non-sovrapposti, cognitive load moderato (2 voci player-facing, 1 struttura dati).

3. **Flint**: voce poetica anonima in §1-2, si nomina solo in §3.0 (Nexus) al momento del reveal diegetic. Prima di quel momento: "una voce", "il racconto", nessun name-drop. Stile: terza persona sul mondo, frasi brevi asciutte, immagini biologiche — mai spiegazioni meccaniche dirette.

4. **Skiv-archetype** è già wired: `skivPanel.js` + `/api/skiv/card` + `skiv_archetype_pool.yaml` 96 nomi × 8 biomi live. Ruolo canonico: prima persona, metafore bioma-specifiche, companion personal per-player. NON deve duplicare Flint (world omniscient) — Skiv commenta il proprio stato, la squadra, il run specifico.

5. **Effort migrazione**: C2 richiede solo governance documentale + ink.js scene tag-split (Flint vs Skiv) nelle storie `.ink` esistenti in `data/narrative/`. Nessuna implementazione nuova necessaria. Pattern compatibile con Wave 9 Codex plan (`docs/planning/codex-in-game-aliena-integration.md` §Wave 9).

**Verdict**: PATTERN_C2_RACCOMANDATO / Q1+Q2 risposta inline §6

---

## 1. Reconciliation matrix (Task 1)

| Entità | Ruolo definitivo | Player-facing? | Voce stile | Quando parla | Wire attuale |
|---|---|:-:|---|---|---|
| A.L.I.E.N.A. (acronimo) | Struttura Codex 6-tab | SI (come UI struttura) | nessuna — è layout | Mai come voce; sempre come organizzazione Codex | `codexPanel.js` W8L stub — Wave 9 |
| A.L.I.E.N.A. AI voce asciutta (v3.2) | ASSORBITO da Codex | NO come voce | — | — | ELIMINATO come ruolo voce |
| Flint (voce anonima → nominata) | Narratore world diegetic | SI | poetica/terza persona/biologica | encounter intro/outro, beat narrativi pre-Nexus; nominata in §3.0 | `data/narrative/*.ink` storie — tag-split richiesto |
| Skiv-archetype | Compagno personale worldgen-aware | SI | prima persona/bioma/melanconico-curioso | lobby, debrief, Codex notes, passive voice reactive | `skivPanel.js` + `/api/skiv/card` + `skiv_archetype_pool.yaml` LIVE |

**Note su eliminazione "A.L.I.E.N.A. AI voce"**: il ruolo "voice asciutta tecnica" che v3.2 assegna ad A.L.I.E.N.A. (foodweb gen, mutagen trigger, decisione registrata) è direttamente assorbibile dalla UI del Codex (unlock progressivo) senza inventare un'entità parlante nuova. Il player riceve la stessa informazione — la specie X è comparsa perché Y — attraverso una scheda Codex, non attraverso una voce off-screen. Questo elimina cognitive load di una quarta entità senza perdere il contenuto.

---

## 2. Valutazione pattern (Task 2)

### Pattern A — One-and-only-one (singola voce)

**A1 — A.L.I.E.N.A. AI single voice**

Pro: nome iconico, coerente con naming progetto, voce tecnica low-maintenance.  
Contro: contradice definizione canonica (metodo, non AI). Richiede rename o reframe massiccio. Crea tonal dissonance con bio-plausibile del draft-narrative-lore.md. Player associa "ALIENA" a extraterrestri, non a framework.  
Cognitive load: basso (1 voce), ma errato concettualmente.  
Effort wire: Alto — ADR rewrite + rename in 8+ file.

**A2 — Flint single voice**

Pro: narratore world collaudato, stile poetico unico, già presente in v3.2 + v2.  
Contro: Skiv-archetype è già wired live (skivPanel.js + endpoint). Eliminarlo = buttare infrastruttura funzionante. Flint non ha localizzazione bioma — voce unica per tutti i run = meno personalizzazione.  
Cognitive load: basso (1 voce player-facing).  
Effort wire: Medio — rimuovere Skiv wiring esistente.

**A3 — Skiv-archetype single voice**

Pro: già wired, worldgen-aware, bioma-specific, pool 96 nomi × 8 biomi.  
Contro: Skiv è companion personale, non narratore world. Manca la funzione "tono epico universale" del world narrator. Flint e Skiv hanno ruoli genuinamente diversi (omniscient world vs companion specifico).  
Cognitive load: basso (1 voce player-facing).  
Effort wire: basso ma perde registro world omniscient.

**Verdict Pattern A**: tutti e tre sacrificano qualcosa di non recuperabile. Pattern A non raccomandato.

---

### Pattern B — Two-roles split

**B1 — A.L.I.E.N.A. AI (sistema/registrazione) + Flint (poetica/world)**

Pro: coerente con v3.2 framing, biruolo chiaro.  
Contro: A.L.I.E.N.A. AI contradice definizione canonica verificata. Skiv-archetype (infrastruttura live) eliminata. Player confonde A.L.I.E.N.A. con entità extraterrestre.  
Cognitive load: medio (2 voci player-facing, 1 tecnica + 1 poetica).  
Effort wire: Alto — renaming + reframing A.L.I.E.N.A.

**B2 — A.L.I.E.N.A. AI (sistema) + Skiv-archetype (poetica/world+companion)**

Pro: mantiene Skiv wiring live.  
Contro: A.L.I.E.N.A. AI ancora contradice canonico. Skiv+A.L.I.E.N.A. AI → Skiv assorbe troppi ruoli (companion + world narrator).  
Cognitive load: medio.  
Effort wire: Medio-alto.

**B3 — Flint (anonima→nominata) + Skiv-archetype (companion personal)**

Pro: entità reali (non inventate), ruoli distinti, Skiv live.  
Contro: Nessun sistema "registrazione" per Codex — serve il tab UI per quell'informazione.  
Cognitive load: basso-medio (2 voci, ruoli chiari).  
Effort wire: Basso — tag-split `.ink` storie + conferma ruoli.  
**Nota**: è il sottoinsieme di C2 senza struttura Codex esplicita. Funziona ma non capitalizza A.L.I.E.N.A. acronimo come asset.

**Verdict Pattern B**: B3 è buono, ma C2 è migliore perché sfrutta il lavoro già fatto su A.L.I.E.N.A. metodo come struttura Codex (8h Wave 9 già pianificate in `codex-in-game-aliena-integration.md`).

---

### Pattern C — Three-roles separation

**C1 — A.L.I.E.N.A. AI (sistema) + Flint (world voice) + Skiv-archetype (companion)**

Pro: massima separazione ruoli.  
Contro: A.L.I.E.N.A. AI ancora contradice canonico. 3 voci player-facing è al limite del cognitive overload per un gioco tattico TV-first.  
Cognitive load: medio-alto. Hades funziona con 3+ voci perché NPCs sono personaggi narrativi con archi propri — in Evo-Tactics non c'è budget scrittura per 3 entità fully voiced.  
Effort wire: Alto.

**C2 — A.L.I.E.N.A. acronimo (struttura Codex invisibile) + Flint (world voice) + Skiv-archetype (companion)**

Pro:
- A.L.I.E.N.A. risolve esigenza "registrazione sistema" come UI Codex (pattern Hades Codex, Outer Wilds Ship Log) — nessuna voce aggiuntiva
- Flint copre registro world omniscient poetico (encounter intro/outro, beat narrativi)
- Skiv-archetype copre registro companion personale bioma-specifico (already live)
- 2 voci player-facing = cognitive load gestibile
- 0 contradizioni con definizione canonica
- Capitalizza Wave 9 Codex già pianificata (8h, `codex-in-game-aliena-integration.md`)
- Skiv wiring esistente (skivPanel.js + endpoint) non rimosso

Contro:
- Flint richiede tag-split nelle storie `.ink` per separare le sue linee da Skiv
- Flint "voce anonima → nominata" richiede gestione timing reveal §3.0 (Q1)

Cognitive load: basso-medio. 2 voci player-facing + 1 struttura UI = standard industria.  
Effort wire: Basso. Governance documentale + ink tag-split. Zero nuova infrastruttura.

**Verdict C2 raccomandato.**

---

### Pattern D — Four-roles narrative orchestra

**D1 — A.L.I.E.N.A. acronimo + A.L.I.E.N.A. AI proxy + Flint + Skiv-archetype**

Pro: massima granularità.  
Contro: cognitive overload narrativo severo. 3 voci player-facing + 1 struttura = Disco Elysium territory che richiede 24 skill writers. Budget scrittura per indie non scalabile.  
Cognitive load: alto. Rischio: player smette di ascoltare dopo 3 sessioni (Disco Elysium stessa ammonisce: 24 voci solo perché fanno parte di un sistema coerente dove ogni voce = una skill con peso meccanico).  
Effort wire: Molto alto.

**Verdict D1**: anti-pattern. Violazione "too many skills/voices" della pattern library.

---

## 3. Industry pattern primary-sourced (Task 3)

### Bastion — Rucks single narrator reactive ([Supergiant Games GDC 2012](https://www.gdcvault.com/play/1016641/Storytelling-Tools-to-Boost-Your))

Count narrators: 1 (Rucks). Ruolo: world omniscient + commento azione + backstory. Player engagement: alto perché il narratore reagisce a azioni specifiche ("He went and did it anyway"). Risk over-narrate: basso perché il trigger è l'azione del player, non un timer. **Lezione per Evo-Tactics**: una sola voce world coprente è più efficace di due voci che competono per lo stesso registro. Flint dovrebbe coprire tutto il registro world, non condividerlo.

### Hades — Multi-narrator (Zagreus + NPCs) ([Supergiant Games postmortem IG 2021](https://www.gamedeveloper.com/design/how-hades-was-made-the-developer-s-complete-guide))

Count narrators: Zagreus (protagonist voice) + 7+ NPCs (Hypnos snarky, Achilles wise, Nyx maternal, etc.) + Codex notes (narratore testuale separato). Separazione ruoli: ogni voce ha relazione specifica con Zagreus, non si sovrappongono nel tono. Codex è testo scritto, non voce — separato dagli NPC parlanti. **Lezione**: il Codex come testo separato dalle voci parlanti è pattern validato da Hades. A.L.I.E.N.A. come struttura Codex (non voce) è allineato a Hades.

### Disco Elysium — 24 voci skill + Inland Empire ([ZA/UM 2019](https://discoelysium.wiki.gg/wiki/Skills))

Count narrators: 24 (ognuna è una skill con peso meccanico). Separazione ruoli: ogni voce = una skill con punteggio, bias cognitivo, fallimento narrativo valido. Cognitive load: 24 è massimo feasible perché ogni voce ha trigger preciso (solo quando skill è alta, solo in scene pertinenti). Risk over-narrate: gestito con trigger precisi e voci che si contraddicono intenzionalmente. **Lezione**: voci multiple funzionano solo se ognuna ha mechanical weight e trigger scope limitato. Flint + Skiv = 2 voci, entrambe con scope distinto — safe. Aggiungere A.L.I.E.N.A. AI come terza voce senza mechanical weight = overhead senza payoff.

### Wildermyth — 3rd person omniscient + character voice ([Worldwalker Games](https://store.steampowered.com/app/763890/Wildermyth/))

Count narrators: 1 omnisciente (narrazione scenica) + character voices in dialogue. Separazione: narratore omnisciente descrive scene in terza persona; i personaggi parlano in prima persona nelle scelte. **Lezione**: [Vice 2021 review](https://www.vice.com/en/article/pkbz78/wildermyth-review) sottolinea che l'alternanza tra narratore omnisciente e voci personaggio non crea confusion perché il formato visivo le separa chiaramente (box narrazione separato da box dialogo). Per Evo-Tactics: Flint usa box narrazione separato (encounter intro/outro), Skiv usa HUD overlay — formati visivi distinti = nessuna confusion.

### Outer Wilds — Companions su pianeti + Ship Log ([Mobius Digital 2019](https://www.mobius-digital.com/))

Count narrators: 0 voice-over narranti. I personaggi Nomai comunicano via testi scritti nel mondo (Ship Log = aggregatore). Player è investigatore attivo. **Lezione**: alcune informazioni funzionano meglio come testo esplorabile (A.L.I.E.N.A. Codex) che come voce narrante. L'info "Squad KRNA-7B2 · biomi 6 · specie generate 23" è efficace come entry Codex — invasiva come voce off-screen in un momento di tensione tattica.

### Pyre — Reader-as-player + speaker Pamitha ([Supergiant Games 2017](https://www.supergiantgames.com/games/pyre/))

Count narrators: 1 reader (tu come personaggio) + NPCs parlanti. Separazione: il reader/narratore non ha voce propria — il player è il reader. **Lezione**: il ruolo del player dentro la fiction va definito prima delle voci. In Evo-Tactics: il player è l'allenatore (definito canonicamente in `docs/skiv/CANONICAL.md`). Flint parla al player come "mondo che racconta". Skiv parla al player come "compagno che si fida". Sono relazioni diverse che richiedono registri diversi — non sovrapponibili.

---

## 4. Voice rule schema canonical (Task 4)

### A.L.I.E.N.A. (acronimo → struttura Codex)

```yaml
voice_rule:
  entity: ALIENA_codex
  register: enciclopedico_visivo  # non è una voce, è un layout
  person: nessuna                 # testo impersonale, sezioni scheda
  scope: >
    Codex UI (Wave 9+) — 6 tab A/L/I/E/N/A per ogni specie.
    Progressivo unlock via encounter. MAI come voce narrata durante gameplay.
  forbidden:
    - "A.L.I.E.N.A. dice..." (non è una voce)
    - parlare in prima persona
    - interrompere combat flow
    - registro emotivo
  integration_point:
    ui: apps/play/src/codexPanel.js (stub W8L, Wave 9 full)
    data: data/core/species/{id}/codex.yaml (Wave 9 scope)
    plan: docs/planning/codex-in-game-aliena-integration.md
```

### Flint (voce anonima → nominata §3.0)

```yaml
voice_rule:
  entity: flint
  register: poetico_biologico_asciutto
  person: terza_persona_sul_mondo
    # "Il sale ha bevuto." non "Io vedo il sale."
    # Osservatore esterno, voce del mondo, non dell'io
  scope: >
    Encounter intro (pre-combat briefing poetico, 2-4 righe max).
    Encounter outro (post-combat beat narrativo, 1-3 righe max).
    Beat narrativi milestone (primo bioma nuovo, evento mutageno, transizione arc).
    ANONIMA fino a §3.0 Nexus: mai name-drop prima di quel momento.
    Post §3.0: può firmare con "Flint" in debrief + Codex note narrativa.
  forbidden:
    - spiegare meccaniche di gioco
    - citare statistiche (HP, AP, mod)
    - sovrapporsi a linee di Skiv-archetype
    - parlare in prima persona
    - name-drop prima di §3.0
    - voce "tecnica/asciutta" (quella è Codex, non Flint)
  tone_samples:
    - "Il sale ha bevuto. Anche voi avete bevuto."
    - "La Soglia non ricorda i caduti — registra solo le pressioni."
    - "Tre turni. Il nodo si apre. Quello che scegliete ora rimane."
  integration_point:
    ink: data/narrative/*.ink — tag speaker:flint per disambiguare in runtime
    engine: services/narrative/narrativeEngine.js (runUntilChoice tag-aware)
    trigger: encounter start/end + campaign milestone
```

### Skiv-archetype (compagno personale worldgen-aware)

```yaml
voice_rule:
  entity: skiv_archetype
  register: mythic_melanconico_curioso
  person: prima_persona_italiana
    # "Sento il calore salire prima che il sole sia visibile."
    # Body-first, presente, sensoriale
  interlocutor: allenatore  # sempre "allenatore", mai "giocatore"
  scope: >
    Lobby pre-sessione (benvenuto + bioma corrente).
    Debrief post-sessione (commento esito specifico run, non generico).
    Codex notes (annotazioni personali su specie incontrate — voce diegetic).
    Reactive passive (thought cabinet, trait unlock, pressure tier change).
    SOLO per il run attuale — memoria localizzata al run.
    Pattern B3 override: se trainer == canonical_trainer → Skiv canonical
    (docs/skiv/CANONICAL.md). Altri trainer → istanza generata da pool bioma.
  forbidden:
    - registro pure-tecnico (statistiche nude senza metafora)
    - sovrapporsi a Flint (non commentare il mondo universale)
    - inventare metafore fuori dal bioma corrente
    - parlare in terza persona
    - closing che non sia rituale bioma (savana → "Sabbia segue.", caverna → "L'eco risponde.", etc.)
  closing_pool: data/core/companion/skiv_archetype_pool.yaml §closing_pool per bioma
  integration_point:
    ui: apps/play/src/skivPanel.js (LIVE — initSkivPanel + openSkivPanel)
    api: apps/backend/routes/skiv.js (GET /api/skiv/card LIVE)
    pool: data/core/companion/skiv_archetype_pool.yaml (96 nomi × 8 biomi LIVE)
    canonical: docs/skiv/CANONICAL.md (B3 override rule)
```

---

## 5. Q1 + Q2 raccomandazione (Task 4 — timing)

### Q1 — Flint name reveal timing

**Raccomandazione**: Flint si nomina alla prima interazione con il **Nexus** (§3.0 — primo hub narrativo post-tutorial). Trigger specifico: quando il player entra per la prima volta nel Nexus encounter, Flint smette di essere "voce anonima" e l'UI rivela il nome nell'encounter header.

**Meccanismo pratico**: variabile ink `VAR flint_named = false`. Al trigger §3.0 → `~ flint_named = true`. Tutte le righe Flint precedenti usano tag `# speaker:voice` (anonima). Post-reveal: tag `# speaker:flint`.

**Perché funziona**: il reveal è organico (Flint si è guadagnata la fiducia del player attraverso 2-3 encounter intro/outro). La denominazione diventa evento narrativo — non convenzione editoriale. Pattern: Wildermyth companion naming dopo primo evento condiviso.

**Anti-pattern**: non svelare Flint in §1.0 (troppo presto, non c'è storia condivisa). Non svelare in combat (interruzione pacing). Non svelare via pop-up modale (rottura diegetic).

### Q2 — A.L.I.E.N.A. (Codex) first appearance timing

**Raccomandazione**: il tab Codex (struttura A.L.I.E.N.A.) appare nella UI dall'**onboarding** (§1.0), ma inizia **vuoto con 1 entry**: la specie del player. Unlock progressivo per ogni specie incontrata in combat (pattern Subnautica PDA scan %).

**Meccanismo pratico**: `codexPanel.js` Wave 9 — entry sbloccata automaticamente su `encounter_start` via evento sessione. Prima entry = species del player (sempre sbloccata). Altre entry = unlock su first-combat.

**Perché funziona**: il player vede subito la struttura A.L.I.E.N.A. applicata alla propria specie — comprende il metodo per induzione, non per spiegazione. La curiosità ("cosa metteranno nella mia scheda dopo il prossimo combattimento?") è il driver di engagement.

**Anti-pattern**: non aprire Codex automaticamente in combat (interruzione). Non far "parlare" A.L.I.E.N.A. come voce al primo unlock (rompe la regola fondamentale: A.L.I.E.N.A. non parla).

---

## 6. Migration effort + risk

### Effort stimato

| Task | Effort | Scope |
|---|---|---|
| Governance documentale (voice rules canonical) | 1-2h | ADR "narrative-identity" + aggiorna `docs/appendici/ALIENA_documento_integrato.md` §ruolo player-facing |
| Ink tag-split Flint vs Skiv nelle storie `.ink` esistenti | 2-3h | `data/narrative/*.ink` — aggiungere `# speaker:flint` / `# speaker:skiv` per ogni linea. `narrativeEngine.js` già tag-aware (`currentTags`) |
| Codex Wave 9 (già pianificata) | 8h | `docs/planning/codex-in-game-aliena-integration.md` — scope invariato, solo naming confermato: struttura = A.L.I.E.N.A. 6-tab |
| Flint name reveal logic ink + header UI | 1-2h | Variabile `VAR flint_named` + tag swap + encounter header render |
| **Totale reconciliation C2** | **12-15h** | Distribuibile in Wave 9 + Wave 10 |

Nota: Skiv-archetype **zero effort aggiuntivo** — già live in `skivPanel.js`, `routes/skiv.js`, `skiv_archetype_pool.yaml`.

### Risk

**R1 — Scrittura Flint (rischio P1)**: il pattern C2 richiede che qualcuno scriva le linee Flint per ogni encounter intro/outro. Budget: 2-4 righe × encounter. Con `inkjs` weave pattern + Tracery variazione (P2 dalla pattern library), il pool può essere generativo — ma il registro poetico di Flint richiede cura. **Mitigation**: definire un seed set di 10-15 linee Flint per i 5 tutorial encounter, poi scalare.

**R2 — Cognitive load test (rischio P2)**: 2 voci player-facing funzionano in teoria ma richiedono playtesting per verificare che Flint e Skiv non si sentano come stessa voce. **Mitigation**: il formato visivo le separa (Flint = box encounter header narrativo; Skiv = HUD overlay panel). Stesso pattern Wildermyth (narrazione box vs dialogo box).

**R3 — Flint anonimato regge? (rischio P2)**: se i playtester chiedono "chi parla?" prima di §3.0, l'anonimato è un bug UX non una feature. **Mitigation**: primo encounter intro dovrebbe avere una linea stilisticamente ricca che segnali "questa non è una notifica di sistema, è una voce". Il tono è la firma prima del nome.

**R4 — A.L.I.E.N.A. falso amico (rischio P0)**: future sessioni o designer potrebbero re-introdurre "A.L.I.E.N.A. AI voce" confondendo l'acronimo. **Mitigation**: ADR esplicito + commento in `codexPanel.js` header + `memory/feedback_aliena_is_acronym_not_ai.md` già esistente.

---

## Fonti primarie

- [Hades postmortem Game Developer 2021](https://www.gamedeveloper.com/design/how-hades-was-made-the-developer-s-complete-guide)
- [Bastion GDC 2012 — Storytelling Tools](https://www.gdcvault.com/play/1016641/Storytelling-Tools-to-Boost-Your)
- [Disco Elysium Skills Wiki](https://discoelysium.wiki.gg/wiki/Skills)
- [Micro-reactivity Disco Elysium Game Developer](https://www.gamedeveloper.com/business/understanding-the-meaningless-micro-reactive-and-marvellous-writing-of-i-disco-elysium-i-)
- [Wildermyth Steam store](https://store.steampowered.com/app/763890/Wildermyth/)
- [Wildermyth Procedural Narrative Vice 2021](https://www.vice.com/en/article/pkbz78/wildermyth-review)
- [Beyond Branching Emily Short 2016](https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/)
- [ink inklestudios](https://www.inklestudios.com/ink/)
- [Failbetter StoryNexus Tricks](https://www.failbettergames.com/news/narrative-snippets-storynexus-tricks)
- [Thought Cabinet Disco Elysium Devblog](https://discoelysium.com/devblog/2019/09/30/introducing-the-thought-cabinet)

---

## File repo rilevanti

| File | Nota |
|---|---|
| `docs/appendici/ALIENA_documento_integrato.md` | Definizione canonica A.L.I.E.N.A. = metodo 6-dim |
| `docs/planning/codex-in-game-aliena-integration.md` | Wave 9 plan 8h — scope compatibile C2 |
| `apps/play/src/codexPanel.js:1-5` | Stub W8L con commento esplicito "A.L.I.E.N.A. = Wave 9+" |
| `services/narrative/narrativeEngine.js:79` | Tag-aware già (OD-013 Path B: `# mbti:X` tag) — estendibile a `# speaker:flint` |
| `data/narrative/` | Directory storie ink — target tag-split |
| `data/core/companion/skiv_archetype_pool.yaml` | Pool 96 nomi × 8 biomi LIVE |
| `apps/play/src/skivPanel.js` | UI Skiv LIVE — FALLBACK_CARD con "Sabbia segue." |
| `apps/backend/routes/skiv.js` | `/api/skiv/card` LIVE |
| `docs/skiv/CANONICAL.md` | B3 override rule + voice canonical |
| `memory/feedback_aliena_is_acronym_not_ai.md` | Anti-pattern guard permanente |
