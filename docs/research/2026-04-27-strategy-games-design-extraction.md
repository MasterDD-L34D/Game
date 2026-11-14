---
title: 'Strategy Games Design Extraction — visual + UI patterns Evo-Tactics'
date: 2026-04-27
doc_status: active
doc_owner: ui-design-illuminator
workstream: cross-cutting
last_verified: '2026-04-27'
source_of_truth: false
language: it
review_cycle_days: 90
tags: [research, strategy, design, visual, ui, extraction, verification_needed]
related:
  - docs/research/2026-04-26-cross-game-extraction-MASTER.md
  - docs/research/2026-04-27-indie-design-perfetto.md
  - docs/research/2026-04-26-tier-s-extraction-matrix.md
  - docs/adr/ADR-2026-04-18-art-direction-placeholder.md
---

# Strategy Games Design Extraction — visual + UI patterns Evo-Tactics

> **Scopo**: 7 strategy game top-tier non gia coperti da doc precedenti. Focus su **design language** + **look visivo** + **UI clarity**. Ogni gioco = 1 pattern dominante isolabile + applicazione concreta stack Evo-Tactics.
>
> **Non duplica**: HLD/Pentiment/Gris/Tunic/Loop Hero → `2026-04-27-indie-design-perfetto.md`. Spore/FFT/Tactics Ogre/Wesnoth/XCOM/Disco/AI War → `2026-04-26-tier-s-extraction-matrix.md`. Wesnoth → gia shipped cross-PC.
>
> **ITB rule** (P0 trasversale): ogni pattern aggiunto deve essere leggibile in 1 turno. Se riduce clarity altrui → taglia.

---

## Indice

