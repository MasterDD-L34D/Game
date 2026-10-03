---
title: 'Playbook co-op full loop — playtest live 2-4 amici post M16-M19'
workstream: playtest
category: playbook
status: draft
owner: master-dd
created: 2026-04-26
tags:
  - playtest
  - coop
  - m16
  - m17
  - m18
  - m19
  - full-loop
related:
  - docs/planning/2026-04-26-coop-mvp-spec.md
  - docs/process/sprint-2026-04-26-M16-M20-close.md
---

# Playbook co-op full loop — 2-4 amici

Checklist playtest post-M19 con flow nuovo (character→world→combat→debrief).

## Pre-session (T-10 min)

1. `git pull origin main` (deve avere commit 66d21e4c o successivo M19)
2. `npm run play:build` (sincronizza dist)
3. Doppio clic `Evo-Tactics-Demo.bat` sul Desktop → launcher auto
4. Apri URL ngrok stampato nel banner
5. Verifica flow solo su 2 browser (Incognito player) prima di invitare amici

## Flow atteso

### Fase 1 — Host crea stanza

- Click "Crea stanza" → codice 4-letter
- "Entra TV" → canvas + roster bottom-left
- Share URL copia-clipboard

### Fase 2 — Player join (2-4 amici)

- Apre URL con `?code=XXXX`
- Inserisce nome → "Entra"
- Phone overlay = attesa host

### Fase 3 — Character creation

- Host click "Nuova sessione" → overlay char_creation auto-mostrato
- Ogni player: nome + form (16 MBTI) + specie → "Conferma PG"
- TV roster: 🎭 per player ready
- Quando tutti ready: phase = world_setup auto

### Fase 4 — World setup

- Phone: card scenario proposto (default tutorial 01) + "D'accordo / Altro"
- Voti opzionali, host arbiter
- Host click "Nuova sessione" n.2 → `coopWorldConfirm` + combat

### Fase 5 — Combat

- Phone card PG + action tiles + target + ready broadcast + chat
- Host resolve round → auto round_clear → next planning
- Endgame auto-detect → `coopCombatEnd` → phase debrief

### Fase 6 — Debrief

- Phone: outcome victory/defeat + PG stats + narrative log eventi
- "Pronto" → `debrief/choice` submit
- All ready → next scenario OR ended

## Smoke checklist pre-amici

- [ ] Host crea stanza → codice visibile
- [ ] Player Incognito join → banner "📱 PLAYER · stanza XXXX · connesso"
- [ ] Host click "Nuova sessione" n.1 → log "🎭 Run co-op avviata"
- [ ] Player vede overlay purple char_creation
- [ ] Player sceglie form + specie + nome → "Conferma"
- [ ] Player vede "attendi altri"
- [ ] Host click "Nuova sessione" n.2 → log "✓ Scenario confermato"
- [ ] Player vede card PG combat + 5 action tiles
- [ ] Chat bidirezionale funziona
- [ ] Intent submit lock: bottone disabled post-invio
- [ ] Host roster ticks ✅/💭 update realtime
- [ ] Host round resolve → player vede turn+1
- [ ] Endgame → player vede overlay debrief ambra con narrative

## Metriche da catturare

| Metrica                             | Target       |
| ----------------------------------- | ------------ |
| RTT phase_change → render phone     | <500ms ngrok |
| Character submit → TV roster update | <1s          |
| Round submit → ready broadcast      | <500ms       |
| Drop WS → reconnect                 | <5s          |
| Fun rating 1-5 media                | ≥4           |

## Bug report template

Template `docs/playtest/templates/bug-report-template.md` (M11 kit).

Aggiungi context sprint:

```
- Sprint: M16-M20 full loop
- Phase attiva al bug: [character_creation|world_setup|combat|debrief]
- Overlay visible: [phv2|char|world|debrief|waiting]
- WS events ricevuti (da DevTools Network → WS):
```

## Follow-up post-playtest

- Se 3+ round completati senza crash + ≥2 amici + fun ≥4/5:
  - Bump Pilastro 5 🟢 definitivo
  - Update CLAUDE.md sprint context
  - Celebra 🎉
- Se bug trovati:
  - Open TKT-M21-\* per ciascuno
  - Pattern M3-M5 fix-first raccomandato

## Rollback

- Feature flag coop: setta `LOBBY_WS_SHARED=false` + riavvia → back a legacy single-host
- Revert PR #1724 (M19) → debrief phase sparisce, resto funziona

## Riferimenti

- Spec: [coop-mvp-spec.md](../planning/2026-04-26-coop-mvp-spec.md)
- Sprint close: [sprint-2026-04-26-M16-M20-close.md](../process/sprint-2026-04-26-M16-M20-close.md)
- Demo launcher: [2026-04-26-demo-launcher.md](2026-04-26-demo-launcher.md)
