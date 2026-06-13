---
title: 'Tribe / Tribù — Discovery Report (job → tribe rename intent)'
doc_status: research
doc_owner: research-agent
workstream: cross-cutting
last_verified: '2026-04-26'
language: it
review_cycle_days: 14
---

# Tribe / Tribù — Discovery Report

**Trigger**: user dichiarazione 2026-04-26 — _"i così detti job per ora devono diventare le 'tribe' o tribù — una meccanica che fin ora sembra esserti sfuggita"_.

**Verdict**: 🟡 **PARTIAL FOUND** — keyword "tribe"/"tribù" pressoché ZERO in repo.
Ma esiste un **proto-system di "clan"** disegnato in concept-explorations 2026-04 (vertical slice M0 + pitch deck SUPERSEDED) che è la **probabile lineage di "tribe"**. Il design è stato superseded dal sistema **MBTI Forms** (16 archetipi) nel pitch deck v2 + co-op MVP spec 2026-04-26. Il rename `job → tribe` significa probabilmente **resuscitare il proto-clan e fonderlo con il job system**.

## TL;DR (5 bullet)

1. **Zero "tribe"/"tribù" canonical**: solo 1 commento in `balance-illuminator.md:223` (analogia Palworld breeding "matriarca/patriarca tribe") + 1 mention in `sentience-branch-layout/ROADMAP.md:34` ("eventi sociali di banda/tribù") + 1 in `2008_spore.md:22` (riferimento Spore Tribe stage). NESSUN runtime, schema, dataset.
2. **Proto-system "clan" trovato**: 4 clan canonical nel vertical slice M0 onboarding (archived 2026-04) — **Scriba** (osservatore), **Cacciatore** (predatore), **Simbionte** (legame), **Custode** (difensore). Ognuno = identità diegetic + trait iniziale + relazione con Flint + reazione alle azioni del player. Vedi `docs/archive/concept-explorations/2026-04/Vertical Slice - Minute 0 Onboarding.html:312-2095`.
3. **Sistema clan → SUPERSEDED**: pitch deck v2 (canonical 2026-04-20) e co-op MVP spec (2026-04-26) hanno sostituito i 4-clan con i **16 MBTI Forms** (Custode/Stratega/Catalysta/Artigiano…). Nessuna scelta clan in onboarding live: oggi player sceglie **trait identitario** (zampe_a_molla / pelle_elastomera / denti_seghettati) — vedi `docs/core/51-ONBOARDING-60S.md:39-69`.
4. **Differenza tribe vs job**: i **job attuali** (`vanguard`, `skirmisher`, `warden`, `artificer`, `invoker`, `harvester`, `ranger` — 7 base + 4 expansion `data/core/jobs.yaml:14`, `jobs_expansion.yaml`) sono **specializzazione di ruolo individuale** (DPS/tank/heal). I **clan** archived erano **identità di gruppo/cultura** (chi sei, chi ti accoglie, cosa il mondo ti ricorda). User intent "rinomina job → tribe" sembra unificare i due livelli: la classe meccanica diventa anche affiliazione culturale.
5. **Connessione mating/Nido**: il termine "clan" appare in `data/external/chatgpt/2025-10-22/snapshot-20251022T180000Z.json:5` _"i clan sabbiosi possono spostare l'avamposto ogni tre turni"_ + `docs/frontend/feature-updates.md:85,92` _"progressione narrativa di clan"_ con `dune_stalker`/`echo_morph` come baseline. **Tribe come aggregato di stessa-specie nel bioma con Nido itinerante** è plausibile: il "Clan Araldo" del user (12 NPC stessa specie) collima.

## Quote testuali (citazioni file:line)

### A. Vertical Slice M0 Onboarding (concept exploration superseded)

```
docs/archive/concept-explorations/2026-04/Vertical Slice - Minute 0 Onboarding.html:312
  Evo Tactics · Minute 0 · Onboarding al clan
                                                                  
docs/.../Vertical Slice - Minute 0 Onboarding.html:314
  Cutscene → Rifiuto → Test di ingresso → Scelta clan · 4 beat

docs/.../Vertical Slice - Minute 0 Onboarding.html:754
  RIFIUTATO 4 / 4 clan

docs/.../Vertical Slice - Minute 0 Onboarding.html:1280
  CLAN · SCRIBA   « La osservazione precede l'azione. »
  COSA TI DÀ: Wiki A.L.I.E.N.A. · Flint mentore tono scientifico ·
              trait «Lettura del bioma»
  COSA TI CHIEDE: registra ogni evento. se smetti di scrivere,
                  il clan ti perde.

docs/.../Vertical Slice - Minute 0 Onboarding.html:1348-1389
  GLI ALTRI CLAN · TI GUARDANO
   CACCIATORE · disponibile se Form → predatore
   SIMBIONTE · disponibile se Form → 0.7 simb.
   CUSTODE   · disponibile dopo 1° keystone protetto

docs/.../Vertical Slice - Minute 0 Onboarding.html:1398-1404
  CAMBIARE CLAN: è possibile · costa 3 sessioni · wiki dimezzata
  e il vecchio clan non ti riaccoglie mai più

docs/.../Vertical Slice - Minute 0 Onboarding.html:2076-2079
  data-clan="S"  Scriba   data-clan="C"  Cacciatore
  data-clan="Si" Simbionte  data-clan="Cu" Custode
```

