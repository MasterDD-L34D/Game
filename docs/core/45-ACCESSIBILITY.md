---
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-07-10'
source_of_truth: true
language: it
review_cycle_days: 90
---

# Accessibilita' -- baseline v1 (EA)

Authority operativa per l'accessibilita'. Consolida le decisioni della SoT sez.18.2
(2026-04-16) e la baseline decisa nella spec studio-track (2026-07-10). Scope: EA
Steam, PEGI16, TV-first + companion. Dichiarata BASELINE, non certificazione.

## Visivo

- **Colorblind-safe al lancio** (WCAG 2.1 AA): telegraph e status mai codificati dal
  SOLO colore -- palette safe + shape-coding (icona/forma distinta per panic,
  disorient, bleed, telegraph hidden/attack). Riferimento contrasto: testo 4.5:1.
- **Text scaling TV** (10-foot UI): font grande di default, scala testo regolabile;
  nessuna informazione load-bearing sotto la soglia leggibile dal divano.
- **Indicatori visivi per eventi sonori** (deaf/HoH): critico, status applicato,
  wave/rinforzo spawn, turno nemico, StressWave (lista sincronizzata con
  `draft-audio-design.md` sez. Gap chiusi).

## Input

- Controller primary (TV-first, D-pad), keyboard fallback (PC), touch companion.
- **Remapping controlli**: previsto al lancio.

## Difficolta'

- Scaling enemy count esistente (Easy 0.7x / Normal 1.0x / Hard 1.3x, SoT sez.15.4).
- Le sconfitte by-design (simmetria flag-ON) restano: la leggibilita' P1 e' il
  guardrail, non la riduzione di difficolta' nascosta.

## Fuori scope v1

- Text-to-speech (post-lancio), sottotitoli (nessun voice-over, SoT sez.19 Q19),
  screen-reader companion (valutazione post-EA), surround/3D audio.

## Mappa implementativa

| Requisito                  | Superficie                          | Stato          |
| -------------------------- | ----------------------------------- | -------------- |
| Colorblind palette + shape | Godot-v2 combat HUD, telegraph      | da pianificare |
| Text scaling               | Godot-v2 theme                      | da pianificare |
| Indicatori eventi sonori   | Godot-v2 combat HUD                 | da pianificare |
| Remapping                  | Godot-v2 settings + companion input | da pianificare |
| Difficulty scaling         | backend (esistente, sez.15.4)       | LIVE           |
