# SPRINT_002 — Sessione Completa + Primo Trait Vivo

> Documento operativo per Claude Code.
> Leggi tutto prima di scrivere una riga di codice.
> Prerequisito: SPRINT_001 completato ✅

---

## Contesto

Lo sprint precedente ha prodotto il primo session log reale del progetto
(`logs/session_20260414_230422.json`). Il sistema d20 gira e i conti tornano.

**Stato pilastri dopo SPRINT_001:**

| Pilastro                         | Stato         |
| -------------------------------- | ------------- |
| 1 — Tattica leggibile (FFT)      | 🟢 Coperto    |
| 2 — Evoluzione emergente (Spore) | 🟡 Teorizzato |
| 3 — Identità Specie × Job        | 🟡 Teorizzato |
| 4 — Temperamenti MBTI/Ennea      | 🟡 Teorizzato |
| 5 — Co-op vs Sistema             | 🔴 Bloccato   |
| 6 — Fairness                     | 🟡 Teorizzato |

**Questo sprint copre: Pilastri 2, 3 e 5.**

---

## Obiettivo

Alla fine di questo sprint è possibile:

1. Avviare una sessione con 2 unità (ognuna con specie + job + trait assegnati)
2. Giocare una sequenza completa di azioni: move → attack → fine turno → turno IA
3. Il log registra anche i trait attivi e i loro effetti
4. Il Sistema (IA) esegue almeno 1 azione automatica a fine turno

### Definition of Done

```bash
# 1. Avvia sessione
curl -X POST localhost:3334/api/session/start \
  -d '{
    "units": [
      { "id": "unit_1", "species": "velox", "job": "skirmisher",
        "traits": ["zampe_a_molla"] },
      { "id": "unit_2", "species": "carapax", "job": "vanguard",
        "traits": ["pelle_elastomera"] }
    ]
  }'
# → { "session_id": "uuid", "state": { "turn": 1, "units": [...] } }

# 2. Azione giocatore
curl -X POST localhost:3334/api/session/action \
  -d '{"actor_id":"unit_1","action_type":"attack","target_id":"unit_2"}'
# → { "roll": 17, "mos": 4, "result": "hit", "pt": 1,
#     "trait_effects": [{ "trait": "zampe_a_molla", "effect": "none" }] }

# 3. Fine turno → IA agisce
curl -X POST localhost:3334/api/session/turn/end
# → { "ia_action": { "actor": "sistema", "type": "attack",
#                    "target": "unit_1", "roll": 14, "result": "miss" } }

# 4. Verifica log
cat logs/session_*.json | grep "trait_effects"
# → deve trovare almeno 1 riga con trait_effects non vuoto
```

---

## Fasi di lavoro

### FASE 1 — Sessione inizializzabile

**Endpoint `/api/session/start`**

Crea una sessione in memoria (NeDB) con:

- `session_id` (uuid)
- `turn: 1`
- `active_unit: units[0].id`
- 2 unità posizionate su griglia 6×6 agli angoli opposti
  (unit_1 → `{x:0, y:0}`, unit_2 → `{x:5, y:5}`)

Ogni unità ha questi campi:

```json
{
  "id": "string",
  "species": "string",
  "job": "string",
  "traits": ["string"],
  "hp": 10,
  "ap": 2,
  "ap_remaining": 2,
  "mod": 3,
  "dc": 12,
  "guardia": 1,
  "position": { "x": number, "y": number }
}
```

**Endpoint `/api/session/state`**

Ritorna lo stato corrente della sessione attiva:

```json
{
  "session_id": "string",
  "turn": number,
  "active_unit": "string",
  "units": [...],
  "grid_size": 6,
  "log_events_count": number
}
```

---

### FASE 2 — Primo trait vivo (Pilastro 2)

Il session log deve registrare i trait attivi e i loro effetti sulle azioni.

**Trait da implementare (scegli i 2 più semplici):**

```
zampe_a_molla (Fisiologico T1):
  trigger: action_type == "attack" AND mos >= 5 AND posizione_sopraelevata
  effetto:  +1 step danno (target_hp -= 1 extra)
  log_tag:  "backstab_bonus"

pelle_elastomera (Fisiologico T1):
  trigger: action_type == "attack" AND result == "hit"
  effetto:  riduce danno ricevuto di 1 (min 0)
  log_tag:  "damage_reduction"
```

