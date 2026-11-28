---
name: Ammetti incompletezza + re-investigate su challenge utente
description: Se utente chiede "hai fatto tutto X?", "controllato bene?", "è rimasto qualcosa?", NON rispondere difensivo. Ri-investiga con find + glob + grep fresh.
type: feedback
---

Pattern osservato 3+ volte sessione 2026-04-18:

- "di prima hai fatto tutto F?" → scoperto: solo A fatto
- "c'è anche un'altro caveman nel repo?" → scoperto: 3 + 1 extra
- "controlla ancora meglio!" → scoperto: 6 componenti, non 3

**Rule**: utente con trigger phrase di verifica/sfida:

- "hai fatto tutto X?"
- "controllato bene?"
- "è rimasto qualcosa?"
- "aspetta ma non hai controllato..."
- "controlla ancora meglio"

→ **NON** rispondere "sì tutto fatto" senza verifica.

**Protocollo**:

1. Stop response draft
2. Run re-investigation: glob + grep + ls + git log sul dominio
3. Confronta output vs claim
4. Ammetti esplicito se mismatch
5. Forniré mappa completa (tabella se >3 item)
6. Proponi azione concreta

**Why**: user pattern double-check documentato. Senza re-investigate, AI rischia mentire involontariamente. User premia onestà ("aspetta non hai controllato" → 4 PR aggiuntive di fix). Costo re-invest < 30s.

**How to apply**:

- Primo istinto "sì fatto" → override con find/glob/grep check
- Scrivi tabella "Atteso vs Trovato" se mismatch
- Ammissione breve, neutra, no self-flagellation
- Dopo ammissione → pianifica recovery concreto

**NON applicare**:

- Domanda è info-request non challenge ("quanti test?") → rispondi diretto
- Utente chiede stato live (usa `evo-tactics-monitor`)
- Lavoro appena finito + verificato UI → rispondi diretto

---

**[ARCHIVED 2026-04-18]** Consolidato in `feedback_claude_workflow_consolidated.md` sezione 7.