### B. Test di ingresso (4 stimoli simultanei = 4 clan paths)

```
docs/.../Vertical Slice - Minute 0 Onboarding.html:847-918
  4 corners: one per clan-aligned challenge
   SCRIBA · osservare       trovo il pattern senza toccare
   CACCIATORE · catturare   la creatura fugge · prendila
   SIMBIONTE · legare       la creatura è ferita · curala
   CUSTODE · difendere      qualcosa sta per essere distrutto · proteggi

docs/.../Vertical Slice - Minute 0 Onboarding.html:1062-1069
  La Prova non ti assegna — ti RIVELA.
  Se fai due cose opposte, il tuo Form parte ibrido.
```

### C. Pitch deck SUPERSEDED loop macro

```
docs/archive/concept-explorations/2026-04/Evo Tactics Pitch Deck [SUPERSEDED].html:344-346
  M0 · onboarding — Radura della Prima Luce
  4 clan ti rifiutano. La Prova legge chi sei dalle tue azioni,
  non dalle dichiarazioni.
```

### D. Mating/Nido — clan come aggregato di specie

```
data/external/chatgpt/2025-10-22/snapshot-20251022T180000Z.json:5
  "Nidi itineranti: i clan sabbiosi possono spostare l'avamposto
   ogni tre turni di campagna."

docs/frontend/feature-updates.md:85
  "Nidi itineranti con ancoraggi — Gli spostamenti dei clan sabbiosi
   richiedono Resonance Shards per stabilizzare il trasferimento
   tra turni."

docs/frontend/feature-updates.md:92
  "Standard di Nido — I profili dune_stalker ed echo_morph specificano
   ambiente, struttura e risorse, fungendo da baseline per la
   progressione narrativa di clan."
```

### E. Tribe references esistenti (3 totali, marginali)

```
.claude/agents/balance-illuminator.md:223
  "IV-stile potential per stat variance. Asymmetric parent bias =
   flavor (matriarca/patriarca tribe)."  // Palworld analogy

docs/planning/research/sentience-branch-layout/ROADMAP.md:34
  "Eventi sociali di banda/tribù attivi"  // Fase B sentience

docs/planning/research/refs/2008_spore.md:22
  "Meta: carry-over scelte tra stadi; economia strumenti
   in Tribù/Civ/Spazio."  // Spore reference
```

### F. Sistema attuale (canonical 2026-04-26)

```
data/core/jobs.yaml:1-3
  # Job System — Evo-Tactics
  # Base 6 dal vision doc (Skirmisher, Vanguard, Warden, Artificer,
  # Invoker, Harvester) + Ranger aggiunto come 7o job.

docs/core/00-SOURCE-OF-TRUTH.md:292
  Il Job è la specializzazione di ruolo: vanguard, skirmisher, warden,
  artificer, invoker, harvester.

docs/core/51-ONBOARDING-60S.md:48-50
  OPZIONE A "Come veloce e sfuggente" → trait zampe_a_molla
  OPZIONE B "Come duro e inamovibile" → trait pelle_elastomera
  OPZIONE C "Come letale e preciso"   → trait denti_seghettati

docs/planning/2026-04-26-coop-mvp-spec.md:65-69
  ┌ ISTJ ┐ ┌ INTJ ┐ ┌ ENFP ┐ ┌ ISFP ┐
  │Custode│ │Strateg│ │Cataly│ │Artigi│  ... 16
  Scelta: ISTJ · Custode · +HP+DEF
```

## Differenza tribe vs job (ipotesi user-driven)