**Formato aggiornato del session log:**

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
  "trait_effects": [
    { "trait": "string", "triggered": boolean, "effect": "string" | "none" }
  ],
  "target_hp_before": number,
  "target_hp_after": number,
  "position_from": { "x": number, "y": number },
  "position_to":   { "x": number, "y": number }
}
```

**Dove leggere i trait:**

- Definizioni YAML in `traits/` e `data/core/traits/`
- Se un trait non è nel YAML, skippa silenziosamente e logga `"triggered": false`
- Non hardcodare i valori: leggili dal YAML al boot del server

---

### FASE 3 — Il Sistema agisce (Pilastro 5)

**Endpoint `/api/session/turn/end`**

Quando il giocatore chiama questo endpoint:

1. Resetta `ap_remaining` dell'unità attiva a `ap`
2. Passa il turno all'unità successiva
3. Se l'unità successiva è controllata dal "sistema" → esegui l'azione IA automatica
4. Logga l'azione IA nel session log come evento normale

**Regola IA Sistema (scrivila anche in `engine/sistema_rules.md`):**

```
REGOLA_001:
  Il Sistema seleziona l'unità nemica con meno HP.
  Se è in range (distanza Manhattan <= 2): esegue attack.
  Altrimenti: move verso di essa di 1 passo.
  Usa lo stesso resolver d20 delle unità giocatore.
```

Questa regola va scritta in `engine/sistema_rules.md` come file di testo,
indipendentemente dall'implementazione. È la prima regola dell'IA Regista.

**Evento IA nel log:**

```json
{
  "ts": "ISO8601",
  "actor_id": "sistema",
  "action_type": "attack" | "move",
  "ia_rule": "REGOLA_001",
  "roll": number,
  "result": "hit" | "miss",
  "trait_effects": []
}
```

---

### FASE 4 — Identità Specie × Job nel log (Pilastro 3)

Piccola aggiunta: ogni evento del log deve includere specie e job dell'attore.

```json
{
  "actor_id": "unit_1",
  "actor_species": "velox",
  "actor_job": "skirmisher",
  ...
}
```

Questo campo non richiede logica nuova — è solo un arricchimento del log.
Serve perché i futuri indici VC devono poter distinguere pattern per specie/job.

---

## Guardrail — cosa NON toccare

```
❌ analytics/              — zero analytics senza almeno 3 session log reali
❌ .github/workflows/      — nessuna modifica CI
❌ ops/ / migrations/      — nessuna infra
❌ services/generation/    — non toccare il generatore specie
❌ packages/contracts/     — non aggiornare gli schemi condivisi
❌ Sistema VC (EMA, indici) — non implementare ancora, servono dati reali prima
```

**Nessuna nuova dipendenza npm o pip.**
**Se devi leggere più di 2 file YAML per implementare un trait, stai
sovra-ingegnerizzando. Ferma e segnala.**

---

## Pattern da evitare

- `"Implemento tutti i trait T1 mentre ci sono"` → no, 2 trait bastano per validare il sistema
- `"Costruisco il frontend Vue per visualizzare la griglia"` → no, non ancora
- `"Aggiungo il calcolo VC nel session log"` → no, prima accumula 3+ sessioni di dati grezzi
- `"Estendo la regola IA con priorità complesse"` → no, REGOLA_001 a 1 frase basta

---

## Segnali che stai andando nella direzione giusta

✅ Stai modificando file in `apps/backend/`, `engine/`, `traits/`
✅ `engine/sistema_rules.md` esiste con almeno REGOLA_001 scritta in italiano
✅ Il session log ha `trait_effects` e `actor_species` in ogni evento
✅ `curl .../api/session/start` → `curl .../api/session/action` → `curl .../api/session/turn/end`
funzionano in sequenza senza errori

---

## Issue collegate

Nessuna issue esistente copre queste feature — sono nuove.
Apri una issue per ognuna **solo dopo** che la fase è completata, come documentazione.
Non aprire issue preventive.

---

## Riferimenti

- **GDD**: https://github.com/MasterDD-L34D/Game/releases/tag/Info
  → sezione "Specie, Classi/Job e Tratti" per i campi morfologici
  → sezione "Tratti (da evoluzione)" per trigger e effetti T1
- **Trait YAML esistenti**: `traits/` + `data/core/traits/`
- **Regole sistema**: `engine/tri_sorgente/` (da esplorare prima di creare)
- **Session log di riferimento**: `logs/session_20260414_230422.json`
