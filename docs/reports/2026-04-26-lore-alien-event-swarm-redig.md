---
title: "Lore alien-event: swarm re-dig — fonti esterne non esplorate"
doc_status: draft
doc_owner: repo-archaeologist
workstream: cross-cutting
last_verified: "2026-04-26"
source_of_truth: false
language: it
review_cycle_days: 30
---

# Lore alien-event — Swarm Re-dig

**Data**: 2026-04-26  
**Mandato**: scavare nei path NON esplorati dal primo lore-research agent (ChatGPT dump, concept-explorations, historical-snapshots, biomes docs, incoming ricorsivo).

---

## TL;DR (5 bullet)

1. **FOUND_RICH — ma non è "alien event" nel senso classico.** Il materiale ricco sepolto nei Vertical Slice HTML (`docs/archive/concept-explorations/2026-04/`) descrive un sistema narrativo basato su **"evento mutageno"** e **"Frattura Abissale Sinaptica"** — ecosistema abissale stratificato dove l'evento non è alieno/esterno, ma è la creatura stessa (Leviatano Risonante, specie canonical `data/core/species.yaml:148`) a generare l'instabilità.

2. **A.L.I.E.N.A. NON è un evento alieno.** È l'acronimo di **Ambiente · Linee evolutive · Impianto morfo-fisiologico · Ecologia · Norme socio · Ancoraggio narrativo** — metodo didattico/design specie (`docs/appendici/ALIENA_documento_integrato.md`, last_verified 2026-04-14). Il nome crea confusione ma il contenuto è un framework classificatorio. Nessun "alien invasion" nascosto qui.

3. **I ChatGPT snapshot `data/external/chatgpt/` sono placeholder scaffolding**, non dump reali di sessione design. I file `snapshot-*-local-export.json` contengono `"conv-001: Aggiornamento progetto"` — template vuoti. Unica eccezione: i 2 snapshot API (2025-10-22, 2025-10-23) citano "Evento Echo Drifters", "Reattori Aeon", "Resonance Shards" — concept che poi sono stati integrati nei biomi canonical.

4. **Lore canonical del "sistema cosmico" trovata in `docs/planning/draft-narrative-lore.md`** (SHA `8e6b0bbf`): "Il Sistema (Director AI) è la forza ecologica che mantiene l'ecosistema in tensione". Il "sistema" non è risposta ad un evento alieno — IS il test evolutivo. La premessa è bio-plausibile senza evento esterno.

5. **Biomi "planari" esistono (Rovine Planari Fratturate, `data/core/biomes.yaml:718`) ma sono gameplay lore locale**, non backstory di un evento cosmico globale. Il termine "planare" = dimensioni diverse come mechanic di bioma, non origine del mondo.

---

## Inventario fonti scoperte

Ordine per rilevanza lore. File:line reali verificati.

