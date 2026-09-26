# SPRINT_001 — Prima Sessione Giocabile

> Documento operativo per Claude Code.
> Leggi tutto prima di scrivere una riga di codice.

---

## Visione

"Tattica profonda a turni, cooperativa contro il Sistema, condivisa su TV:
**come giochi modella ciò che diventi.**"

Il gioco gira su un'interfaccia digitale locale (TV + secondo schermo).
Non è un boardgame. Non è una dashboard. È un engine di gioco.

---

## Obiettivo di questo sprint

Alla fine di questo sprint esiste **un endpoint funzionante** che:

- accetta un'azione di gioco (movimento o attacco)
- risolve un tiro d20 secondo le regole del GDD
- scrive l'evento in un session log JSON su disco

Nient'altro. Nessuna UI, nessun frontend, nessuna analytics.

### Definition of Done

```bash
curl -X POST localhost:3333/api/session/action \
  -d '{"actor_id":"unit_1","action_type":"attack","target":"unit_2"}'

# Risposta attesa:
# { "roll": 17, "mos": 4, "result": "hit", "pt": 1 }

# File creato automaticamente:
# logs/session_YYYYMMDD_HHMMSS.json  ← contiene l'evento raw
```

Questo file di log è la prima alimentazione reale del sistema VC.
Senza di esso, tutto il resto (analytics, telemetria, dashboard) è vuoto.

---

## Contesto di design — i 6 Pilastri

Ogni scelta tecnica deve servire almeno uno di questi pilastri.
Se non serve nessuno dei 6, non farlo.

| #   | Pilastro                         | Coperto quando...                                                                 |
| --- | -------------------------------- | --------------------------------------------------------------------------------- |
| 1   | **Tattica leggibile (FFT)**      | Esiste 1 scenario con turni, AP, movimento, attacco risolto con d20               |
| 2   | **Evoluzione emergente (Spore)** | Almeno 1 trait T1 ha un trigger comportamentale collegato a un evento di sessione |
| 3   | **Identità Specie × Job**        | 2 specie + 2 job definiti, 1 combinazione produce output di gioco diverso         |
| 4   | **Temperamenti MBTI/Ennea**      | Il session log accumula dati VC sufficienti per calcolare almeno 1 indice         |
| 5   | **Co-op vs Sistema**             | Esiste 1 regola IA meccanica scritta (anche 1 frase) in `engine/`                 |
| 6   | **Fairness**                     | Hard cap PT documentato con valore numerico concreto                              |

**Questo sprint copre principalmente Pilastro 1 e prepara il terreno per Pilastro 4.**

---

## Fasi di lavoro

### FASE 1 — Sblocca i prerequisiti

_Chiudi queste issue nell'ordine indicato. Non procedere alla Fase 2 finché non sono chiuse._

**#1339 — bug(backend): endpoint generation e atlas ritornano 500**

- `/api/v1/generation/snapshot` e `/api/v1/atlas/` devono rispondere 200
- Questi endpoint alimentano la generazione specie che serve al match
- Verifica con: `curl localhost:3333/api/v1/generation/snapshot`

**#1341 — bug(tests): side-effect su dataset live durante i test**

- I test non devono toccare i dati reali in `data/`
- Introduce fixtures isolate o mock per i test che leggono dataset
- Verifica con: `npm run test:api` senza modificare nessun file in `data/`

**#1338 — bug(dataset): replacement char Unicode in glossary.json e index.json**

- Strip dei caratteri `\uFFFD` e equivalenti
- Verifica con: `grep -r "\uFFFD" data/` → deve restituire vuoto

**#1342 — dx(orchestrator): ORCHESTRATOR_AUTOCLOSE_MS friction**

- Risolvi il timeout che causa retry/crash del worker Python
- Valore ragionevole di default documentato in `.env.example`

---

### FASE 2 — Decisione strategica

_Una sola issue, ma è la più importante dello sprint._

**#1343 — decision: rimuovere apps/dashboard + packages/angular\***

- Rimuovi `apps/dashboard/` e tutto `packages/angular*`
- Aggiorna `package.json` root, rimuovi script che li referenziano
- Aggiorna README rimuovendo le sezioni "Dashboard web & showcase"
- **Perché:** la dashboard ha il 70% del codebase in HTML e zero dati reali di gioco.
  È diventata il prodotto principale invece che uno strumento. Va rimossa ora,
  prima che cresca ancora.

---

### FASE 3 — Engine minimo giocabile

_Il cuore dello sprint. Costruisci su `apps/backend/` esistente._