| Dimensione | **Job (canonical attuale)** | **Tribe (proposta user)** | **Clan (proto archiviato)** |
| --- | --- | --- | --- |
| Scope | Individuale | Individuale + di gruppo? | Di gruppo (cultura) |
| Scelta player | Ortogonale a specie + Forma | TBD | Test di azioni (no dichiarazione) |
| Roster | 7 base + 4 expansion = 11 | TBD | 4 fissi (Scriba/Cacc./Simb./Cust.) |
| Meccanica | Initiative, range, abilities R1/R2 | TBD (eredita job?) | Trait iniziale + Flint + relazione mondo |
| Diegetico | Job = "ciò che fai" | TBD | Clan = "chi ti accoglie" |
| Switch | Libero | TBD | Costoso (3 sessioni + wiki dimezzata) |
| Runtime | `apps/backend/services/jobsLoader.js` + 84 perks | ZERO | ZERO (tutto archived HTML concept) |

**Insight chiave**: il job system corrente risolve "cosa fa il PG meccanicamente". Il proto-clan risolveva "chi è il PG culturalmente + cosa il mondo ricorda di te". Sono **due assi ortogonali** — il rename `job → tribe` può:

- **(a)** Sostituire il job (tribe = nuovo nome cosmetico per skirmisher/vanguard/etc) — **basso valore**
- **(b)** Fondere i due assi (skirmisher È una tribù = "i Veloci", warden È una tribù = "i Custodi") — **alto valore narrativo, basso costo runtime**
- **(c)** Aggiungere un layer (job individuale + tribe di gruppo) — **alto costo, alto valore identità co-op**

## Mating/Nido connection (mappa)

Evidence frammentaria suggerisce che `clan` viva già nel sub-sistema mating/Nido:

- `data/external/chatgpt/2025-10-22 snapshot:5` — "clan sabbiosi" muovono Nido ogni 3 turni
- `docs/frontend/feature-updates.md:92` — `dune_stalker` e `echo_morph` species profiles = baseline di "progressione narrativa di clan"
- `data/core/biomes.yaml:273,713` — biomi accennano a "tribù eco-sintonizzate" e "tribù adattate alla rete"

**Ipotesi**: tribe = aggregato di N individui di **stessa specie + stesso bioma + Nido condiviso**. Coerente con user "Clan Araldo = 12 polpi stessa specie".

## Runtime status

- ❌ **Tribe runtime**: ZERO (no module, no schema, no data, no test)
- ❌ **Clan runtime**: ZERO (solo HTML archived concept)
- ✅ **Job runtime**: live + wired (`jobsLoader.js`, `progressionEngine.js`, 84 perks, 11 jobs total con expansion)
- 🟡 **Mating/Nido runtime**: parziale — engine esiste in repo (museum card `mating_nido-engine-orphan.md`) ma non wirato a "clan/tribe" semantically. Vedi `docs/museum/cards/mating_nido-canvas-nido-itinerante.md` + `mating_nido-engine-orphan.md`.

## 3 Pattern industry (riferimenti per design call)

1. **Crusader Kings 3 — Dynasty + House** (Paradox). Dynasty = lignaggio (immutable), House = ramo politico (mutable). Player gestisce entrambi: tratti dinastici sbloccati per achievement (scoperta culturale = +XP), House definisce alleanze. Lesson: separare "lineage immutable" (specie?) da "tribe mutable" (affiliazione).

2. **Wartales — Companies** (Shiro Games). 4-6 mercenari = una compagnia con reputation per regione, professione individuale (cuoco, fabbro, tracker) MA appartenenza condivisa. Lesson: tribe come "company persistent" che cambia status nel mondo via azioni; job individuale ortogonale.

3. **Wildermyth — Generations + Legacy heroes** (Worldwalker). Eroi diventano leggende, figli ereditano tratti. Le "tribe" qui sono tematiche (forest/mountain) e influenzano spawn pool dei companion. Lesson: tribe come bias di spawning (biome + style) + meta-progression cross-campaign.

## Domande chiave per user (definire prima di implementare)

1. **Scope**: tribe sostituisce job (rename cosmetico) O aggiunge layer (job individuale + tribe di gruppo) O fonde (1 job = 1 tribe)?
2. **Granularità**: tribe = per-PG (come job ora) o per-roster intero (come la scelta identitaria 60s onboarding)?
3. **Roster size**: i 4 clan archivio (Scriba/Cacc./Simb./Cust.) sono il target, o vuoi 7+ tribe corrispondenti ai job esistenti?
4. **MBTI Forms vs tribe**: il design 2026-04-26 ha 16 MBTI Forms come asse identitario co-op. Tribe è ortogonale a MBTI, alternativa, o ne diventa il nome?
5. **Mating/Nido link**: tribe = aggregato species+bioma (Clan Araldo pattern)? Allora chi sceglie la tribe — il player O emerge dal worldgen?
6. **Switch cost**: il proto-clan aveva 3 sessioni + wiki dimezzata. Mantieni costo alto (irreversibile-quasi) o flat?
7. **Feature freeze**: oggi job 11 + 84 perks live. Migrazione graduale (rename in-place) o rebuild from scratch?