### Fonte 1 — Vertical Slice "Risveglio del Leviatano" HTML
**Path**: [`docs/archive/concept-explorations/2026-04/Vertical Slice - Risveglio del Leviatano.html`](../archive/concept-explorations/2026-04/Vertical Slice - Risveglio del Leviatano.html)  
**SHA intro**: `de321c95` (PR #1670, 2026-04-19)  
**Status**: ARCHIVIATO (integrato-design-map:162 — "Archivia. Non P0/P1")

Quote chiave:
```
CAP. VII · RISVEGLIO DEL LEVIATANO
MATCH 147 · FRATTURA ABISSALE SINAPTICA · 17 TURNI · ESITO: ACCORDO CON IL LEVIATANO
« Il Leviatano non è morto. E ora sa il vostro nome. »
› alla prossima sessione: il suo canto raggiungerà la Foresta
Obiettivi: Disinnescare il Canto dello Strappo nella Frattura Nera o accordarsi con il Leviatano Risonante.
```

Meccaniche lore rilevanti:
- **"trait planare"** (`strappo planare`) guadagnato in combat se si sceglie via C (acquisire mutazione)
- **"eco_lucido"** come trait in osservazione (non ancora in active_effects.yaml)
- **"spillover"** = conseguenza ecologica delle scelte player (non invasione aliena)
- **"tracce memetiche"** = memoria del bioma modificata dall'esito della missione
- 3 esiti: ACCORDO / RITIRATA CONTROLLATA / COMBATTIMENTO/FRATTURA — ognuno con conseguenze bioma persistenti

### Fonte 2 — Vertical Slice "Minute 2 — Evento Mutageno" HTML
**Path**: [`docs/archive/concept-explorations/2026-04/Vertical Slice - Minute 2 Combat.html`](../archive/concept-explorations/2026-04/Vertical Slice - Minute 2 Combat.html)  
**SHA intro**: `de321c95`

Quote chiave:
```
MINUTO 2 · EVENTO MUTAGENO · SOGLIA
PRESSIONE MUTAGENA SOGLIA T2 RILASCIO T3 0.25 ▲ +0.25/turno
A.L.I.E.N.A. · WIKI — evento registrato · 4 conseguenze tracciate
NODO NEURALE · RILASCIO IMMINENTE
4 vie · nessuna giusta:
  A · SOPRAVVIVI: resisti 3 turni
  B · RAGGIUNGI IL NODO: Form → esploratore
  C · ACQUISISCI LA MUTAZIONE: +trait neurale strappo_planare
  D · PROTEGGI IL KEYSTONE: difendi Polpo · bioma stabile
```

Il "evento mutageno" = nodo neurale che rilascia energia quando la pressione supera soglia. Causato dall'azione player al T1 (passaggio aggressivo in Soglia). NON è un evento alieno proveniente dall'esterno.

### Fonte 3 — Pitch Deck v2 (concept exploration)
**Path**: [`docs/archive/concept-explorations/2026-04/Evo Tactics Pitch Deck v2.html`](../archive/concept-explorations/2026-04/Evo Tactics Pitch Deck v2.html)  
**SHA intro**: `de321c95`

Quote chiave (testo estratto):
```
d20 vs DC, evento mutageno, "4 vie · nessuna giusta"
Spillover mutageno (creature che si contaminano) — concept nuovo
BiomeMemory cross-mission — lacuna potenziale
worldbuilding parallelo A.L.I.E.N.A., Flint, biomi Cresta/Soglia/Frattura, spillover: sketchbook, non design utilizzabile
```

**Nota critica del Pitch Deck stesso**: "Questo lavoro è stato sviluppato senza prima leggere il Freeze v0.9 né il SoT v4. Il risultato: storytelling forte, **allineamento debole**." Il deck esplicitamente si auto-archivia.

### Fonte 4 — `draft-narrative-lore.md` (premessa narrativa canonical)
**Path**: [`docs/planning/draft-narrative-lore.md`](../planning/draft-narrative-lore.md)  
**SHA**: `8e6b0bbf` (PR #1430, narrative inkjs)

Quote chiave:
```
> Il mondo non ha nome. Le creature che lo abitano non sanno di essere osservate.
> Tu sei il Sistema — o forse, sei chi resiste al Sistema.

Un ecosistema primordiale in equilibrio instabile. Creature modulari evolvono in risposta 
a pressioni ambientali. Non c'è "bene" o "male" — c'è pressione selettiva e risposta adattiva.

Il Sistema (Director AI) è la forza ecologica che mantiene l'ecosistema in tensione: 
introduce predatori, altera terreni, scatena StressWave. Non è malvagio — è il test evolutivo.
Tono: Fantastico bio-plausibile (evoluzione accelerata, non magia)
Meta-narrativa: i giocatori capiscono che il Sistema li sta addestrando, non solo testando.
```

Questo è il doc canonical della lore. NON menziona "alien event". La forza esterna È il Sistema (Director AI).

### Fonte 5 — Biomi "planari" canonical
**Path**: `data/core/biomes.yaml:718` e `data/core/biomes.yaml:755`

```yaml
# biomes.yaml:718
rovine_planari:
  display_name_it: Rovine Planari Fratturate
  summary: Metropoli extraplanare in rovina con portali instabili e correnti di energia astrale.
  affixes: [planar_rift, psionic_echo, cenere_memetica]
  npc_archetypes: [wardens_planari, mercanti_iconoclasti, oracoli_aurorali]
  
# biomes.yaml:755
frattura_abissale_sinaptica:
  summary: Bioma abissale stratificato con tre livelli e correnti elettroluminescenti.
  npc_archetypes: [araldi_fotofase, sciami_memetici, leviatani_risonanti, cori_voidsong]
  narrative.hooks:
    - Disinnescare il Canto dello Strappo nella Frattura Nera o accordarsi con il Leviatano Risonante.
```

### Fonte 6 — Leviatano Risonante specie canonical
**Path**: `data/core/species.yaml:148`

```yaml
- id: leviatano_risonante
  genus: Resonoleviathan
  epithet: abyssalis
  clade_tag: Apex
  sentience_tier: T5
  biome_affinity: frattura_abissale_sinaptica
  trait_plan:
    core: [camere_risonanza_abyssal, emettitori_voidsong, corazze_ferro_magnetico, bioantenne_gravitiche]
    optional: [vortice_nera_flash, canto_risonante, pelle_piezo_satura, lobi_risonanti_crepuscolo]
```

T5 = sentient. "Il Leviatano non è morto. E ora sa il vostro nome." — ha coscienza narrativa.

### Fonte 7 — Frattura Abissale Sinaptica lore doc
**Path**: [`docs/biomes/Frattura_Abissale_Sinaptica_lore.md`](../../biomes/Frattura_Abissale_Sinaptica_lore.md)  
**SHA**: `76d83209`

```
Livello 3 – Frattura Nera: canyon abissale dominato da eco elettriche profonde 
e risonanze gravitazionali. Archi di pietra ferro-magnetica canalizzano correnti massive.
Tono: reverenza, minaccia sovrastante, metamorfosi forzata.

Leviatano Risonante (boss, forma variabile per fase bioma): colosso che cambia assetto 
in base al livello attraversato; assorbe correnti per modulare carapace e sonar. 
Hook: caccia rituale per ottenere armonie; possibilità di renderlo alleato se si accordano i tre livelli.
```

### Fonte 8 — ChatGPT snapshot API (design context)
**Path**: `data/external/chatgpt/2025-10-22/snapshot-20251022T180000Z.json` e `...10-23T101500Z.json`

```json
// 2025-10-22:
"Evento Echo Drifters: infiltrazione in grotte risonanti con obiettivi stealth."
"Risorsa Resonance Shards: usata per potenziare moduli sonar e aprire porte sigillate."
"Nidi itineranti: i clan sabbiosi possono spostare l'avamposto ogni tre turni di campagna."

// 2025-10-23:
"Missione Skydock Siege: incursione verticale con obiettivi multi-livello."
"Reattori Aeon: nuova risorsa leggendaria per sbloccare abilità temporali nelle forme Armoniche."
```

Questi concept sono stati poi parzialmente integrati: `data/core/biomes.yaml:570` ha "Ripristinare i reattori Aeon prima del blackout totale" e `data/core/missions/skydock_siege.yaml` esiste come missione canonical.

### Fonte 9 — Armatura di Pietra Planare (trait canonical)
**Path**: `data/core/traits/glossary.json:104` + `active_effects.yaml:2480`

```json
"armatura_pietra_planare": {
  "label_it": "Armatura di Pietra Planare",
  "description_it": "Corazza risonante scolpita da roccia extradimensionale che smorza onde d'urto."
}
```
Active effects: `tier: T3`, `damage_reduction: 2`. Il "planare" qui = materiale extradimensionale usato come trait meccanica, non lore-backstory di evento cosmico.

### Fonte 10 — A.L.I.E.N.A. documento integrato
**Path**: [`docs/appendici/ALIENA_documento_integrato.md`](../../appendici/ALIENA_documento_integrato.md)  
**SHA**: PR non tracciato singolarmente (pre-cleanup)

Demistificazione:
```
A.L.I.E.N.A. = Ambiente · Linee evolutive · Impianto morfo-fisiologico · 
                Ecologia & comportamento · Norme socioculturali · Ancoraggio narrativo
Scopo: framework didattico/design per progettare specie in modo coerente e tracciabile.
Status: active appendix. NON sistema di gameplay. NON evento narrativo.
```

---

## Mappa concettuale aggiornata

```
NON ESISTE un "alien event" esplicito nella lore canonical di Evo-Tactics.

Invece esiste questa struttura:

PRESSIONE EVOLUTIVA (layer 1 — macro)
  └── Il Sistema (Director AI) = forza ecologica, non entità aliena
      └── Introduce predatori, altera biomi, scatena StressWave
      └── NON malvagio — è il test che forgia le creature
      
PRESSIONE EVOLUTIVA (layer 2 — bioma)
  └── Frattura Abissale Sinaptica = bioma estremo con Leviatano T5 (sentient)
      ├── "Evento mutageno" = nodo neurale che rilascia energia per azioni player
      ├── "Spillover" = effetti ecologici delle scelte player che si propagano
      └── "Strappo planare" = trait guadagnabile via accordo/combattimento con Leviatano
      
LORE PLANARE (layer 3 — cosmological, solo biomi specifici)
  └── Rovine Planari Fratturate = ex-metropoli con portali instabili
      ├── "Wardens planari" + "Mercanti iconoclasti" come NPC archetypes
      └── "Rete planare" ricostruita (packs/evo_tactics_pack/data/ecosystems/rovine_planari.ecosystem.yaml:47)
      
CONCEPT ARCHIVIATO (NON CANON)
  └── Vertical Slice 4 HTML (2026-04-19) = sketchbook parallelo
      ├── A.L.I.E.N.A. come voice companion in-game (scartato, non nel Freeze)
      ├── Flint come companion diegetic (scartato come NPC named)
      ├── "Evento mutageno" come gameplay loop (parzialmente integrato via spillover mechanic)
      └── "Trait planare" da accordo col Leviatano (eco_lucido/strappo_planare non in active_effects)
```

---

## Reconciliation con premessa narrativa ufficiale

Il `draft-narrative-lore.md` stabilisce: **"Fantastico bio-plausibile (evoluzione accelerata, non magia)"**.

Tutti i materiali trovati sono coerenti con questa premessa:
- "Evento mutageno" = nodo neurale che rilascia energia bioelettrica (plausibile bio)
- "Trait planare" = meccanica gameplay su bioma con fisica diversa, non magia
- "Leviatano Risonante T5" = creatura senzienziale altamente evoluta (plausibile T5)
- "Rovine Planari" = setting con lore di portali, ma non spiega un "alien arrival" globale

**Nessuna contraddizione** con la premessa. La premessa stessa non chiude la porta a concept "planari" se trattati come biomi-mechanic (non origin-story del mondo).

**Gap identificato**: il `draft-narrative-lore.md` ha `source_of_truth: false` e 3 gap aperti (`<!-- [ ] Gap aperti residui -->`). Non è stato ancora promosso a `docs/core/`. La lore macro del mondo non ha un doc canonical definitivo.

---

## Path verso canon

### Se user vuole rendere canonical la lore "Leviatano + Frattura Abissale":

1. **ADR "Narrativa Macro — Frattura Abissale come arco flagship"**: codifica che la Frattura Abissale Sinaptica è l'arco narrativo principale (3-5 encounter), con esiti multi-branch (ACCORDO/RITIRATA/FRATTURA) che modificano il meta-bioma. Leviatano Risonante come "boss narrativo" non kill-only. ~1h ADR, poi via `sot-planner`.

2. **Promuovere `draft-narrative-lore.md` a `docs/core/`**: fill i 3 gap aperti (quanti briefing, Ink roadmap, tono verificato da playtest). ~2-4h. Poi governance check.

3. **Wire i trait "eco_lucido" e "strappo_planare" menzionati nel Vertical Slice**: attualmente non esistono in `active_effects.yaml`. Il Vertical Slice li descrive come trait ottenibili da ACCORDO/C con Leviatano. ~2-3h (vedi pre-card audit step 4 obbligatorio).

### Se user vuole formalizzare il concept "spillover mutageno":
4. **Card museum per "Spillover Mutageno"**: concept dal Vertical Slice (non ancora in active_effects né in game logic). Reuse path: `apps/backend/services/combat/reinforcementSpawner.js` — quando bioma ha spillover registrato, lo spawner aggiunge creature "mutate" del bioma adiacente. Effort Moderate ~4-6h.

### Se user vuole "alien event" come premessa esplicita:
5. **Non esiste materiale che supporti questa direzione nel repo.** Tutti i file trovati puntano a pressione ecologica interna (Sistema + Biomi). Un "alien event" richiede ADR new + user decision product, NON recupero di lore sepolto.

---

## Curation candidate (1-3 museum card)

### Candidate 1 — Trait "eco_lucido" e "strappo_planare" (non wired)
**Domain**: old_mechanics / architecture  
**Score stimato**: 4/5 (concept concreto, bioma esiste, Leviatano canonical, trait mancante)  
**Provenance**: `docs/archive/concept-explorations/2026-04/Vertical Slice - Risveglio del Leviatano.html` (SHA `de321c95`)  
**Reuse path**: `data/core/traits/active_effects.yaml` + `data/core/traits/glossary.json` — aggiungere entries `eco_lucido` (bonus vs confusion, dialogo keystone) e `strappo_planare` (trait neurale guadagnato da accordo Leviatano, 3 sessioni duration)  
**Pre-card audit necessario**: verificare se duration-limited traits hanno schema in active_effects (non evidente).

### Candidate 2 — Spillover Mutageno come mechanic runtime
**Domain**: old_mechanics  
**Score stimato**: 3/5 (concept chiaro, implementation non definita, blast radius ×1.5 combat)  
**Provenance**: `docs/archive/concept-explorations/2026-04/Vertical Slice - Minute 2 Combat.html` (SHA `de321c95`)  
**Reuse path**: `apps/backend/services/combat/reinforcementSpawner.js` — spawn aggiuntivo creature "mutate" da bioma adiacente quando pressione supera soglia  
**Nota**: concept già parzialmente simile a biome spawn bias (`biomeSpawnBias.js` V7 shipped). Overlap da valutare.

### Candidate 3 — Arco narrativo multi-esito Leviatano (lore design doc)
**Domain**: architecture / other  
**Score stimato**: 4/5 (Leviatano è canonical, bioma esiste, 3 esiti narrativi definiti nel Vertical Slice)  
**Provenance**: `docs/biomes/Frattura_Abissale_Sinaptica_lore.md` (SHA `76d83209`) + `draft-narrative-lore.md` (SHA `8e6b0bbf`)  
**Reuse path**: `apps/backend/services/narrativeEngine.js` + Ink narrative service — aggiungere storylet "frattura_abissale" con branch accordo/ritirata/combattimento  
**Effort**: Moderate ~5-8h (inkjs integration esiste già, Sprint I1+I2 PR #1430)

---

## Coda: path AI satellite (non accessibili)

Per completezza: WORKSPACE_MAP segnala 3 AI satellite locali con potenziale materiale lore design:
- `~/Dafne/` (81MB): AI locale per content generation — potenziale dump sessioni design specie non versionato
- `~/aa01/` (Archon Atelier): design tool locale — possibile sketchbook
- `~/.openclaw/` runtime: runtime AI locale

**Non accessibili da questo repo.** Se user vuole scavare qui, richiede sessione locale su altra macchina.

---

## Fonti PR chiuse (ricerca rapida)

Nessun PR trovato via `git log --grep` con keyword alien/leviatano/mutageno/planare. Il materiale Vertical Slice è stato aggiunto tramite PR #1670 (`de321c95`) come archivio non-canonical, non come feature.

---

## Verdict finale

**FOUND_RICH** — materiale ricco trovato, ma la "lore alien event" come concetto di invasione/arrivo esterno **NON ESISTE** nel repo. Quello che esiste:

| Concetto cercato | Realtà trovata | Status |
|---|---|---|
| "Alien event" (invasione/arrivo) | Non esiste | CONFIRMED_ZERO per questa specifica accezione |
| Forza esterna che altera l'ecosistema | Sistema (Director AI) = test evolutivo | FOUND — in `draft-narrative-lore.md` |
| "Evento mutageno" | Mechanic bioma gameplay (pressione → nodo neurale) | FOUND_RICH — in Vertical Slice + biomes.yaml |
| "Alien" come creature/entità | A.L.I.E.N.A. = acronimo metodo design, non entità | CONFIRMED_ZERO (false friend) |
| "Planare" come lore cosmologica | Bioma-mechanic, non origin story globale | FOUND_THIN — in biomes.yaml |
| Leviatano come entity narrativa T5 | Specie canonical + lore hooks multi-esito | FOUND_RICH — in species.yaml + biomes.yaml |
| Trait "strappo_planare"/"eco_lucido" | Concept da Vertical Slice, non wired | FOUND — sepolto in HTML archiviato |