**Endpoint da creare:**

```
POST /api/session/action
```

**Body:**

```json
{
  "actor_id": "string",
  "action_type": "move" | "attack",
  "target_id": "string (solo per attack)",
  "position": { "x": number, "y": number } "(solo per move)"
}
```

**Logica di risoluzione (da GDD v0.1):**

Per `attack`:

```
roll = d20 + mod_caratteristica
mos  = roll - dc_difesa           // Margin of Success
hit  = mos >= 0
pt   = 0
if hit:
  if roll >= 15 and roll <= 19: pt += 1
  if roll == 20: pt += 2
  pt += floor(mos / 5)           // +1 PT ogni 5 di MoS
```

Per `move`:

```
// Valida che la posizione sia entro il range AP disponibile
// Aggiorna posizione actor nella sessione in memoria
```

**Session log — formato evento:**

```json
{
  "ts": "ISO8601",
  "session_id": "uuid",
  "actor_id": "string",
  "action_type": "attack" | "move",
  "roll": number,
  "mos": number,
  "result": "hit" | "miss",
  "pt": number,
  "position_from": { "x": number, "y": number },
  "position_to":   { "x": number, "y": number }
}
```

File: `logs/session_[YYYYMMDD_HHMMSS].json` — array di eventi, append ad ogni azione.

**Stato sessione in memoria (NeDB o oggetto in-process):**

```json
{
  "session_id": "uuid",
  "turn": number,
  "units": [
    {
      "id": "unit_1",
      "species": "string",
      "job": "string",
      "hp": number,
      "ap": number,
      "position": { "x": number, "y": number },
      "mod": number
    }
  ]
}
```

**Endpoint accessori minimi:**

```
POST /api/session/start   → crea sessione, piazza 2 unità su griglia 6×6
GET  /api/session/state   → ritorna stato corrente (unità, turno, griglia)
POST /api/session/end     → chiude sessione, finalizza il log su disco
```

---

## Guardrail — cosa NON toccare

Questi file e cartelle sono **fuori scope** per questo sprint.
Se ti accorgi di averne bisogno, fermati e segnala invece di procedere.

```
❌ .github/workflows/      — nessuna modifica CI
❌ analytics/              — zero analytics senza session log reali
❌ ops/                    — nessuna infra
❌ migrations/             — nessuna migrazione DB
❌ apps/dashboard/         — verrà rimossa in Fase 2, non modificare prima
❌ services/generation/    — non toccare il generatore specie per ora
❌ packages/contracts/     — non aggiornare gli schemi condivisi
❌ public/hud/             — non toccare l'overlay HUD
```

**Nessuna nuova dipendenza npm o pip.**
**Nessuna modifica allo schema Prisma.**
**Se una cosa richiede più di 50 righe nuove fuori da `apps/backend/`,
fermati e segnala.**

---

## Pattern da evitare (trappole frequenti)

- `"Sistemo prima il validator poi aggiungo l'endpoint"` → no, l'endpoint è il target
- `"Aggiungo il frontend Vue per vedere la griglia"` → no, curl basta per validare
- `"Estendo il session log con più campi VC"` → no, prima fai girare l'evento base
- `"Refactoro la struttura di services/ per renderla più pulita"` → no, non ora
- `"Apro una nuova issue mentre lavoro"` → segnala nel commit message, non aprire issue

---

## Segnali che stai andando nella direzione giusta

✅ Stai modificando file in `apps/backend/`, `rules/`, `engine/`
✅ Stai riducendo dipendenze, non aggiungendone
✅ Il tuo commit message inizia con `feat(session):` o `fix(backend):`
✅ Alla fine di ogni fase puoi eseguire il comando di verifica e ottenere il risultato atteso

---

## Issue escluse da questo sprint

Queste issue esistono ma non servono l'obiettivo. Ignorale.

| #     | Motivo esclusione                     |
| ----- | ------------------------------------- |
| #1344 | Triage docs — non sblocca gameplay    |
| #1345 | Triage reports — non sblocca gameplay |
| #1346 | Rename cartella — cosmetic            |
| #1347 | Gitignore housekeeping — cosmetic     |
| #1348 | Husky Prettier — cosmetic             |

---

## Riferimenti utili

- **GDD completo**: release tag `Info` → https://github.com/MasterDD-L34D/Game/releases/tag/Info
- **Regole d20**: sezione "Sistema Dadi Ibrido — Descent → d20" nel GDD
- **Formato trait**: `traits/` + `data/core/traits/`
- **Backend esistente**: `apps/backend/` — Express + NeDB già configurati
