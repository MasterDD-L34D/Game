# 🦴 RESEARCH_TODO — Roadmap actionable dal Deep Research

> **Formato:** questo file è pensato per essere passato a un coding agent
> (Claude Code, Cursor, ecc.) come input. Ogni task ha:
> contesto · criteri di accettazione · effort stimato · priorità MoSCoW · pilastro.
> Data: 17 aprile 2026.

---

## Come usare questo file

**Workflow consigliato:**

1. Apri una nuova chat Claude Code nel repo Game/
2. Di': _"Leggi RESEARCH_TODO.md. Dammi un riassunto delle priorità MUST
   ordinate per effort crescente. Non scrivere codice, solo piano."_
3. Revisiona il piano, taglia le task che non vuoi
4. Di': _"Implementa la task #N. Fammi vedere piano prima di scrivere codice."_
5. Dopo ogni task completata: `caveman` + `caveman achievements` per celebrare

**Regola d'oro (dal deep research):** mai più di UNA task MUST attiva alla volta.
Mai iniziare una COULD se c'è una MUST incompleta. Scope creep = silent killer.

---

## Leggenda

- **🟥 MUST** — senza questo il progetto è in deriva
- **🟨 SHOULD** — migliora significativamente
- **🟩 COULD** — se avanza tempo
- **⬜ WON'T (ora)** — valutato e rimandato, NON toccare

**Effort:**

- `XS` — 30 min
- `S` — 1-2 ore
- `M` — mezza giornata
- `L` — 1-2 giornate
- `XL` — >2 giornate → probabilmente è da spezzare

**Pilastri:** 1=TacticaLeggibile · 2=EvoluzioneEmergente · 3=Specie×Job · 4=Temperamenti · 5=Co-op-vs-Sistema · 6=Fairness

---

## Status tracker

