---
title: <PROJECT> archive manifest — <KILL_NAME> <DATE>
doc_status: archived
doc_owner: <maintainer>
workstream: cross-cutting
last_verified: <YYYY-MM-DD>
source_of_truth: false
language: it-en
review_cycle_days: 180
---

# <PROJECT> archive — <KILL_NAME> <DATE>

> Template da copiare in `docs/archive/<PROJECT>-<kill-slug>-<date>/MANIFEST.md` quando archivi decisioni kill/keep.

## Contesto

<Descrivi brevemente la decisione di kill / archive. Es: "Research critico su X ha evidenziato voto 4/10. Kill N%.">

Vedi [PR #<NUM>] per commit.

## Sources che hanno guidato la decisione

MUST READ prima di eventuale re-open:

1. <URL 1> — <titolo>
2. <URL 2> — <titolo>
3. <URL 3> — <titolo>

Lista completa (se >5): `~/.claude/projects/<proj>/memory/reference_<asset>_guide.md`

---

## Classification framework 4D (Flint standard)

Ogni asset archiviato classificato su:

- **Valore scope**: 🟢 alto · 🟡 medio · 🔴 basso
- **Applicabilità**: universal / gamedev / data-ops / solo-dev-only / single-user / <project>-only
- **Stato sviluppo**: production / experimental / draft / deprecated / consolidated / killed
- **Re-open cost**: XS (<30min) / S (≤2h) / M (≤1gg) / L (>1gg)

---

## Inventario

### Code rimosso

#### 1. `code/<filename>` — <descrizione breve>

| Dimensione     | Valore                             |
| -------------- | ---------------------------------- |
| Valore scope   | 🔴 / 🟡 / 🟢                       |
| Applicabilità  | <categoria>                        |
| Stato sviluppo | deprecated / killed / consolidated |
| Re-open cost   | XS / S / M / L                     |

**Cosa fa**: <descrizione tecnica 1-2 righe>

**Perché killed**: <motivazione con citazione fonte>

**Re-open condition**: <quando ri-attivare esplicito>

### Memory / skills / doc rimossi

<Ripeti pattern sopra per ogni asset archiviato>

---

## Decisione gate (memorizzato per futuro)

**Data decisione**: <YYYY-MM-DD>
**Autore**: <user> + <AI assistant>

**Condizioni re-open parziale**:

1. <asset 1> → solo se <condizione>
2. <asset 2> → solo se <condizione>

**Condizioni re-open totale**:

- <utente esplicito>
- <bisogno concreto>
- <budget tempo allocato>

**Condizioni kill-100 (cancellazione totale)**:

- <N> giorni senza uso
- Tempo manutenzione > <soglia>/settimana
- <altro segnale abbandono>

---

## Come rileggere questo archive

- **Chi**: maintainer + AI assistant al prossimo research su dominio correlato
- **Quando**: se si manifesta pain reale non coperto da tool attuali
- **Come**: leggi sources → valuta re-open condition → decidi ri-attivare parte specifica

---

## Sessione storica (contesto)

- **Data**: <YYYY-MM-DD>
- **PR coinvolte**: #<NUM>, #<NUM>
- **Decisione**: basata su <agent critique / literature / adopter feedback>
- **Risultato netto**: <sintesi>
