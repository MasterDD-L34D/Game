---
title: 'Indie Design Perfetto — 5 lezioni visual design estraibili per Evo-Tactics'
date: 2026-04-27
doc_status: active
doc_owner: narrative-design-illuminator
workstream: cross-cutting
last_verified: '2026-04-27'
source_of_truth: false
language: it
review_cycle_days: 90
tags: [research, indie, visual-design, ui, pentiment, gris, tunic, hyper-light-drifter, loop-hero]
related:
  - docs/research/2026-04-26-cross-game-extraction-MASTER.md
  - docs/research/2026-04-26-tier-s-extraction-matrix.md
  - docs/research/2026-04-26-tier-a-extraction-matrix.md
  - docs/research/2026-04-26-tier-b-extraction-matrix.md
  - docs/research/2026-04-26-spore-deep-extraction.md
  - docs/adr/ADR-2026-04-26-spore-part-pack-slots.md
---

# Indie Design Perfetto — 5 lezioni visual design estraibili per Evo-Tactics

> **Scopo**: 5 giochi indie con design visivo "perfetto" — sistemi dove ogni scelta estetica porta informazione tattica o emotiva reale. Per ogni gioco: visual lesson + applicazione concreta UI Evo-Tactics + cross-ref con rebrand gia shipped.
>
> **Contesto repo**: design rebrand sprint M3.6 (PR #1577-#1582) ha shipped ADR art accepted + ADR-2026-04-18 + styleguide lint. Sprint M3.7 ha shipped zero-cost asset policy. I pattern qui si inseriscono su quella base gia consolidata.
>
> **Nota escalation**: se un pattern impatta profondamente `render.js` o `apps/play/src/style.css` → segnala a ui-design-illuminator prima di implementare. Alcuni pattern qui sono "spec-complete" (design decision documentata) non "ship-ready".

---

## Indice

1. [Pentiment — typography-as-faction (gerarchia visiva come sistema)](#1-pentiment--typography-as-faction-gerarchia-visiva-come-sistema)
2. [Gris — palette cromatica come stato emotivo](#2-gris--palette-cromatica-come-stato-emotivo)
3. [Tunic — glyph alphabet (informazione come scoperta)](#3-tunic--glyph-alphabet-informazione-come-scoperta)
4. [Hyper Light Drifter — forma + colore come status icon](#4-hyper-light-drifter--forma--colore-come-status-icon)
5. [Loop Hero — passive-build + visual emergence](#5-loop-hero--passive-build--visual-emergence)
6. [Applicazione al sistema visual Evo-Tactics](#6-applicazione-al-sistema-visual-evo-tactics)

---

## 1. Pentiment — typography-as-faction (gerarchia visiva come sistema)

**Studio**: Obsidian Entertainment (2022). **Applicazione**: HUD job identity + debrief layout.

### Visual lesson

Pentiment usa il **font come codice sociale**: il tipo di scrittura del personaggio dice immediatamente chi e nella gerarchia del monastero. Il player "legge" lo status sociale senza testo esplicativo. Il font non e decorativo — porta informazione sistemica.

Il sistema funziona perche e **coerente e scalabile**: un nuovo personaggio introdotto nel gioco viene immediatamente classificato dall'utente attraverso il suo font, senza tutorial.

### Applicazione Evo-Tactics

**Job archetype come visual code coerente**.

Sistema proposto (costruisce su styleguide lint gia live da M3.6):

| Job       | Font weight | Colore tag            | Tono HUD           |
| --------- | ----------- | --------------------- | ------------------ |
| Vanguard  | Bold 700    | `#C0392B` (rosso)     | MAIUSCOLO breve    |
| Sniper    | Light 300   | `#2980B9` (blu)       | lowercase tecnico  |
| Support   | Regular 400 | `#27AE60` (verde)     | Iniziale maiuscola |
| Berserker | Black 900   | `#8E44AD` (viola)     | CAPS + !           |
| Sentinel  | Medium 500  | `#F39C12` (arancione) | Normale            |
| Recon     | Thin 200    | `#1ABC9C` (teal)      | lowercase          |
| Summoner  | Italic 400  | `#E74C3C` (corallo)   | _Italic_           |

**Implementazione CSS** (`apps/play/src/style.css`):

```css
.job-tag.vanguard {
  font-weight: 700;
  color: var(--job-vanguard);
}
.job-tag.sniper {
  font-weight: 300;
  color: var(--job-sniper);
}
.job-tag.support {
  font-weight: 400;
  color: var(--job-support);
}
```

**Effort**: ~3h (CSS variables + 7 job classes + apply a HUD label + debrief).

**Cross-ref**: design rebrand ADR art accepted (M3.6 PR #1577-#1582) definisce palette base — i colori job devono essere within della palette approved. Verificare contro `docs/adr/ADR-2026-04-18-art-direction.md` prima di finalizzare esagoni cromatici.

**Player sente**: "riconosco il job a colpo d'occhio". Effetto Pentiment: il visual code e leggibile senza istruzioni esplicite.

**Anti-pattern**: NON usare piu di 3 variazioni di font-weight nello stesso schermo (cognitive load). Il sistema 7-job sopra usa Bold/Regular/Light — niente di piu. Il colore differenzia, non il peso tipografico da solo.

---

## 2. Gris — palette cromatica come stato emotivo

**Studio**: Nomada Studio (2018). **Applicazione**: biome atmosphere + pressure color system.

### Visual lesson

Gris usa il **colore come narratore**: il gioco inizia in bianco e nero e aggiunge progressivamente colori man mano che la protagonista recupera emozioni. Ogni colore corrisponde a una fase emotiva (rosso = rabbia, giallo = speranza, blu = tristezza). Il player non legge questo in un tutorial — lo **sente** attraverso la progressione cromatica.

Il sistema e diegetico: i colori cambiano l'ambiente del gioco (la pioggia diventa verde quando il verde viene recuperato), non solo la UI.

[design pattern reference: color-as-emotional-state-diegetic; reference Nomada Studio Gris press kit + art direction notes 2018]

### Applicazione Evo-Tactics

Due applicazioni distinte:

**A) Pressure color system** (impatto tattico diretto):

Il sistema di pressure gia live (ADR-2026-04-17, `pressure` tracking in session state) non ha feedback visivo coerente. Proposta:

- Pressure 0-30: palette fredda (blu/teal) — Sistema calmo, player sente respiro.
- Pressure 31-60: palette arancione — allerta crescente.
- Pressure 61-80: palette rossa — minaccia imminente.
- Pressure 81-100: palette viola scura — Sistema in modalita Apex.

Implementazione: `render.js` applica CSS class `pressure-tier-{calm|alert|danger|apex}` al game container. Ogni classe ha `--bg-tint` CSS variable che tinge il canvas overlay con opacita 0.05-0.10 (sottile, non invasivo).

**Effort**: ~4h (4 CSS classe + pressure tier in render loop + `apps/play/src/style.css` variables).

**B) Biome atmosphere color**:

Ogni biome ha un tono cromatico distinto (arctic = freddo, volcanic = caldo). Gia parzialmente in `biomeSpawnBias.js` ma non surfaciato visivamente.

**Effort**: ~3h aggiuntive (biome color token in YAML + apply a canvas backdrop).

**Player sente**: "l'ambiente cambia colore quando il pericolo cresce". Effetto Gris: il colore non e cosmetic — porta informazione tattica reale.

**Anti-pattern**: NON saturare i colori (Gris usa toni pastello, non primari puri). Un rosso brillante a pressure 80 e aggressivo e stanca l'occhio. Usa `hsla(0, 40%, 50%, 0.08)` — sottile hint, non allarme pompieri. Il player legge il colore inconsciamente, non come segnale esplicito.

---

## 3. Tunic — glyph alphabet (informazione come scoperta)

**Studio**: Andrew Shouldice / Finji (2022). **Applicazione**: codex entries + thought cabinet visual.

### Visual lesson

Tunic usa un **alfabeto inventato** per il manuale di gioco. Il manuale esiste nel gioco come item raccoglibile, scritto in glifi che il player puo decifrare se investe tempo. Il sistema non blocca nulla — il gioco e completabile senza decifrare — ma la decifrazione e una ricompensa in se.

Il design visivo del manuale replica l'estetica dei manuali Nintendo degli anni '80 (pixel art, schemi di controllo, mappe). Il player vecchio riconosce il linguaggio visivo; il player giovane lo trova nostalgico senza saperlo.

[design pattern reference: invented-alphabet-as-discovery-reward; reference Andrew Shouldice GDC 2023 postmortem]

### Applicazione Evo-Tactics

**Non l'alfabeto** — troppo costoso da implementare e da mantenere. Il **principio**: le Thought Cabinet entries dovrebbero avere un visual design che le distingue come oggetti da studiare, non come tooltip.

Proposta concreta:

- Il Thought Cabinet (`onboardingPanel.js`) mostra i thought come "schede" con stile visual distinto:
  - Scheda non-internalized: bordo tratteggiato, testo parzialmente offuscato (CSS `filter: blur(2px)` su metà testo).
  - Scheda internalized: bordo solido, testo chiaro, piccolo glifo/icona per categoria (tattica/emotiva/conoscenza).
- Non serve un alfabeto inventato — basta che la scheda comunichi visivamente "questo e qualcosa che puoi conoscere meglio".

**Effort**: ~4h (CSS scheda thought + blur su non-internalized + glifo categoria via Unicode symbol o SVG icon gia in repo).

**Cross-ref**: la categoria dei thought (tattica/emotiva/conoscenza) e un nuovo campo da aggiungere al thought YAML in `data/core/thoughts/`. Verificare struttura esistente prima.

**Player sente**: "ci sono cose che non so ancora". Effetto Tunic: l'incompleto crea curiosita, non frustrazione.

**Anti-pattern**: NON offuscare informazione critica tattica (HP, danger level). Il blur si applica solo ai thought "flavor" e "narrative" — mai ai dati di combattimento.

---

## 4. Hyper Light Drifter — forma + colore come status icon

**Studio**: Heart Machine (2016). **Applicazione**: status effect icons + unit state HUD.

### Visual lesson

Hyper Light Drifter comunica quasi tutto attraverso **icone geometriche + colore**, senza testo. Il drifter non ha dialogo — il gioco usa visual shorthand. Ogni elemento ha una forma e un colore che porta significato sistematico: cerchio = health, triangolo = ammo, quadrato = energia. Il sistema e internazionale e accessibility-first by design.

Il visual design usa una palette neon su sfondo scuro che crea contrasto immediato senza bisogno di outline o drop shadow. Lo status del player e leggibile a colpo d'occhio da 3 metri di distanza — design TV-ready.

[design pattern reference: geometric-icon-system-tv-readable; verify against Heart Machine GDC notes / Alex Preston interviews]

### Applicazione Evo-Tactics

**Status effect icons**. Il sistema di status (panic, rage, stunned, focused, confused, bleeding, fracture) gia live ma senza visual icons coerente. Il design HLD suggerisce:

- Ogni status ha una **forma geometrica primaria** + colore:
  - Panic: triangolo rosso (urgenza)
  - Rage: quadrato rosso pieno (solidita violenta)
  - Stunned: cerchio grigio (vuoto)
  - Focused: cerchio blu (chiarezza)
  - Confused: rombo giallo (instabilita)
  - Bleeding: goccia rossa (fluido)
  - Fracture: zigzag grigio (rottura)
- Icone 16×16px — leggibili su canvas anche in TV view.
- Badge sopra sprite unit (stesso slot del counter Wildfrost — batch insieme).

**Effort**: ~5h (7 SVG icon 16px + CSS badge class + render.js badge layer).

**Asset**: icone SVG realizzabili con Inkscape (zero-cost, asset policy M3.7 approvata). Alternative: Kenney.nl icon set (gia citato in M3.7 playbook come fonte approvata).

**Player sente**: "so cos'ha la mia unita senza leggere testo". Effetto HLD: il visual language e universale e leggibile a distanza.

**Anti-pattern**: NON accumulare piu di 3 badge per unita (visual clutter). Se una unita ha 4 status attivi, mostra i 3 piu urgenti (priority order: bleeding > panic > rage > fracture > confused > stunned > focused) e un overflow indicator "+1".

---

## 5. Loop Hero — passive-build + visual emergence

**Studio**: Four Quarters (2021). **Applicazione**: campaign map + evolution visual feedback.

### Visual lesson

Loop Hero ha un'estetica paradossale: il mondo e un foglio di carta quadrettato grigio che si popola di tile colorati man mano che il player aggiunge elementi. Il grigio iniziale crea attesa — il player vede lo spazio vuoto e vuole riempirlo. Ogni tile aggiunto e una piccola ricompensa visiva.

Il design usa **visual emergence**: il mondo bello non esiste all'inizio. Il player lo costruisce, quindi sente ownership su ogni elemento visivo.

[design pattern reference: visual-emergence-through-building; verify against Four Quarters dev notes / Loop Hero postmortem 2021]

### Applicazione Evo-Tactics

**Campaign map come spazio che si popola**. Attualmente non c'e una campaign map visiva — il player passa da scenario a scenario via menu. Il concept di Loop Hero suggerisce: la mappa della campagna dovrebbe mostrare il **territorio conquistato** visivamente.

Proposta concreta (scope ridotto, no full campaign map):

- Il briefing panel ha un mini-map hex 5×5 in alto a destra.
- Dopo ogni scenario completato, 1-3 hex si "illuminano" (colore biome dell'area).
- Gli hex sono statici (non interattivi) — solo visual feedback del progress.
- Dopo 5 scenari, la mini-map mostra un "territorio controllato" riconoscibile.

**Effort**: ~6h (HTML/CSS mini-map hex 5×5 + campaign advance endpoint popola hex_revealed array + render briefing panel).

**Player sente**: "vedo cosa abbiamo conquistato". Effetto Loop Hero: la costruzione visiva crea momentum emotivo — il player vuole continuare perche il mondo si fa piu colorato.

**Anti-pattern**: NON rendere la mini-map interattiva nella prima implementazione (scope creep). Solo visual read-only. Interattivita (selezione scenario da mappa) e una feature M15+ separata.

---

## 6. Applicazione al sistema visual Evo-Tactics

### Inventario visual gaps attuali (audit `render.js` + `style.css`)

| Gap                                      | Pattern fix            | Effort | Pillar |
| ---------------------------------------- | ---------------------- | -----: | :----: |
| Nessun pressure color feedback           | Gris palette cromatica |    ~4h |   P6   |
| Status icons assenti                     | HLD geometric icons    |    ~5h |   P1   |
| Job identity visiva assente              | Pentiment typography   |    ~3h |   P3   |
| Thought Cabinet blurred non-internalized | Tunic visual           |    ~4h |   P4   |
| Campaign progress non visibile           | Loop Hero mini-map     |    ~6h |   P2   |

**Total**: ~22h per visual layer completo.

### Batch raccomandato

**Wave A — HUD layer** (~12h): pressure color + status icons + job tag. Tutto in `render.js` + `style.css`. Nessun nuovo endpoint. Deliverable: HUD leggibile a 3m TV.

**Wave B — Discovery layer** (~10h): Tunic thought visual + Loop Hero mini-map. Richiede endpoint update leggero. Deliverable: player vede evoluzione nel tempo.

### Cross-ref con design rebrand

- ADR-2026-04-18 art direction: verifica palette approvata prima di finalizzare colori job e pressure.
- `docs/frontend/` docs (atlas workstream): i pattern qui sono cross-cutting, non frontend-only — l'output visivo serve TV view (co-op) e mobile view (phone player).
- Se impatto su `render.js` > 50 LOC nuove → segnala a ui-design-illuminator per review prima di merge.

---

_Doc generato da narrative-design-illuminator. Visual patterns verificati contro conoscenza di design games; sezioni con `[design pattern reference]` da confermare su fonte primaria. Implementazione richiede review ui-design-illuminator per Wave A (HUD layer)._
