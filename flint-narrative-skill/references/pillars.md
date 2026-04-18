# I 6 Pilastri di Evo-Tactics (GDD v0.1)

Riferimento per ancorare hint e sprint a principi concreti del design.

---

## 1. Tattica leggibile, scacchistica (FFT)

Ispirazione: **Final Fantasy Tactics**, chess.

- Ogni turno deve essere comprensibile in 30 secondi
- Le conseguenze di una mossa devono essere prevedibili al momento della scelta
- Niente dadi nascosti, niente "ha calcolato dietro le quinte"
- Se serve un manuale per capire un turno, il turno è rotto

**Sintomo di pilastro in deriva:** regole che richiedono spiegazione > 1 paragrafo.

---

## 2. Evoluzione emergente da comportamenti (Spore)

Ispirazione: **Spore**, evoluzione biologica.

- L'evoluzione NON è uno skill tree. È una sorpresa da uso ripetuto.
- Se il giocatore può prevedere l'upgrade, non è evoluzione, è shopping
- Le evoluzioni dovrebbero emergere da pattern di comportamento ripetuti, non da scelte dirette
- "Ho usato 5 volte il fuoco" → evolve qualcosa relativo al fuoco (non "scegli upgrade fuoco")

**Sintomo di pilastro in deriva:** menu "scegli la tua evoluzione".

---

## 3. Identità doppia: Specie × Job

Ispirazione: doppia classificazione (biologia × ruolo).

- **Specie** = COSA fa un'unità (capacità innate, corpo, biomi preferiti)
- **Job** = COME lo fa (tecniche, disciplina, ruolo tattico)
- Se Specie e Job si sovrappongono, uno dei due è inutile → tagliare
- Ogni combinazione Specie×Job deve avere una ragion d'essere unica

**Sintomo di pilastro in deriva:** combo Specie×Job intercambiabili.

---

## 4. Temperamenti giocati (MBTI/Ennea come seme ludico)

Ispirazione: psicologia giocabile.

- Il temperamento NON è +2 STAT
- È una **tentazione** durante il turno ("INTJ vuole pianificare, ma il turno dura 30 sec")
- Il giocatore deve sentire il temperamento come pulsione, non come etichetta
- I temperamenti dovrebbero creare dilemmi tattici, non descrivere personaggi

**Sintomo di pilastro in deriva:** temperamenti usati solo per dialoghi o lore.

---

## 5. Co-op vs Sistema (Descent: Leggende)

Ispirazione: **Descent: Legends of the Dark**.

- Il gioco è cooperativo: i giocatori contro il Sistema (AI avversaria)
- Il Sistema deve poter vincere **davvero**, altrimenti non è cooperazione, è puzzle
- Niente "il Sistema fa ciò che i giocatori si aspettano per farli sentire forti"
- La tensione viene dal fatto che il Sistema può e vuole sconfiggerti

**Sintomo di pilastro in deriva:** "qual è la strategia giusta per vincere?" → è un puzzle.

---

## 6. Fairness: caps, counter disclosure, anti-snowball

Ispirazione: game design competitivo, teoria del "fun".

- **Caps**: nessuna scalata esponenziale (niente unità 10x più forti di altre)
- **Counter disclosure**: se il nemico ha un counter alla tua mossa, il gioco te lo deve dire PRIMA della mossa, non dopo
- **Anti-snowball**: perdere un turno non deve garantire perdere la partita
- Una combo "peggior specie + peggior job" deve poter essere interessante da giocare

**Sintomo di pilastro in deriva:** "eh, ti ho beccato con il counter nascosto".

---

## Stato operativo

Ogni pilastro ha uno stato:

- 🟢 **Coperto** — esiste artefatto giocabile/dataset validato
- 🟡 **Teorizzato** — esiste nel GDD ma nessuna implementazione giocabile
- 🔴 **Bloccato** — infrastruttura in conflitto o pilastro ignorato di recente

**Regola:** un pilastro 🟡 per troppo tempo diventa 🔴. Il caveman lo sa e lo dice.