## Roadmap suggerita (3 path A/B/C)

### Path A — Cosmetic rename (1 sprint, ~6h)

1. Rinomina `data/core/jobs.yaml` → `data/core/tribes.yaml` (alias preservato in loader)
2. UI label: "Job" → "Tribù" in tutti i pannelli (`progressionPanel.js`, `formsPanel.js`, `apps/play/src/main.js`)
3. Nessun cambio runtime/schema. ADR rename. **No nuova meccanica**.

### Path B — Tribe = aggregato species in roster (2-3 sprint, ~25h)

1. Nuovo schema `data/core/tribes.yaml` — N tribe (4-7), ognuna con species_pool, biome bias, signature trait, identity gauge
2. PartyRoster acquisisce `tribe_id` durante onboarding (estensione `/api/campaign/start`)
3. Tribe modifica spawn bias bioma (analog Wildermyth) + reward pool (PI rolls)
4. Job rimane individuale (ortogonale, no rename)
5. Frontend: tribe shown a livello roster TV (host view), no per-PG

### Path C — Tribe replaces job + clan diegetic (3-4 sprint, ~40h)

1. Resuscitare 4 clan archivio (Scriba/Cacc./Simb./Cust.) come **proper tribe**
2. Map jobs attuali → tribe: skirmisher+ranger → Cacciatore, warden+vanguard → Custode, artificer+harvester → Scriba, invoker → Simbionte
3. Tribe scelta in onboarding 60s (sostituisce 3-trait choice corrente)
4. Cambio tribe = costoso (3 sessioni + wiki halved, come archivio)
5. Mondo memorizza tribe (Atlas state) → influenza spawn, narrativo
6. **Breaking change**: schema migration jobs → tribes, perks rename, ADR

**Raccomandazione preliminare**: **Path B** equilibrio costo/valore. Path A è solo rename (basso valore narrativo, user dice "meccanica che ti è sfuggita" → vuole semantica). Path C è massimo impact ma rischia di rompere co-op MVP 2026-04-26 in fase di playtest.

## File path canonici (ricap absolute)

- `C:\Users\edusc\Desktop\gioco\Game\.claude\worktrees\cranky-easley-606ae0\docs\archive\concept-explorations\2026-04\Vertical Slice - Minute 0 Onboarding.html` — proto-clan canonical 4-clan design
- `C:\Users\edusc\Desktop\gioco\Game\.claude\worktrees\cranky-easley-606ae0\docs\archive\concept-explorations\2026-04\Evo Tactics Pitch Deck [SUPERSEDED].html` — pitch v1 con clan
- `C:\Users\edusc\Desktop\gioco\Game\.claude\worktrees\cranky-easley-606ae0\docs\archive\concept-explorations\2026-04\Evo Tactics Pitch Deck v2.html` — pitch v2 superseded clan
- `C:\Users\edusc\Desktop\gioco\Game\.claude\worktrees\cranky-easley-606ae0\docs\core\51-ONBOARDING-60S.md` — onboarding canonical attuale (3-trait, no clan)
- `C:\Users\edusc\Desktop\gioco\Game\.claude\worktrees\cranky-easley-606ae0\docs\planning\2026-04-26-coop-mvp-spec.md` — char_creation con MBTI Forms
- `C:\Users\edusc\Desktop\gioco\Game\.claude\worktrees\cranky-easley-606ae0\data\core\jobs.yaml` — job runtime canonical
- `C:\Users\edusc\Desktop\gioco\Game\.claude\worktrees\cranky-easley-606ae0\data\core\jobs_expansion.yaml` — 4 expansion jobs
- `C:\Users\edusc\Desktop\gioco\Game\.claude\worktrees\cranky-easley-606ae0\apps\backend\services\jobsLoader.js` — runtime loader
- `C:\Users\edusc\Desktop\gioco\Game\.claude\worktrees\cranky-easley-606ae0\data\external\chatgpt\2025-10-22\snapshot-20251022T180000Z.json` — "clan sabbiosi" Nido
- `C:\Users\edusc\Desktop\gioco\Game\.claude\worktrees\cranky-easley-606ae0\docs\frontend\feature-updates.md` — clan progressione narrativa
- `C:\Users\edusc\Desktop\gioco\Game\.claude\worktrees\cranky-easley-606ae0\docs\museum\cards\mating_nido-canvas-nido-itinerante.md` — museum card Nido itinerante
