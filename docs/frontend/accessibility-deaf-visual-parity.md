---
title: 'Accessibility — Deaf/HoH Visual Parity Matrix'
doc_status: active
doc_owner: ui-team
workstream: atlas
last_verified: 2026-04-17
source_of_truth: false
language: it
review_cycle_days: 30
---

# Accessibility — Deaf/HoH Visual Parity Matrix

**Stato**: 🟢 ACTIVE — approvato Master DD 2026-04-17 (Q-001 T1.3)
**Branch**: `explore/open-questions-triage` (Q-001)
**Risolve**: A8 (SoT §18.2 — "Indicatori visivi per eventi sonori importanti")
**Policy di riferimento**: WCAG 2.1 AA (SC 1.2.1, 1.2.2, 1.4.7)

## Principio

**Nessun gameplay solo-audio.** Ogni evento che produce feedback sonoro rilevante per la decisione tattica deve avere un indicatore visivo equivalente, sempre attivo (non solo in Deaf mode).

"Deaf mode" = **enhancement** degli indicatori visivi (persistenza più lunga, dimensioni maggiori, opzionale flash), non loro creazione da zero.

## Matrice eventi → sonoro → visuale

### Eventi tattici critici

| Evento                                | Sonoro                   | Visuale default                             | Deaf mode enhancement        | Priority |
| ------------------------------------- | ------------------------ | ------------------------------------------- | ---------------------------- | -------- |
| Turno nemico inizio                   | Stinger basso            | Banner `TURNO SISTEMA` + border highlight   | Persiste 2s, flash opzionale | P0       |
| Attacco in arrivo (reactive window)   | Whoosh ascendente        | Freccia direzionale + timer ring            | Freccia pulsa 3 cicli        | P0       |
| Hazard trigger                        | Drone grave              | Icona hazard lampeggia sulla cella          | +ring espandente             | P0       |
| HP <= 30% critico                     | Heartbeat loop           | Border rosso unità + icon pulsar            | Icon più grande, lampeggio   | P0       |
| Status applicato (panic/rage/stunned) | Sfx specifico per status | Icona status sopra unità + ping             | Icona animata + label testo  | P0       |
| Colpo critico (MoS >= 10)             | Crit sfx                 | Damage number gialla bold + shake           | + schermata flash brief      | P1       |
| Mancato (miss)                        | Air whiff                | Damage number `MISS` grigio                 | + simbolo ✕ breve            | P1       |
| Wave spawn                            | Horn                     | Marker spawn sulla minimappa + ping caselle | Minimap highlight 3s         | P0       |
| Obiettivo progress (capture tick)     | Tick ascendente          | Progress bar obiettivo si riempie           | +number label tick           | P1       |
| Obiettivo complete                    | Fanfare                  | Full-screen banner                          | Banner persiste 3s           | P0       |
| Objective fail                        | Drone discendente        | Full-screen banner rosso                    | Banner persiste 3s + icon    | P0       |
| Parata riuscita                       | Clang                    | Icona scudo + number reduzione              | Icon pulsa                   | P1       |
| Counter attack                        | Riff ascendente          | Freccia rossa retroagente + damage          | Freccia più spessa           | P1       |

### Eventi narrativi / ambiente

| Evento                | Sonoro            | Visuale default                     | Deaf mode enhancement | Priority |
| --------------------- | ----------------- | ----------------------------------- | --------------------- | -------- |
| Briefing inizio       | Ambient music cue | Pannello Ink + transition           | — (testo primary)     | P2       |
| Debrief inizio        | Music swell       | Panel debrief + transition          | — (testo primary)     | P2       |
| StressWave trigger    | Rumble            | Schermata scuote + border arancione | Scake più lungo       | P1       |
| Director event        | Whisper/sting     | Icon Sistema lampeggia top-right    | Icon + testo breve    | P1       |
| Creature vocalization | Varia per specie  | Speech bubble tratto specifico      | Bubble persiste       | P2       |

### Eventi UI / feedback

| Evento            | Sonoro     | Visuale default                | Deaf mode enhancement  | Priority |
| ----------------- | ---------- | ------------------------------ | ---------------------- | -------- |
| Menu navigate     | Click      | Highlight focus selettore      | —                      | P3       |
| Action confirm    | Thump      | Flash pulsante + SFX           | +ring brief            | P2       |
| Action invalid    | Error buzz | Scuoti pulsante rosso + icon ✕ | Testo tooltip "motivo" | P1       |
| Save successful   | Chime      | Toast "Salvato" + icon ✓       | Toast persiste 2s      | P2       |
| PT economy change | Coin flip  | Counter animato                | Number cambia bold     | P2       |

## Settings Accessibility (proposta)

```yaml
# data/core/ui/accessibility.yaml (DRAFT)
accessibility:
  deaf_hoh:
    enabled: false # toggle master
    persist_multiplier: 2 # durata indicatori ×
    flash_enabled: true # flash schermata su P0 eventi
    icon_scale: 1.3 # dimensione icone status/turni
    subtitle_all_sfx: false # subtitle verbale per ogni SFX (experimental)
  colorblind:
    enabled: false
    mode: none|protanopia|deuteranopia|tritanopia
    pattern_overlay: false # pattern distintivi oltre colore
  font:
    size_multiplier: 1.0 # TV-safe default = 1.0 (large baseline)
    dyslexia_friendly: false
  motion:
    reduce_animations: false
    reduce_shake: false
```

## Validation plan

### Fase 1 — Asset audit (1 settimana)

- [ ] Inventario completo SFX attuali (probabilmente: zero, fase pre-audio)
- [ ] Per ogni evento tabella sopra: conferma esistenza visuale default
- [ ] Identifica gap dove solo sonoro è previsto → blocker

### Fase 2 — Playtest Deaf simulation (2 settimane)

- Muta completamente audio durante playtest N=5
- Tracking: abbandoni, decisioni sbagliate, momenti di confusione
- Success criterion: tempo-per-decisione ≤ +15% vs audio on
- Fail criterion: partecipante abbandona per confusion ≥ 1 volta

### Fase 3 — Implementation gate

Prima di shippare:

- Ogni evento P0 ha visuale funzionante anche con audio off
- Deaf mode toggle cambia SOLO enhancement, non aggiunge feature mancanti
- Subtitle SFX (subtitle_all_sfx) come opt-in experimental

## Cross-reference

- SoT §18.2 — decisione "Indicatori visivi per deaf/HoH: sì"
- SoT §19 Q23 — "Indicatori deaf: Visivi per eventi sonori"
- SoT §19 Q19 — "Voice-over o testo: Solo testo" (sottotitoli per dialogo = risolti)
- WCAG 2.1 AA — SC 1.2.1 (Audio-only prerecorded), SC 1.2.2 (Captions), SC 1.4.7 (Low or no background audio)

## Decisione Master DD (2026-04-17) — Q-001 T1.3

- Matrice eventi coverage: **SI** — 13 tattici + 5 narrativi + 5 UI confermati
- Priority P0-P3: **SI** — assegnazioni confermate
- Playtest Deaf simulation: **POST-M4** — fase validation dopo vertical slice

Follow-up branch: `feat/a11y-ui` (Settings panel) dopo T1.2 approve.