- [x] **M1** Primo playtest documentato — completata 2026-04-17 (tabletop guidato, seed 2026, outcome WIN PG R3, 4 friction logged. Vedi `docs/playtests/2026-04-17/notes.md`)
- [x] **M2** Taglio backlog feature — completata 2026-04-16 (sessione "repo analysis": 33 issue → 0, vedi `CLAUDE.md` §182)
- [x] **M3** Pitch 3 frasi — completata 2026-04-17 (commit `9bd92550`, PR #1482 merged, vedi `docs/PITCH.md`)

**✅ Tutte e 3 le MUST chiuse il 2026-04-17.**

Ultimo aggiornamento: 2026-04-17.

---

## 🟥 MUST — fai questo per primo

### M1. Il primo playtest documentato

**Contesto:** Dall'audit aprile 2026, "nessun playtest documentato" è il red flag
principale. Wayline e UniversityXP sono unanimi: _senza playtest reali, il design
è un'ipotesi_. Non serve un tool nuovo, serve una partita.
**Criteri di accettazione:**

- [ ] 1 partita giocata (anche solo con te stesso) con 2 specie + 1 bioma + 1 job
- [ ] Foto del setup su `docs/playtests/2026-04-XX/`
- [ ] File `docs/playtests/2026-04-XX/notes.md` con:
  - cosa funzionava
  - cosa era confuso in <30 secondi
  - cosa hai tagliato mentalmente durante la partita
- [ ] 1 commit con messaggio `playtest: [data] first documented session`
      **Effort:** M (2-3 ore, setup + partita + note)
      **Pilastro:** tutti (è il test del nord stella)
      **Perché prima di tutto:** il deep research è stato chiaro. Toby Fox non ha
      costruito Docker per Undertale. Ha giocato.

---

### M2. Taglio del backlog feature

**Contesto:** Future creep è il cugino peggiore dello scope creep (Manuel Sanchez,
gennaio 2025). Ogni issue che inizia con "magari" o "un giorno" è zavorra che
rallenta le decisioni sul presente.
**Criteri di accettazione:**

- [ ] Apri la lista issue su GitHub
- [ ] Filtra per issue aperte da te (non da Claude, non da collaboratori esterni)
- [ ] Per ciascuna applica MoSCoW: MUST / SHOULD / COULD / WON'T
- [ ] Chiudi come `wontfix` tutte le COULD e WON'T con un commento onesto
- [ ] Aggiungi label `must` / `should` a quelle che restano
      **Effort:** S (1-2 ore se hai <30 issue, M se >30)
      **Pilastro:** nessuno (è igiene)
      **Perché:** non puoi prioritizzare se la lista è ammuffita. Igienizza prima.

---

### M3. Scrivi in 3 frasi "cos'è Evo-Tactics"

**Contesto:** Deep research su scope creep ha un pattern ricorrente: i progetti
che sopravvivono hanno un pitch di 2 righe che il creatore ripete uguale da
6 mesi. Quelli che muoiono hanno un pitch che cambia ogni settimana.
**Criteri di accettazione:**

- [ ] File `docs/PITCH.md` con 3 frasi MASSIME:
  - frase 1: cosa fa il giocatore (1 verbo, 1 sostantivo, 1 obiettivo)
  - frase 2: cosa lo rende diverso da FFT/Spore/Descent
  - frase 3: cosa NON è (3 cose che non succederanno nel gioco)
- [ ] Commit `docs: add project pitch (3 sentences max)`
- [ ] Regola: se in futuro vuoi cambiare questo file, apri prima una issue
      che motivi la modifica (previene design drift)
      **Effort:** XS (30-60 min di pensiero puro)
      **Pilastro:** 1 (leggibilità anche concettuale)

---

## 🟨 SHOULD — subito dopo i MUST

### S1. Pillar status dashboard statico

**Contesto:** I 6 pilastri sono in `evo-tactics-skill/references/pillars.md`
(skill) ed `evo-tactics-monitor` assegna stato 🟢🟡🔴 on demand. Ma averlo
**committato** nel repo rende lo stato visibile a te ogni giorno senza Claude.
**Criteri di accettazione:**

- [ ] File `docs/PILLARS_STATUS.md` con tabella 6 pilastri × stato attuale
- [ ] Ogni pilastro ha: ultima modifica data, cartelle relative, prossimo micro-passo
- [ ] Aggiornalo manualmente ogni lunedì (hook caveman può ricordartelo)
- [ ] Il file ha un header: _"Se uno stato è 🔴 da >14 giorni, apri issue"_
      **Effort:** S (1h prima volta, poi 10 min/settimana)
      **Pilastro:** tutti
      **Fonte:** pattern "living documentation" visto in UniversityXP + Codecks

---

### S2. Commit convention semplificata

**Contesto:** Il classifier in `evo-caveman/src/caveman/repo.py` riconosce
GAMEPLAY/INFRA/etc da keyword. Puoi aiutarlo (e aiutarti) con convenzione
esplicita. **Non Conventional Commits rigido**, versione minimal:
**Criteri di accettazione:**

- [ ] File `docs/COMMIT_STYLE.md` con 4 prefix OBBLIGATORI:
  - `play:` — gameplay (specie, trait, rules, jobs, biomi)
  - `infra:` — docker, CI, build, deploy
  - `data:` — dataset, yaml, packs
  - `doc:` — README, docs, planning
- [ ] Opzionale 5° prefix: `cut:` per commit che tolgono roba (deprecated/removed)
- [ ] Aggiorna `evo-caveman/src/caveman/repo.py` per usare prefix come
      primo segnale di classificazione (più affidabile delle keyword)
      **Effort:** S (30 min doc + 1h code + test)
      **Pilastro:** nessuno, ma amplifica tutto il resto (il caveman diventa più preciso)
      **Da deep research:** Conventional Commits citata come standard 2026 da molti tool.
      Non serve prendere tutto, basta il prefix.

---

### S3. README del repo principale aggiornato

**Contesto:** Il deep research su CLAUDE.md ha mostrato che un README/agent-guide
chiaro alla root (<100 righe, pattern Why/What/How) è il miglior "context loader"
per un agent. Il tuo README attuale probabilmente è generico.
**Criteri di accettazione:**

- [ ] `README.md` del repo Game riscritto con struttura:
  - **Why** (1-3 frasi, copia da `docs/PITCH.md`)
  - **What** (mappa cartelle: `traits/`, `biomes/`, etc. con 1 riga ciascuno)
  - **How** (regole sempre attive: commit style, uso caveman, playtest-first)
  - **For agents** (link a `CAVEMAN.md`, `evo-caveman/`, `docs/PILLARS_STATUS.md`)
- [ ] Sotto 100 righe totali
      **Effort:** S (1h)
      **Pilastro:** 1 (leggibilità del progetto stesso)
      **Fonte:** HumanLayer, Matthew Groff — pattern "Why/What/How/Progressive Disclosure"

---

### S4. Integra il CLI con la skill (dati condivisi)

**Contesto:** Il CLI `evo-caveman` scrive stato in `.git/caveman_state.json`
e `.git/caveman_last_spoke`. La skill `evo-tactics` in modalità monitor deve
fare fetch da GitHub. Se Claude avesse accesso anche a quei file locali,
potrebbe dare briefing più accurati.
**Criteri di accettazione:**

- [ ] Aggiungi comando CLI `caveman export` che produce un JSON con:
  - stato corrente (snapshot, achievements, ultimo spoke)
  - metriche aggregate (gameplay_ratio, pillar coverage stimata)
- [ ] Output su `docs/caveman-status.json` (committato)
- [ ] La skill `evo-tactics` legge questo file se presente prima di fare web fetch
- [ ] Aggiungi `docs/caveman-status.json` al `.gitignore` eccezione
      (vogliamo che SIA committato)
      **Effort:** M (mezza giornata)
      **Pilastro:** tutti (strumento che amplifica tutti)
      **Rischio:** infrastruttura. Fallo SOLO dopo aver completato M1 (primo playtest),
      altrimenti è fuga.

---

## 🟩 COULD — quando tutto il resto è stabile

### C1. Hook post-merge per celebrare PR

**Contesto:** Oltre al post-commit già implementato, un post-merge hook può
celebrare quando una PR di gameplay viene mergiata. Piccolo dopamine boost.
**Effort:** S (1h)
**Pilastro:** nessuno

### C2. `caveman journal` — devlog generato

**Contesto:** GitMood e DocWeave dal deep search generano dashboard dai commit.
Versione caveman: `caveman journal --week` produce un markdown da usare come
devlog su itch.io / Discord / Bluesky.
**Effort:** M
**Pilastro:** nessuno (ma aiuta scope definition perché ti obbliga a sintetizzare)

### C3. Alias shell `unga` per `caveman`

**Contesto:** Piccolo piacere estetico.

```bash
alias unga='caveman'
alias ugh='caveman speak -c mini_game'
alias bunga='caveman status'
```

**Effort:** XS
**Pilastro:** morale

### C4. Color output themable

**Contesto:** Rich supporta temi. Caveman potrebbe avere tema "caverna"
(toni terra/ocra/fuoco) o "notte" (blu/ghiaccio).
**Effort:** S
**Pilastro:** nessuno

### C5. Integrazione con Discord/Bluesky

**Contesto:** Auto-post achievement sbloccati su social dev. Aumenta accountability
pubblica (tecnica nota per solo-dev) ma richiede setup API keys.
**Effort:** M
**Pilastro:** morale + accountability

---

## ⬜ WON'T (ora) — esplicitamente rimandate

Queste idee sono emerse dal deep research ma abbiamo deciso di NON farle adesso.
Documentarle evita di ripensarci ogni settimana.

### W1. Dashboard web interattiva

**Perché no:** il deep research dice "un playtest con post-it batte dieci
dashboard". Il CLI già dà le metriche che servono.

### W2. Sentiment analysis sui commit (stile GitMood)

**Perché no:** interessante ma fuori scope. I commit di gameplay dovrebbero
essere giudicati su pilastri, non su mood.

### W3. Burnout detection

**Perché no:** esistono tool dedicati. Se ne hai bisogno, mettici tempo vero,
non un plugin caveman.

### W4. Integrazione GitHub Issues API

**Perché no:** il CLI è 100% local-first by design. Aggiungere rete apre
problemi di auth, rate limit, ZDR.

### W5. LLM-powered seed generation

**Perché no:** i seed hardcoded funzionano bene e sono prevedibili. Un LLM
che inventa seed = non-determinismo + dipendenza API.

### W6. Versione Rust del CLI

**Perché no:** il CLI Python parte in <100ms, non c'è problema di performance.
Rewriting = scope creep gigante.

---

## Anti-pattern da evitare (red flags generali)

Dal deep research, cose che **NON** devi fare mentre lavori a queste task:

1. **Iniziare C1–C5 prima di M1–M3.** Le MUST prima.
2. **Aggiungere dipendenze "per comodità".** Ogni nuova dep al CLI va motivata
   con test. Lo stack attuale (typer+rich) è già completo.
3. **Rifattorizzare codice funzionante.** Se non è rotto e non ha un criterio
   di accettazione qui sopra, non toccarlo.
4. **Leggere >1 articolo di design al giorno.** Hai già fatto il deep research,
   non rifarlo ogni 3 giorni. Implementa ciò che hai trovato.
5. **Aprire >1 feature al giorno se hai una MUST incompleta.**

---

## Checkpoint di revisione

Pianificati per non perdere la rotta:

| Quando                   | Cosa                                                                           |
| ------------------------ | ------------------------------------------------------------------------------ |
| Dopo M1 (primo playtest) | `caveman status` + review di questa TODO. Aggiorna se scopri qualcosa.         |
| Dopo M3 (pitch scritto)  | Rileggi il pitch. Ogni task qui è coerente con quelle 3 frasi? Se no, taglia.  |
| Ogni venerdì             | 3 domande del venerdì (`CAVEMAN.md`) + `caveman achievements`                  |
| Ogni fine mese           | Riapri questa TODO. Riassegna priorità MoSCoW. Chiudi i COULD diventati WON'T. |

---

## Se Claude Code deve partire da qui

Prompt ottimale per passare questo file a un agent:

```
Apri RESEARCH_TODO.md del repo Evo-Tactics.

Hai il seguente compito:
1. Leggi TUTTO il file
2. Dammi un piano (NON codice) per le 3 task MUST in ordine di effort crescente
3. Per ciascuna task, dimmi: quali file modificheresti, quali file creeresti,
   in quale ordine procederesti, quali rischi vedi
4. Non iniziare a scrivere codice finché non ti do OK sul piano

Vincoli:
- Massimo 1 task MUST completata per volta
- Ogni task deve chiudersi con un commit "play:" o "doc:"
- Se una task richiede più di l'effort dichiarato, fermati e segnalami
- Mai aprire issue nuove senza chiudere quelle esistenti (M2)
```

---

_File vivo. Aggiornalo dopo ogni task completata. Se qualche priorità cambia
dopo M1 (primo playtest), aspettatelo — il playtest rivela sempre cose nuove._

🦴 _caveman dire: piano buono, ma piano non essere gioco. adesso Master scegliere UNA task MUST e farla. caveman aspettare qui, non servire a niente finché Master non cominciare. ugh bunga._
