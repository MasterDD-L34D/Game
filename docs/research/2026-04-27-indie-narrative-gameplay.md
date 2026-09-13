---
title: 'Indie Narrative-Gameplay — 5 pattern narrativi estraibili per Evo-Tactics'
date: 2026-04-27
doc_status: active
doc_owner: narrative-design-illuminator
workstream: cross-cutting
last_verified: '2026-04-27'
source_of_truth: false
language: it
review_cycle_days: 90
tags:
  [
    research,
    indie,
    narrative,
    gameplay,
    citizen-sleeper,
    slay-the-princess,
    pentiment,
    inscryption,
    1000xresist,
    verification_needed,
  ]
related:
  - docs/research/2026-04-26-cross-game-extraction-MASTER.md
  - docs/research/2026-04-26-tier-s-extraction-matrix.md
  - docs/research/2026-04-26-tier-b-extraction-matrix.md
  - docs/research/2026-04-26-spore-deep-extraction.md
  - docs/adr/ADR-2026-04-26-spore-part-pack-slots.md
---

# Indie Narrative-Gameplay — 5 pattern narrativi estraibili per Evo-Tactics

> **Scopo**: 5 pattern narrativi da giochi indie recenti che toccano il gameplay — non pura narrativa, ma il punto di contatto tra racconto e meccanica. Per ogni gioco: pattern narrative + tactical lesson + cross-ref con sistemi Evo-Tactics gia esistenti (Thought Cabinet, ink engine, vcScoring).
>
> **Modalita**: INFJ audit. Player experience first. "Il player sente X perche Y" — ogni pattern valutato attraverso l'effetto emozionale, non solo tecnico.
>
> **Stack narrativo esistente**: `services/narrative/narrativeEngine.js` + `narrativeRoutes.js` (inkjs), `onboardingPanel.js` (Thought Cabinet V1), `tutorialScenario.js` briefing_pre/post hardcoded, `vcScoring.js` (20+ raw metrics). Audit mode: questi sistemi sono il terreno su cui aggiungere i pattern.

---

## Indice