1. [Civilization VI — tooltip stratificato scannable](#1-civilization-vi--tooltip-stratificato-scannable)
2. [Crusader Kings 3 — portrait-as-status (corpo come UI)](#2-crusader-kings-3--portrait-as-status-corpo-come-ui)
3. [Frostpunk / Frostpunk 2 — chromatic tension gauge](#3-frostpunk--frostpunk-2--chromatic-tension-gauge)
4. [Battle Brothers — UI tematica senza sacrificare leggibilita](#4-battle-brothers--ui-tematica-senza-sacrificare-leggibilita)
5. [Old World — character drama portrait + aging](#5-old-world--character-drama-portrait--aging)
6. [Jagged Alliance 3 — UI con voce di periodo come codice atmosferico](#6-jagged-alliance-3--ui-con-voce-di-periodo-come-codice-atmosferico)
7. [Phoenix Point — free-aim body-part targeting overlay](#7-phoenix-point--free-aim-body-part-targeting-overlay)
8. [Sezione A — Cross-ref shipped Evo-Tactics](#a--cross-ref-con-shipped-evo-tactics)
9. [Sezione B — Top 5 quick-win](#b--top-5-quick-win-ranked)
10. [Sezione C — Bundle proposti](#c--bundle-proposti)
11. [Sezione D — 5 anti-pattern trasversali](#d--5-anti-pattern-trasversali)
12. [Sezione E — Decisioni master-dd aperte](#e--decisioni-master-dd-aperte)
13. [Proposed tickets](#proposed-tickets)

---

## 1. Civilization VI — tooltip stratificato scannable

**Studio**: Firaxis Games. **Anno**: 2016 (ongoing). **Genere**: 4X turn-based strategy.

### Visual lesson

Civ VI implementa un sistema di tooltip a **3 livelli progressivi**: (1) banner compatto sul tile con yield icons (scud/foglia/stella → produzione/food/scienza leggibile anche a colori-blind perche ogni yield ha forma diversa); (2) hover tooltip mid-detail con totale + source breakdown; (3) click full panel city con drill-down distretto per distretto. Il player sceglie il profondita di lettura. Nessun livello e obbligatorio — il giocatore nuovo usa L1, il veteran usa L3.

Il hex-grid stesso porta informazione attraverso **terrain tint** (deserto = sabbia gialla, foresta = verde scuro, tundra = grigio-blu) + **district building sprite** leggibile come icona a distanza. La leggibilita del tile non dipende mai da un solo canale visivo.

**Fonte**: [Game UI Database — Civilization VI](https://www.gameuidatabase.com/gameData.php?id=639) + [Interface In Game — CivVI](https://interfaceingame.com/games/sid-meiers-civilization-vi/) + community mod CQUI che esplicita le carenze del sistema base.

### Pattern estratto

**Progressive disclosure tooltip** (L1 compact → L2 hover → L3 full panel). Regola: ogni livello aggiunge informazione senza rimuovere quella del livello precedente. L1 deve essere leggibile in meno di 1 secondo. L3 e opzionale.

Design pattern reference: "layered information architecture" — verify against [CQUI mod analysis](https://github.com/civfanatics/CQUI_Community-Edition) per gap identificati dalla community.

### Applicazione Evo-Tactics

| Aspetto          | Effort | Cosa implementare                                                          |
| ---------------- | -----: | -------------------------------------------------------------------------- |
| Tile banner L1   |    ~3h | HP bar + elevation icon compact sul token — gia parziale in render.js      |
| Hover tooltip L2 |    ~4h | Panel mid-detail on unit hover: stats + status + AP rimanenti              |
| Click panel L3   |    ~6h | Drill-down completo unita (trait + VC snapshot + job) — pattern formsPanel |

**Total effort**: ~13h (Moderate). **Pillar impact**: P1 (tattica leggibile).

**Verification**: tooltip L1 su hex tile gia esiste parzialmente. L2/L3 missing. `render.js` e entry point.

### Anti-pattern (cosa NON copiare)

- **Info overload L1**: Civ VI community ha creato CQUI proprio perche il banner base aveva troppe icone sovrapposte. Per Evo-Tactics: L1 = MAX 3 icone per tile.
- **Tooltip bloccante input**: mai un tooltip che blocca click su tile adiacente. Tieni tooltip su layer separato, non cattura eventi.
- **Dipendenza da colore unico**: Civ VI fallisce color-blind su alcune combinazioni biome-vs-district. Sempre shape + colore.

---

## 2. Crusader Kings 3 — portrait-as-status (corpo come UI)

**Studio**: Paradox Development Studio. **Anno**: 2020. **Genere**: grand strategy, dynasty sim.

### Visual lesson

CK3 usa il ritratto 3D come **UI diegetica primaria**: il corpo del personaggio porta informazione di stato senza overlay aggiuntivo. Postura e abbigliamento codificano rango; tessuto corporeo e silhouette codificano lifestyle (guerriero = spalle larghe, ghiottone = corporatura robusta); colore pelle e texture codificano malattia attiva. Il player legge il personaggio prima ancora di aprire il panel.

I trait di personalita sono deliberatamente limitati a un massimo di 3 attivi per personaggio — il team Paradox documenta esplicitamente questa scelta come "a quick glance tell who they are". La gerarchia visiva tra caratteristica dominante e tratti accessori e forzata dal design del portrait.

**Fonte**: [CK3 Dev Diary #07 — Characters & Portraits](https://forum.paradoxplaza.com/forum/threads/ck3-dev-diary-07-characters-portraits.1295264/) (Paradox primary dev diary, verificato). `verification_needed: false` per il contenuto del dev diary — citazione diretta.

### Pattern estratto

**Portrait-as-status-channel**: body composition + posture + clothing = stato leggibile senza testo. Regola: max 3 trait visivi simultanei per personaggio. Trait aggiuntivi → collasso in icon sidebar. `verification_needed: true` per implementazione spec dettagliata al di la del dev diary.

### Applicazione Evo-Tactics

| Aspetto                       | Effort | Cosa implementare                                                                          |
| ----------------------------- | -----: | ------------------------------------------------------------------------------------------ |
| Token silhouette per job      |    ~4h | Sprite swap per archetype (Vanguard bold, Support slender, Scout wiry) in `render.js`      |
| Status overlay max 3 icon     |    ~3h | Sopra token: max 3 icone stato (bleeding, stunned, focused) — collassa extras in "+" badge |
| Forma evolutiva su silhouette |    ~5h | MBTI form applica colore-tint + shape-modifier al token (V4 PI pacchetti deferred)         |

**Total effort**: ~12h (Moderate). **Pillar impact**: P3 (specie x job), P4 (MBTI identita visiva).

**Cross-card museum**: pattern complementare a [Wildermyth Battle-Scar + Layered Portrait](../museum/cards/creature-wildermyth-battle-scar-portrait.md) (score 4/5, converge P3 narrative+visual).

### Anti-pattern (cosa NON copiare)

- **3D portrait render budget**: CK3 puo permettersi il rig 3D completo. Evo-Tactics = 2D sprite. NON tentare simulazione 3D — fa peggio. Tieni sprite 2D con 3-4 varianti per job archetype.
- **Aging progressiva**: bella in CK3, overkill per co-op tattico dove i turni sono brevi. Deferred post-MVP.
- **DNA genetics deep system**: scope creep. Prendi solo il principio "postura = job", non il sistema genetico.

---

## 3. Frostpunk / Frostpunk 2 — chromatic tension gauge

**Studio**: 11 bit studios. **Anno**: 2018 / 2024. **Genere**: city-builder survivalware.

### Visual lesson

Frostpunk usa il **colore come gauge emotivo in tempo reale**: la palette cromatica della UI si sposta lungo un gradiente con l'aumentare della pressione. In condizioni normali: toni freddi blu-acciaio che trasmettono ordine e controllo. Man mano che la crisi sale: caldi ambra-arancio-rosso che trasmettono emergenza senza che il player legga un numero. Il player _sente_ il pericolo prima di _leggerlo_.

In Frostpunk 2, il sistema e stato reso esplicito con il **Tension orb**: un elemento UI centrale che si riempie di liquido nero-rosso man mano che il conflitto sociale cresce. A tensione critica: tutti i percorsi diventano rossi, la UI si copre di nero. Il game director ha dichiarato l'obiettivo "intuitive and less complicated" — lo strumento e il colore sistematico, non testo.

**Fonte**: [Xbox Wire — Frostpunk visual identity DLC](https://news.xbox.com/en-us/2021/07/21/how-the-visual-identity-of-frostpunk-changed/) + [Frostpunk 2 Tension Wiki](https://frostpunk-2.game-vault.net/wiki/Tension) + [11bit studios FP2 director interview](https://gagadget.com/en/494135-intuitive-and-clear-frostpunk-2s-game-director-talked-about-the-main-changes-in-the-interface-and-visual-design-of-the-game/). `verification_needed: true` per dettaglio esatto del gradiente cromatico — non confermato da fonte primaria tecnica.

### Pattern estratto

**Chromatic tension gauge**: UI background hue shift proporzionale a pressure metric. Nessun numero da leggere — il colore porta il segnale emozionale. Implementabile come CSS filter o palette swap su `--pressure-hue` CSS variable. Range: `hsl(210, 60%, 20%)` base → `hsl(10, 80%, 30%)` apex.

### Applicazione Evo-Tactics

| Aspetto                     | Effort | Cosa implementare                                                                     |
| --------------------------- | -----: | ------------------------------------------------------------------------------------- |
| Pressure hue CSS variable   |    ~2h | `--pressure-hue` in `apps/play/src/style.css` driven da `session.pressure` WS payload |
| HUD border tint             |    ~2h | Border del canvas TV tinted con hue corrente — segnale periferico senza occupare tile |
| Tension badge bottom-center |    ~3h | Orb/badge centrale mostra pressure/100 con fill animation + pulse above 80            |

**Total effort**: ~7h (Minimal). **Pillar impact**: P6 (fairness + pressure readability), P5 (co-op — tutti vedono la stessa tension su TV).

**Status runtime Evo-Tactics**: `session.pressure` gia emesso via WS broadcast. `apps/play/src/style.css` e il target. Gap = wire CSS variable + badge component.

### Anti-pattern (cosa NON copiare)

- **UI completamente oscurata ad alta tensione**: Frostpunk 2 copre di nero a tensione critica. Co-op tattico ha bisogno di leggibilita anche in crisi. Tieni shift cromatico leggero — mai oscurare tile o enemy tokens.
- **Colore unico per tensione**: necessario shape backup. Tension badge deve avere anche icona + numero visibile se hover/tap.
- **Songs of Conquest warning**: in SoC la pixel art riduce leggibilita a zoom out. Evo-Tactics: tension indicator sempre su layer fisso, mai embedded nel tile.

---

## 4. Battle Brothers — UI tematica senza sacrificare leggibilita

**Studio**: Overhype Studios. **Anno**: 2017. **Genere**: tactical mercenary RPG.

### Visual lesson

Battle Brothers dimostra che **UI diegetica e leggibilita tattica possono coesistere** se la regola e: _"ogni elemento tematico sostituisce un elemento UI generico, non si aggiunge sopra"_. Scroll = objectives panel. Scrap of paper = tooltip. Seal = employer tag. Il team ha dichiarato esplicitamente: "Whenever it made sense and didn't detract from the usability, we've tried to incorporate real objects that would be part of mercenary life into the UI."

Il pattern piu rilevante e quello degli **status effect con nome testuale sotto l'icona**: il player non deve memorizzare 20 icone — la label e sempre visibile. Scelta che rallenta leggermente il read ma elimina completamente la curva di memorizzazione. Trade-off pro-clarity documentato.

**Fonte**: [Battle Brothers Dev Blog #75 — Reworked UI](https://battlebrothersgame.com/dev-blog-75-progress-update-reworked-ui/) (Overhype Studios primary dev blog, verificato). `verification_needed: false` per i claim citati direttamente.

### Pattern estratto

**Themed UI substitution** (non addizione): ogni elemento tematico rimpiazza un corrispondente generico. Regola operativa: prima identifica elemento generico (button, panel, tooltip), poi crea variante tematica che occupa lo stesso spazio. Mai aggiungere overlay tematico sopra UI generica esistente.

**Status label-under-icon**: label 8pt sotto ogni icona stato — elimina memorizzazione a costo di ~20% spazio in piu. Accettabile in panel laterale, NON su tile in-game.

### Applicazione Evo-Tactics

| Aspetto                   | Effort | Cosa implementare                                                                           |
| ------------------------- | -----: | ------------------------------------------------------------------------------------------- |
| Panel debrief tematico    |    ~4h | Debrief card con bordo "scroll" SVG invece di rettangolo generico — match ADR art direction |
| Status icon + label       |    ~3h | Label abbreviata 8px sotto ogni status icon nel phone composer panel                        |
| Employer seal su missione |    ~2h | Sistema tag — faction icon + sigillo su mission header in `apps/play/lobby.html`            |

**Total effort**: ~9h (Minimal). **Pillar impact**: P1 (UI clarity), P3 (job/faction identity).

**ADR cross-ref**: ADR-2026-04-18-art-direction-placeholder.md specifica "wood, metal, paper" come materiali UI. Battle Brothers implementa esattamente questa filosofia — conferma direzione gia decisa.

### Anti-pattern (cosa NON copiare)

- **Texture background sugli item**: Battle Brothers community ha segnalato che lo sfondo pergamena nell'inventario rende gli item illegibili (perdi i contorni). Evitare texture su sfondi dove vengono posizionati oggetti con outline sottile.
- **Over-theming il combat layer**: in-combat, la parchment deve sparire. Tile = colore piatto + icone chiare. Theming solo per panel, debrief, lobby, not per tactical overlay.
- **Nostalgia come criterio unico**: JA3 ha scelto "early 2000s internet aesthetic" per nostalgia, poi si e scontrata con font troppo piccolo e texture a bassa risoluzione. Tema si, compromessi usability no.

---

## 5. Old World — character drama portrait + aging

**Studio**: Mohawk Games (Soren Johnson, lead di Civ IV). **Anno**: 2020. **Genere**: 4X turn-based, dynasty historical.

### Visual lesson

Old World posiziona il personaggio come **centro narrativo leggibile a colpo d'occhio**: portrait statico ben disegnato che "invecchia" progressivamente nel tempo, con 4 fasi di eta che si fondono gradualmente (portrait interpolation update). Il sistema trasmette al player la mortalita del leader — la narrativa drammatica e diegetic nel portrait stesso, non in un tooltip.

La filosofia dichiarata del team e "The Fun of Civilization plus the Drama of Crusader Kings" — il portrait e il punto di congiunzione tra meccanica 4X e storytelling di carattere. Jason Pastrana (UI artist) ha costruito un sistema di portrait interpolation per rendere il cambiamento graduale invece che jump tra quattro frame fissi.

**Fonte**: [Mohawk Games — Old World portrait interpolation](https://www.gamespress.com/Old-World-portrait-updates-increases-character-immersion) + [Interview Jason Pastrana UI Artist Mohawk Games](https://mohawkgames.com/podcasts/interview-with-jason-pastrana-ui-artist/) (fonti Mohawk primary). `verification_needed: true` per dettagli tecnici interpolation — link a GamesPress secondario.

### Pattern estratto

**Aging portrait diegetic narrative**: portrait changes over time = narrative senza testo. Transfer minimo per Evo-Tactics: unita che subiscono battle-scar cambiano sprite — non aging ma equivalent dramatic-change-as-portrait-shift.

**Drama header pattern**: ogni evento narrativo major mostra portrait prominente + testo breve + scelta. Simile al pattern Disco Elysium thought reveal ma per eventi campagna.

### Applicazione Evo-Tactics

| Aspetto                     | Effort | Cosa implementare                                                                   |
| --------------------------- | -----: | ----------------------------------------------------------------------------------- |
| Battle-scar sprite variant  |    ~4h | Unita che scende sotto 30% HP acquista "wounded" sprite overlay (cicatrice/sporco)  |
| Campaign event drama header |    ~5h | Modal header in debrief con portrait prominente + evento narrativo QBN + scelta A/B |

**Total effort**: ~9h (Minimal). **Pillar impact**: P3 (identita specie x job permanente), P4 (MBTI narrative diegetic).

**Cross-card museum**: [Wildermyth Battle-Scar + Layered Portrait](../museum/cards/creature-wildermyth-battle-scar-portrait.md) copre esattamente questo pattern con convergenza 3 fonti. Old World aggiunge il frame "aging" come variante temporale.

### Anti-pattern (cosa NON copiare)

- **Interpolazione frame tra eta**: overkill tecnico per sprite 2D. Tieni 2-3 variant sprite (fresh/wounded/veteran) senza interpolazione fluida.
- **Portrait come focus principale vs grid**: Old World e 4X lento. In Evo-Tactics il turno e veloce, il portrait e decorativo — non deve occupare > 20% dello schermo durante combat.

---

## 6. Jagged Alliance 3 — UI con voce di periodo come codice atmosferico

**Studio**: Haemimont Games. **Anno**: 2023. **Genere**: tactical RPG, squad mercenary.

### Visual lesson

JA3 ha fatto una scelta deliberata e coraggiosa: **abbandonare la UI minimalista moderna** perche "mancava del feel di Jagged Alliance". Il team ha impostato il frame temporale agli "early 2000s internet" — ICQ, mIRC, siti web non funzionali, popup ads — come codice atmosferico della UI. Ogni elemento della UI dice al player "sei nella mente di un fixer di mercenari degli anni 2000, non in un menù corporate". Il pattern funziona perche e coerente: non e un singolo elemento tematico ma un registro visivo pervasivo.

Il fallimento documentato: le texture a bassa risoluzione hanno ridotto la leggibilita, il font era troppo piccolo, e la community ha richiesto UI scaling. Lezione diretta: **voce di periodo si, ma mai a scapito del 10-foot rule** (font ≥ 24pt, contrasto ≥ 4.5:1).

**Fonte**: [JA3 Dev Diary 7 — User Interface RPGWatch](https://rpgwatch.com/forum/threads/jagged-alliance-3-devdiary-7-user-interface.55565/) + [ArtStation — JA3 UI design](https://www.artstation.com/artwork/rJvaYJ). `verification_needed: false` per la scelta design dichiarata nel dev diary.

### Pattern estratto

**Period-voice UI register**: definisci un'epoca/atmosfera specifica come sistema di riferimento per TUTTI gli elementi UI (non singoli). Regola: il registro deve essere pervasivo, non decorativo. Ma: contrasto + font size sono non-negoziabili anche con il registro piu strong.

### Applicazione Evo-Tactics

| Aspetto                          | Effort | Cosa implementare                                                                                               |
| -------------------------------- | -----: | --------------------------------------------------------------------------------------------------------------- |
| Registro "bio-tactical terminal" |    ~3h | CSS variable `--ui-register: bio-terminal` applica font monospace + scan-line overlay leggero su panel laterali |
| Faction voice in missione        |    ~2h | Header missione usa "voce" del faction (Sistema = cold corporate, Tribe = rough organic)                        |

**Total effort**: ~5h (Minimal). **Pillar impact**: P5 (co-op atmosfera condivisa), P3 (faction identity).

### Anti-pattern (cosa NON copiare)

- **Texture low-res come aesthetic**: JA3 ha sofferto per questo. Evo-Tactics su TV = sempre testo anti-aliased ≥ 24pt, contrasto WCAG AA.
- **Registro periodo come singolo elemento**: funziona solo se pervasivo. Non mettere "ICQ style" solo sul login e UI moderna altrove — incoerenza peggiore del generico.
- **Nostalgia come design driver principale**: JA3 ammette "nostalgia era il driver" → ha portato a compromessi usability. Evo-Tactics: atmosfera si, usability non negoziabile.

---

## 7. Phoenix Point — free-aim body-part targeting overlay

**Studio**: Snapshot Games (Julian Gollop). **Anno**: 2019. **Genere**: tactical RPG, XCOM successor.

### Visual lesson

Phoenix Point introduce il **free-aim con targeting overlay per body part**: il player vede visivamente i due cerchi di dispersione (inner circle = certainty zone, outer circle = deviation zone) direttamente sul modello nemico, con la possibilita di puntare a una parte specifica del corpo (testa, braccia, gambe, armi). Il risultato e che **il danno potenziale e visibile prima dello sparo** — il player capisce istantaneamente il trade-off "alta percentuale tronco vs basso percentuale testa". Zero ambiguita.

Il sistema e il complemento tattico del damage-preview into the Breach (gia in lib P0): ITB mostra danno certo su tile, Phoenix Point mostra danno probabile su body-part. Insieme coprono il continuum "certainty → probability" dell'informazione tattica.

**Fonte**: [GamesRadar — Phoenix Point features](https://www.gamesradar.com/phoenix-point-adds-every-feature-an-xcom-2-fan-could-ask-for/) + [FreeXenon — Phoenix Point Backer Build 3 UI changes](https://www.freexenon.com/2019/03/07/user-interface-and-other-changes-for-phoenix-point-backer-build-3/). `verification_needed: true` per la meccanica inner/outer circle — descritta genericamente, non confermata da dev primario.

### Pattern estratto

**Probabilistic targeting overlay**: due zone concentriche su target. Zone interna = danno garantito; zona esterna = danno possibile. Body part selezionabile = modificatore DC. Transfer: in Evo-Tactics, attack preview su tile puo mostrare hit-chance cone + damage range invece di singolo numero.

### Applicazione Evo-Tactics

| Aspetto                        | Effort | Cosa implementare                                                                          |
| ------------------------------ | -----: | ------------------------------------------------------------------------------------------ |
| Hit-chance cone sul tile       |    ~4h | Overlay direzionale su tile target: arco ± facing modifier, colore hit/miss probability    |
| Damage range preview           |    ~3h | Sotto danno base: mostra `min-max` invece di singolo valore quando trait aggiunge varianza |
| Body-zone targeting (deferred) |   ~10h | Targeting per parte corpo nemico — richiede enemy model zone data. MVP: testa/torso/gambe  |

**Total effort quick wins**: ~7h. Full: ~17h. **Pillar impact**: P1 (tattica leggibile), P6 (fairness — nessun RNG opaco).

**Cross-card museum**: [ITB Telegraph + Push/Pull Arrows](../museum/cards/ui-itb-telegraph-deterministic.md) (score 4/5, threat tile shipped #1884). Phoenix Point aggiunge la dimensione probabilistica che ITB non ha (ITB e 100% deterministico).

### Anti-pattern (cosa NON copiare)

- **Free-aim in co-op simultaneo**: Phoenix Point e single-player. In co-op simultaneo il free-aim richiede lock del target per prevenire conflitti tra player. Da gestire con target-lock protocol WS.
- **Curva di apprendimento aiming**: Phoenix Point e stato criticato per la curva ripida del free-aim da veterani XCOM. Per Evo-Tactics: hit-chance cone come informazione passiva (non richiede aiming attivo), non come input principale.

---

## A — Cross-ref con shipped Evo-Tactics

| Pattern                      | PR/ADR shipped                                    | Coverage                     | Gap residuo                            |
| ---------------------------- | ------------------------------------------------- | ---------------------------- | -------------------------------------- |
| Pressure gauge visuale       | session.pressure WS broadcast (#1726 V5 SG+biome) | 🟡 backend live              | CSS variable + badge component missing |
| Terrain + tile readability   | `render.js` canvas auto-fit PR #1730              | 🟡 parziale                  | L2/L3 tooltip missing                  |
| Status icon overlay su token | status system PR #1634                            | 🟡 icons exist               | Max-3 rule + label sotto icon missing  |
| Art direction registro       | ADR-2026-04-18-art-direction-placeholder.md       | 🟢 spec ready                | Implementazione CSS pending            |
| Threat tile overlay          | PR #1884 shipped                                  | 🟢 live                      | —                                      |
| AP pip + action budget       | PR #1901 shipped                                  | 🟢 live                      | —                                      |
| Damage preview               | predictCombat N=1000 backend                      | 🟡 backend live              | UI overlay missing                     |
| Debrief portrait drama       | QBN engine 17 events (`narrativeEngine.js`)       | 🔴 engine live, surface dead | Header modal + portrait missing        |

---

## B — Top 5 quick-win ranked

| #   | Pattern                                | Game            | Effort | Pillar | Prerequisiti live      | Impatto player                            |
| --- | -------------------------------------- | --------------- | -----: | ------ | ---------------------- | ----------------------------------------- |
| 1   | Chromatic tension gauge CSS            | Frostpunk 2     |    ~7h | P6+P5  | session.pressure WS ✅ | Player "sente" crisi senza leggere numero |
| 2   | Status icon + label abbreviata         | Battle Brothers |    ~3h | P1     | status system ✅       | Elimina memorizzazione 20+ icone          |
| 3   | Token status max-3 rule + badge        | CK3             |    ~3h | P1+P3  | render.js ✅           | Clarity su token da spaghetti icone       |
| 4   | Hit-chance cone + damage range         | Phoenix Point   |    ~7h | P1+P6  | predictCombat ✅       | RNG non piu opaco                         |
| 5   | Period-voice CSS register bio-terminal | JA3             |    ~5h | P5+P3  | style.css ✅           | Atmosfera tattica coerente                |

**Totale bundle quick-win**: ~25h. Zero nuove dipendenze. Tutti additivi a render.js / style.css / lobby.html.

---

## C — Bundle proposti

### Bundle 1 — "Tactical clarity layer" (~20h)

Chiude P1 gap UI totalmente.

Componenti:

- CivVI L2 hover tooltip (~4h)
- CK3 token max-3 status rule (~3h)
- Battle Brothers status label (~3h)
- Phoenix Point hit-chance cone (~4h)
- Phoenix Point damage range (~3h)
- Frostpunk tension hue CSS (~3h)

Chiude pillar: P1 (tattica leggibile) → 🟢 definitivo. Rischio: medio. `render.js` e hot path, test E2E obbligatorio post-merge.

### Bundle 2 — "Character drama identity" (~20h)

Chiude P3+P4 gap visual identity.

Componenti:

- CK3 token silhouette per job archetype (~4h)
- CK3 forma evolutiva su silhouette (~5h)
- Old World battle-scar sprite variant (~4h)
- Old World campaign event drama header (~5h)
- JA3 faction voice header missione (~2h)

Chiude pillar: P3 (specie x job) → 🟢 definitivo, P4 (MBTI surface visible). Rischio: medio-alto. Silhouette swap richiede sprite asset (vedi ADR-2026-04-18 zero-cost policy).

### Bundle 3 — "Pressure + atmosphere" (~15h)

Sistema emotivo pervasivo.

Componenti:

- Frostpunk chromatic tension (CSS hue) (~2h)
- Frostpunk tension badge bottom-center (~3h)
- JA3 bio-terminal CSS register (~3h)
- Battle Brothers debrief tematico scroll SVG (~4h)
- JA3 faction voice register (~3h)

Chiude pillar: P5 (co-op atmosfera TV), P6 (tension readability). Rischio: basso. Tutti CSS + SVG, nessuna logica backend.

### Bundle 4 — "Progressive disclosure" (~25h)

Full tooltip stratificato + targeting avanzato.

Componenti:

- CivVI L1 tile banner compact (~3h)
- CivVI L2 hover tooltip (~4h)
- CivVI L3 click panel (~6h)
- Phoenix Point free-aim body-zone (MVP) (~10h)
- Old World campaign event drama header (~2h overhead)

Chiude: P1 informazione completa, P6 RNG non opaco. Rischio: alto. L3 panel richiede routing UI nuovo + mobile phone layout.

---

## D — 5 anti-pattern trasversali

**AP-1 — Texture tematica su sfondi con oggetti**
Battle Brothers + JA3 lo hanno imparato a loro spese: texture parchment o low-res sotto item sprites rende illeggibili i contorni degli oggetti. Regola Evo-Tactics: texture decorative solo su panel vuoti (header, bordi, footer), mai su aree che ospitano icone/sprite.

**AP-2 — Registro atmosferico incompleto = peggio del generico**
JA3 dimostra: una nota tematica isolata (solo ICQ nel login, UI moderna altrove) e peggio di nessun tema. Il registro deve essere pervasivo o non deve esserci. Per Evo-Tactics: se adotti `bio-terminal register`, applicalo a TUTTI i panel nello stesso sprint, non a meta.

**AP-3 — Colore unico come portatore di informazione critica**
Frostpunk, CK3, CivVI — tutti i giochi top-tier usano shape + colore combinati. In Evo-Tactics: tension = hue shift + badge con icona + numero. Status critico = colore rosso + bordo pulsante + label. Mai solo colore.

**AP-4 — Portrait prominente durante combat (co-op killer)**
Old World e CK3 mettono il portrait al centro perche il loro loop e lento e narrative-first. In combat co-op su TV la tile-grid e primaria. Portrait/token max 12% surface area. Drama modal e post-combat (debrief), non during.

**AP-5 — Tooltip che cattura input**
CivVI community (CQUI mod) e nata per risolvere questo: tooltip nativi bloccavano click su tile adiacenti. Evo-Tactics: tooltip sempre su `pointer-events: none` layer. Mai un tooltip che cattura click.

---

## E — Decisioni master-dd aperte

**D-1: Chromatic tension gauge — quanto aggressivo?**
Opzione A: solo border tint leggero (safe, subtile, rischio zero clarity). Opzione B: background shift + badge centrale (forte, visibile su TV da 3m). Opzione C: entrambi con cursore intensita in lobby settings. Raccomandazione: Opzione B, validare con playtest.

**D-2: Token status max-3 rule — cosa collassa?**
Se unita ha 4+ status attivi, il 4° e oltre vanno in badge "+N". Quale regola di priorita? Proposta: bleeding > stunned > focused > altri. User decide ordine definitivo prima di implementare `render.js`.

**D-3: Silhouette per job archetype — asset strategy**
Bundle 2 richiede sprite variant per job. Opzione A: 7 silhouette variant con Kenney assets (policy zero-cost ADR-2026-04-18, ~4h art). Opzione B: CSS filter tint + scale mod (zero asset, ~1h, meno espressivo). Decisione blocca Bundle 2.

**D-4: Bio-terminal CSS register — si o no?**
JA3 dimostra che registro di periodo forte crea atmosfera ma rischia usability. Evo-Tactics ha gia ADR art con "wood/metal/paper" che e gia un registro. Aggiungere `bio-terminal scanline` e compatibile o confligge? User decide se bio-tactical o organic-medieval come registro dominante.

**D-5: Phoenix Point body-zone targeting — priorita MVP?**
La versione completa (~10h) richiede zone data sugli enemy model. La versione quick (~7h) mostra solo hit-chance cone + damage range senza zone specifiche. Il quick da gia valore (RNG non opaco), il full aggiunge profondita tattica. Decisione blocca Bundle 4.

---

## Proposed tickets

```
TKT-UI-FROSTPUNK-CHROMATIC-TENSION: 7h — chromatic tension gauge CSS hue shift + badge bottom-center TV
TKT-UI-BATTLE-BROTHERS-STATUS-LABEL: 3h — status icon + 8pt label sotto ogni icona phone panel
TKT-UI-CK3-TOKEN-MAX3-STATUS: 3h — max 3 status icons su token + badge "+N" per overflow
TKT-UI-PHOENIX-POINT-HIT-CHANCE-CONE: 7h — hit-chance cone overlay + damage range su tile attack preview
TKT-UI-JA3-PERIOD-VOICE-CSS: 5h — bio-terminal CSS register su panel laterali style.css
TKT-UI-CIVVI-L2-HOVER-TOOLTIP: 4h — hover tooltip L2 mid-detail su unit hover render.js
TKT-UI-OLD-WORLD-BATTLE-SCAR: 4h — battle-scar sprite overlay su unita sotto 30% HP
TKT-UI-OLD-WORLD-DRAMA-HEADER: 5h — campaign event drama header modal con portrait debrief
TKT-UI-CK3-SILHOUETTE-JOB: 4h — token silhouette variant per 7 job archetype render.js
TKT-UI-FROSTPUNK-TENSION-HUD-BORDER: 2h — HUD border tint driven da session.pressure WS payload
```

---

## Fonti primarie citate

- [Game UI Database — Civilization VI](https://www.gameuidatabase.com/gameData.php?id=639)
- [Interface In Game — CivVI](https://interfaceingame.com/games/sid-meiers-civilization-vi/)
- [CQUI Community Edition — CivVI UI mod analysis](https://github.com/civfanatics/CQUI_Community-Edition)
- [CK3 Dev Diary #07 — Characters & Portraits (Paradox primary)](https://forum.paradoxplaza.com/forum/threads/ck3-dev-diary-07-characters-portraits.1295264/)
- [Xbox Wire — Frostpunk visual identity DLC](https://news.xbox.com/en-us/2021/07/21/how-the-visual-identity-of-frostpunk-changed/)
- [Frostpunk 2 Tension Wiki](https://frostpunk-2.game-vault.net/wiki/Tension)
- [11bit FP2 director UI interview (gagadget)](https://gagadget.com/en/494135-intuitive-and-clear-frostpunk-2s-game-director-talked-about-the-main-changes-in-the-interface-and-visual-design-of-the-game/)
- [Battle Brothers Dev Blog #75 — Reworked UI (Overhype primary)](https://battlebrothersgame.com/dev-blog-75-progress-update-reworked-ui/)
- [Mohawk Games — Old World portrait interpolation](https://www.gamespress.com/Old-World-portrait-updates-increases-character-immersion)
- [Interview Jason Pastrana UI Artist — Mohawk Games](https://mohawkgames.com/podcasts/interview-with-jason-pastrana-ui-artist/)
- [JA3 Dev Diary 7 — User Interface (RPGWatch)](https://rpgwatch.com/forum/threads/jagged-alliance-3-devdiary-7-user-interface.55565/)
- [ArtStation — JA3 UI design](https://www.artstation.com/artwork/rJvaYJ)
- [GamesRadar — Phoenix Point features](https://www.gamesradar.com/phoenix-point-adds-every-feature-an-xcom-2-fan-could-ask-for/)
- [FreeXenon — Phoenix Point Backer Build 3 UI changes](https://www.freexenon.com/2019/03/07/user-interface-and-other-changes-for-phoenix-point-backer-build-3/)
- [Game UI Database — Frostpunk 2](https://www.gameuidatabase.com/gameData.php?id=1965)
- [Songs of Conquest UI feedback Steam](https://steamcommunity.com/app/867210/discussions/0/4839692156558013231/)
