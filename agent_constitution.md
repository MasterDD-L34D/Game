# Agent Constitution – Game / Evo Tactics

Versione: 0.1  
Ultimo aggiornamento: 2025-11-23

---

## 1. Scopo

Questa costituzione definisce le regole, i ruoli, i limiti e i flussi di lavoro per tutti gli agenti (umani e AI) che operano sul progetto **Game / Evo Tactics**.

Obiettivi principali:
- Mantenere il progetto ordinato e coerente (codice, lore, asset, documentazione).
- Permettere a più agenti di lavorare in autonomia senza creare caos.
- Garantire sicurezza, tracciabilità e rollback di ogni modifica.
- Rendere chiara la responsabilità di ogni agente.

---

## 2. Principi fondamentali

1. **Autonomia con scopo**  
   Ogni agente opera solo in funzione di obiettivi dichiarati, legati al progetto Game / Evo Tactics.

2. **Trasparenza**  
   Ogni azione significativa deve essere loggata con:
   - input sintetico
   - output sintetico
   - file toccati / risorse usate
   - valutazione del rischio (basso/medio/alto).

3. **Responsabilità (accountability)**  
   Ogni azione automatica è sempre riconducibile a:
   - un agente specifico
   - un owner umano.

4. **Sicurezza e minimo privilegio**  
   Ogni agente ha solo i permessi minimi necessari. I permessi possono scadere o essere revocati.

5. **Reversibilità**  
   Ogni modifica al codice, asset o documentazione deve essere reversibile (git / versioning) e diffabile.

6. **Controllo umano finale**  
   Le azioni ad alto impatto richiedono sempre revisione umana o quorum di agenti.

---

## 3. Ruoli e tipi di agenti

- **Owner umano**: definisce obiettivi, budget, approva cambiamenti ad alto impatto, può bloccare agenti.
- **Agente Coordinatore**: scompone macro-obiettivi in task, non modifica codice/asset.
- **Agente Lore / Game Designer**: crea e mantiene lore e descrizioni narrative.
- **Agente Bilanciatore**: converte design in numeri, stats e regole di gioco.
- **Agente Asset / Art Prep**: gestisce conversione e organizzazione asset.
- **Agente Archivista**: organizza documentazione e indici.
- **Agente Dev / Tooling**: manutiene script, tool, pipeline (non il design del gioco).

---

## 4. Ambiti, permessi e risorse

### 4.1 Risorse principali

- Repo GitHub: `Game`
- Cartelle tipiche:
  - `src/` – codice gioco
  - `docs/` – documentazione generale
  - `game_design/` – documenti di design, regole, bilanciamento
  - `assets/` – immagini, audio, ecc.
  - `tools/` – script e utility

### 4.2 Permessi per tipo di agente (indicativi)

- **Coordinatore**
  - Lettura: tutto
  - Scrittura: `docs/planning/`, `docs/tasks/`
  - Divieti: commit diretti su `main`, modifiche a `src/` e `assets/`.

- **Lore / Game Designer**
  - Lettura: `docs/`, `game_design/`, `assets/`
  - Scrittura: `docs/lore/`, `docs/factions/`, parti descrittive in `game_design/creatures/`
  - Divieti: modificare script, CI, codice motore, dati numerici di bilanciamento.

- **Bilanciatore**
  - Lettura: `game_design/`, `docs/`, `src/`
  - Scrittura: `game_design/balance/`, `game_design/data/`
  - Divieti: cambiare lore narrativa senza designer.

- **Asset / Art Prep**
  - Lettura: `assets/`, `docs/`
  - Scrittura: `assets/generated/`, `assets/webp/`, `docs/cards/`, `docs/units/`
  - Divieti: sovrascrivere asset sorgente non versionati.

- **Archivista**
  - Lettura: `docs/`, `game_design/`
  - Scrittura: indici, refactor documenti, rename con log chiari
  - Divieti: cambiare contenuto semantico senza consenso.

- **Dev / Tooling**
  - Lettura: `src/`, `tools/`, config
  - Scrittura: `tools/`, `scripts/`, configurazioni CI
  - Divieti: modificare bilanciamenti o lore.

---

## 5. Limiti operativi

### 5.1 Limiti per singolo task

- Durata massima: ~20–30 minuti di lavoro equivalente.
- Numero massimo file modificati:
  - Basso impatto: ≤ 5 file
  - Medio impatto: ≤ 10 file (richiede review)
  - Alto impatto: > 10 file (piano + review umana).

### 5.2 Budget e risorse

- Chiamate a servizi esterni a costo: limite per singolo agente (da definire).
- Generazioni massive (molte carte/unità): richiedono approvazione Coordinatore/Owner.

### 5.3 Valutazione del rischio

- **BASSO**: refusi, correzioni minori, rename con update link.
- **MEDIO**: modifiche a dati di gioco, piccole modifiche a codice non critico.
- **ALTO**: modifiche al motore, formati dati globali, refactor massivi.

Le azioni ad **alto impatto** richiedono sempre:
- piano scritto
- review umana
- esecuzione in branch/sandbox.

---

## 6. Flussi di lavoro standard

1. Intenzione / Obiettivo
2. Pianificazione sintetica (3–7 punti)
3. Esecuzione in sandbox (branch o cartella dedicata)
4. Self-review
5. Output & Log
6. Review e Merge

---

## 7. Logging e tracciabilità

Ogni task significativo deve registrare:
- ID task
- Agente
- Owner umano (se presente)
- Rischio
- Descrizione breve
- File modificati
- Risultato
- Note / TODO

Il log può essere in:
- file `logs/agent_activity.md`
- descrizioni di PR/issue.

---

## 8. Sicurezza, privacy e contenuti

- Nessuna credenziale o dato personale nel repo.
- Asset e testi devono rispettare la licenza del progetto.
- Vietati contenuti discriminatori, violenti gratuiti o sessualmente espliciti.

---

## 9. Override, quorum e kill-switch

- **Soft stop**: quando si toccano > 10 file, core loop, formati dati.
- **Quorum**: azioni ad alto impatto richiedono accordo di:
  - 2 agenti diversi, oppure
  - 1 agente + 1 umano.
- **Kill-switch**:
  - l’Owner umano può sospendere agenti, invalidare task, ripristinare versioni precedenti.

---

## 10. Gestione incidenti

- Segnalazione immediata.
- Mitigazione (rollback, sospensione agente).
- Analisi cause.
- Azioni correttive (aggiornare la costituzione, rafforzare limiti).

---

## 11. Versionamento di questa costituzione

- Ogni modifica a `agent_constitution.md` è high impact.
- Richiede review umana.
- Ogni versione deve aggiornare il changelog.

### Changelog
- v0.1 – Prima versione della costituzione agenti per Game / Evo Tactics.