1. [Citizen Sleeper — drift NSC reactivity](#1-citizen-sleeper--drift-nsc-reactivity)
2. [Slay the Princess — branching con conseguenze mantenute](#2-slay-the-princess--branching-con-conseguenze-mantenute)
3. [Pentiment — party-as-narrator confessionals](#3-pentiment--party-as-narrator-confessionals)
4. [Inscryption — camera reveal come narrative beat](#4-inscryption--camera-reveal-come-narrative-beat)
5. [1000xRESIST — memory layered POV](#5-1000xresist--memory-layered-pov)
6. [Quality checklist narrativa applicata](#6-quality-checklist-narrativa-applicata)
7. [Recommendation stack per Evo-Tactics](#7-recommendation-stack-per-evo-tactics)

---

## 1. Citizen Sleeper — drift NSC reactivity

**Pattern**: **Salience-based NPC memory**. I personaggi secondari di Citizen Sleeper reagiscono a cio che il player ha fatto nelle sessioni precedenti, ma non in modo binario (flag si/no). Reagiscono al **drift** — la direzione della scelta, non la scelta singola.

**Tactical lesson**: la reattivita non richiede di tracciare ogni decisione. Traccia la **direzione** (piu aggressivo? piu cauto? piu sociale?). In Evo-Tactics: le VC axes sono gia drift trackers — T_F 0-1 e una direzione cumulativa, non un flag.

### Come applicare a Evo-Tactics

Il pattern di Citizen Sleeper tradotto al nostro stack:

- `vcScoring.js` gia calcola `mbti_T`, `mbti_F`, `ennea_1`..`ennea_9` come aggregate di sessione.
- La **reattivita** manca nel briefing: `tutorialScenario.js` ha `briefing_pre`/`briefing_post` hardcoded, non condizionali su VC.
- **Fix minimo** (~3h): `narrativeRoutes.js` serve briefing via ink knot. Aggiungere condizionale su `session.vcSnapshot.mbti_T` → se T > 0.65, briefing variante tecnica; se F > 0.65, briefing variante empatica. Due varianti per 7 scenari = 14 ink stitches.

**Esempio concreto** (ink):

```ink
=== briefing_tutorial_01 ===
{vcSnapshot.mbti_T > 0.65:
  Obiettivo primario: eliminazione. Efficienza massima. Il Sistema non perdona inefficienze.
- vcSnapshot.mbti_F > 0.65:
  Il team conta su di voi. Ogni membro e irripetibile. Il Sistema non si preoccupa — noi si.
- else:
  Obiettivo: sopravvivere. Il Sistema non si ferma. Neanche noi.
}
```

**Player sente**: "il gioco mi conosce". Effetto Citizen Sleeper: la sensazione che il personaggio ricordi chi sei.

**Cross-ref narrativo**: pattern P0 "Quality-Based Narrative" dal knowledge base agent (VC axes come qualities, briefing gating su threshold). Esattamente questo.

**Anti-pattern**: NON creare piu di 3 varianti per knot (combinatorial explosion). Usa `{T > 0.65 : A - F > 0.65 : B - else: C}` — tre path, gather comune.

---

## 2. Slay the Princess — branching con conseguenze mantenute

**Studio**: Black Tabby Games (2023). **Pattern**: **Narrative state memory cross-chapter**.

Slay the Princess ha decine di versioni della Principessa basate sulle scelte del player nei capitoli precedenti. Ogni scelta non e binaria — e additive: il player che ha esitato ripetutamente vede una Principessa diversa da chi e stato risoluto. Il gioco non "ricorda" flag singoli — ricorda **il profilo comportamentale**.

**Tactical lesson**: non serve un branching tree esplicito. Serve un profilo aggregato. In Evo-Tactics: `vcScoring.js` GIA produce un profilo aggregato (MBTI type + ennea type derivato da 20+ raw metrics). Il profilo e disponibile ma non usato narrativamente.

[design pattern reference: behavior-profile-as-narrative-state; verify against Black Tabby Games dev notes / Rock Paper Shotgun 2023]

### Come applicare a Evo-Tactics

**Debrief reaktivo**. Attualmente il debrief e statico (`briefing_post` hardcoded). Con il profilo vcScoring:

- Post-sessione, `narrativeRoutes.js` riceve `vcSnapshot` + `session_outcome`.
- Seleziona un debrief knot basato su `mbti_type` derivato + `outcome` (win/lose/timeout).
- 16 MBTI types × 3 outcome = 48 knot — troppi. Semplifica: 4 gruppi (NT/NF/ST/SF) × 3 outcome = 12 knot. Budget realistico.

**Ink structure**:

```ink
=== debrief ===
{mbti_group == "NT":
  -> debrief_NT
- mbti_group == "NF":
  -> debrief_NF
- mbti_group == "ST":
  -> debrief_ST
- else:
  -> debrief_SF
}

=== debrief_NT ===
{outcome == "win":
  Analisi completa. Le variabili erano sotto controllo. Il Sistema sottovalutava.
- outcome == "lose":
  Ipotesi falsificata. Ricalibra il modello.
- else:
  Il tempo era la variabile non considerata.
}
-> END
```

**Effort**: ~8h (12 knot + routing logic in narrativeRoutes + vcSnapshot pipe al narrative endpoint).

**Player sente**: "il gioco sa come ho giocato, non solo se ho vinto". Effetto Slay the Princess: la sensazione che la storia ricordi il tuo profilo, non solo le tue azioni.

**Anti-pattern**: NON fare debrief piu lungo di 3-5 frasi. Slay the Princess ha capitoli lunghi — Evo-Tactics ha un debrief che compete con il rientro al menu. Brevita e essenziale.

---

## 3. Pentiment — party-as-narrator confessionals

**Studio**: Obsidian (2022). **Pattern**: **Personaggio come voce narrativa**.

In Pentiment, il protagonista Andreas e un illustratore. La sua professione colora la percezione di tutto: descrive le persone come soggetti di un ritratto, usa metafore pittoriche, interpreta eventi attraverso la lente della sua arte. Il personaggio non e solo un avatar — e un filtro narrativo.

**Tactical lesson**: il job del player character dovrebbe colorare **come** il gioco comunica con lui, non solo cosa puo fare.

[design pattern reference: character-as-narrative-lens; reference Obsidian / Josh Sawyer Pentiment design notes]

### Come applicare a Evo-Tactics

**Job voice nei briefing**. Il sistema di briefing ink gia esiste. Aggiungere varianti per job primary selezionato al /start.

Esempio per 3 job (scalabile a 7):

- **Vanguard**: briefing in imperativo diretto. "Tieni la linea. Primo in. Ultimo fuori."
- **Sniper**: briefing con distanza analitica. "Settore coperto. Target confermato a 8 hex."
- **Support**: briefing collaborativo. "Hanno bisogno di noi. Restiamo vicini."

Non e solo tono — il **contenuto dell'informazione** puo variare:

- Vanguard riceve briefing su enemy frontline composition.
- Sniper riceve briefing su enemy positioning + range.
- Support riceve briefing su ally HP pool + expected damage.

**Effort**: ~6h (7 job tone variants per 5 scenario briefing = 35 ink stitches + job param nel narrative endpoint).

**Nota**: cross-ref con Pentiment typography-as-faction in `2026-04-27-indie-concept-rubabili.md` — stessa fonte, applicazione diversa (qui voce narrativa, li visual code).

**Player sente**: "questo briefing parla a me, non a un soldato generico". Effetto Pentiment: il job come lente che colora l'esperienza.

**Anti-pattern**: NON rendere il job voice troppo estremo (militaresco/poetico) — mantieni leggibilita tattica. Il tono cambia, l'informazione critica rimane uguale.

---

## 4. Inscryption — camera reveal come narrative beat

**Studio**: Daniel Mullins (2021). **Pattern**: **Diegetic break come emotional climax**.

Il momento piu potente di Inscryption e quando la "camera" si sposta — il player capisce di aver guardato solo parte della realta. Questo reveal non e cinematico (non c'e cutscene) — avviene attraverso una meccanica: il player trova un oggetto che non dovrebbe esistere nel frame del gioco.

**Tactical lesson**: i reveal piu potenti sono **meccanici**, non narrativi. Il player "trova" la verita attraverso un'azione, non attraverso un dialogo.

[design pattern reference: mechanic-as-reveal; verify against Daniel Mullins GDC notes / Waypoint interview 2021]

### Come applicare a Evo-Tactics

**La campagna rivela il Sistema progressivamente attraverso dati, non dialogo**.

Pattern concreto per Evo-Tactics:

1. Il player completa 3 missioni consecutive contro lo stesso archetipo nemico.
2. `objectiveEvaluator.js` ha tracciato i pattern AI (gia live ma non esposto).
3. In un briefing speciale (inkjs knot triggered da `consecutiveSameArch >= 3`), il Sistema "mostra" i propri dati: "Il Sistema ha adattato. Distribuzione intents: Aggressive 78%, Defensive 12%."
4. Questa informazione e reale — e estratta dal runtime, non fabricata. Il player "vede" il Sistema pensare.

**Implementazione**:

- `narrativeRoutes.js` riceve `aiIntentDistribution` dall'ultima sessione (endpoint `/round/execute` gia emette intent data — TKT-09 dal backlog: "ai_intent_distribution non emessa").
- Briefing ink riceve `aiIntentDistribution` come variabile.
- Knot `sistema_reveal` triggered dopo soglia consecutiva.

**Effort**: ~6h (resolve TKT-09 intent emit + narrative pipe + 1 ink knot reveal).

**Player sente**: "il Sistema non e un set di regole — e un'entita che pensa e adatta". Effetto Inscryption: la scoperta e meccanica, il player non e spettatore.

**Anti-pattern**: NON usare "glitch visivo" o effetti rotti artificialmente. Evo-Tactics non ha budget art per quello e rischia di sembrare un bug reale. Il reveal avviene attraverso informazione, non estetica.

---

## 5. 1000xRESIST — memory layered POV

**Studio**: Fellow Traveller / sunset visitor (2024). **Pattern**: **Memoria stratificata come gameplay**.

1000xRESIST usa una struttura in cui il player rivive ricordi con nuova consapevolezza: la prima volta vedi un evento, la seconda volta sai cosa e successo dopo. Questa dissonanza temporale crea **dramatic irony diegetica** — il player sa qualcosa che il personaggio non sa ancora.

Il pattern crea empathy attraverso la prospettiva temporale, non attraverso dialogo.

[design pattern reference: layered-memory-dramatic-irony; reference sunset visitor dev notes / 2024 release coverage; verification_needed: true — design detail da verificare contro fonte primaria]

### Come applicare a Evo-Tactics

**Campaign arc con memoria tattica**. Evo-Tactics ha campaign sessions sequenziali. La memoria di pattern precedenti e disponibile in `campaign advance` response.

Pattern concreto:

- La prima missione in un biome ha briefing che non menziona rischi specifici.
- Dopo aver perso una missione in quel biome (o subito un KO), il **briefing successivo** nello stesso biome cambia: cita esplicitamente cosa e successo.
- "La volta scorsa il Sistema ha usato l'area di copertura sul fianco destro. Tienilo in mente."
- Questa informazione e reale — derivata da `session_outcome` + `pressure_peak_position` (gia tracciato).

**Non e una "storia" — e il gioco che ricorda per il player**. Il layer temporale e quello della campagna: ogni sessione e un ricordo che informa la prossima.

**Effort**: ~5h (campaign state store `previousBiomeLoss` + narrative endpoint riceve e condizionale ink knot).

**Prerequisiti**: campaign advance endpoint live, session outcome tracking live, narrativeRoutes live.

**Player sente**: "il gioco ricorda cosa mi ha fatto male". Effetto 1000xRESIST: la memoria come layer strategico. Drammatica ironia tattica: il Sistema non ricorda le proprie sconfitte — il player si.

**Anti-pattern**: NON generare memoria per ogni event (information overload). Solo eventi significativi: KO di un personaggio, loss di una missione, pressure peak >80. Max 1 memoria richiamata per briefing.

---

## 6. Quality checklist narrativa applicata

| Check                                   | Stato attuale Evo-Tactics | Fix via pattern                     |
| --------------------------------------- | :-----------------------: | ----------------------------------- |
| Player agency preservata                |             ✓             | Branching ink gia live              |
| State reactive (cita scelte precedenti) |             ✗             | Citizen Sleeper drift briefing      |
| Failure come path valido                |             ✗             | Slay the Princess debrief loss knot |
| Pacing (non interrompe combat)          |             ✓             | Briefing pre-scenario OK            |
| Voice/tone coerente                     |             ✗             | Pentiment job voice                 |
| Accessibility (skip disponibile)        |             ✗             | Ink runner deve supportare skip     |

**Priorita fix**: State reactive (3h) → Failure path (8h) → Job voice (6h) → Skip (2h). Total: ~19h per checklist verde.

---

## 7. Recommendation stack per Evo-Tactics

### P0 (impatto alto, prerequisiti soddisfatti)

1. **Citizen Sleeper drift briefing** (~3h): vcScoring → ink conditional. Zero nuovi prerequisiti. Quick win definitivo P4.
2. **Slay the Princess debrief reaktivo** (~8h): 12 knot MBTI group × outcome. Chiude gap "failure = dead end" narrativo.

### P1 (impatto alto, piccolo prerequisito)

3. **Inscryption reveal** (~6h + TKT-09): richiede resolve TKT-09 (ai_intent emit). Alta narrativa impact P5.
4. **Pentiment job voice** (~6h): 35 ink stitches. Chiude P3 identita job.

### P2 (buono, piu setup)

5. **1000xRESIST campaign memory** (~5h): richiede campaign state store per biome loss. Chiude P4 continuita narrativa.

### Cross-ref Thought Cabinet

Il Thought Cabinet V1 (`onboardingPanel.js`) e il container naturale per le "memorie tattiche" di 1000xRESIST e le "conoscenze" di Tunic. Prima di espandere il Thought Cabinet, verifica stato runtime: il cabinet e solo visual (onboarding) o ha un store persistente? Se solo visual → store da aggiungere (~3h) come prerequisito comune a piu pattern.

_Cross-ref: `services/narrative/narrativeEngine.js` + `narrativeRoutes.js` + `data/core/narrative/` (se esistono file .ink) — leggere prima di implementare._

---

_Doc generato da narrative-design-illuminator in INFJ audit mode. Sezioni con `[design pattern reference]` richiedono verifica contro fonte primaria. Sezioni con `verification_needed: true` in frontmatter tags sono flaggate per review._
