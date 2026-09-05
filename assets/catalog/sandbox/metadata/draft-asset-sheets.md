# Schede Asset (Draft) – Sandbox Catalog

Stato: draft. Annotare sostituzioni necessarie prima del rilascio.

## UI – Pulsante Primario

- **Percorso atteso**: `assets/catalog/sandbox/production/ui/ui-button-primary-final-v01.png`
- **Stato**: placeholder grafico da sostituire
- **Descrizione**: Pulsante principale per menu HUD (stato normale/hover/pressed).
- **Dimensioni target**: 320x96 px @1x; esportare anche @2x.
- **Palette**: blu elettrico (#4DB7FF) con bordo acciaio; testo bianco.
- **Dipendenze grafiche**: font "Orbitron" (verificare licenza); shader bordo glow (engine VFX standard).
- **Dipendenze audio**: richiede SFX click UI (`audio-sfx-button-metal-final-v01.ogg`).
- **Placeholder da sostituire**: attuale asset `ui-button-primary-placeholder-v00.png` (nessuna licenza per ship); manca stato pressed.
- **Export note**: PNG 32bit, 9-slice 12px; compressione lossless.
- **Checklist**:
  - [ ] Sostituire placeholder con layout definitivo e aggiornare stato pressed.
  - [ ] Confermare licenza font o sostituire con font interno.
  - [ ] Aggiornare nome file a `-final` e versione `v01` dopo approvazione.

## VFX – Esplosione Plasma

- **Percorso atteso**: `assets/catalog/sandbox/production/fx/fx-plasma-explosion-final-v01.webp`
- **Stato**: wip con placeholder audio
- **Descrizione**: Effetto esplosione al plasma (12 frame, 30fps) per abilità alto impatto.
- **Dimensioni target**: atlas 512x512 px, canale alpha premoltiplicato.
- **Palette**: turchese → magenta con bagliore bianco.
- **Dipendenze grafiche**: shader additive + bloom (engine); richiede controllare compatibilità mobile.
- **Dipendenze audio**: SFX placeholder `audio-sfx-plasma-explosion-placeholder-v00.wav` (da rimpiazzare con versione finale compressa in .ogg).
- **Placeholder da sostituire**: SFX esplosione, prima parte della scia manca luce secondaria (frame 7-9).
- **Export note**: WebP qualità 90, loop disattivato, frame sequence name `fx-plasma-explosion-final-v01_f{00..11}.png`.
- **Checklist**:
  - [ ] Produrre SFX finale e aggiornare dipendenza audio a `-final-v01.ogg`.
  - [ ] Rifinire frame 7-9 con glow secondario; validare in engine a 30fps.
  - [ ] Verificare dimensione atlas <512KB dopo compressione.

## Audio – Loop Esplorazione Bioma Arido

- **Percorso atteso**: `assets/catalog/sandbox/audio/audio-loop-arid-exploration-final-v01.ogg`
- **Stato**: concept / placeholder musicale
- **Descrizione**: Loop ambiente leggero per esplorazione bioma arido (pad granulare + percussioni leggere).
- **Durata target**: 0:45–1:00, loop seamless.
- **Palette sonora**: -16 LUFS target, taglio 120Hz per evitare rimbombo.
- **Dipendenze grafiche**: nessuna.
- **Dipendenze audio**: layer vento `audio-sfx-wind-sand-placeholder-v00.wav` (da sostituire con registrazione proprietaria), plugin riverbero "PlateSpace" (licenza in verifica).
- **Placeholder da sostituire**: layer vento e sample percussivo stock (licenza CC BY, richiede attribuzione: valutare sostituzione interna).
- **Export note**: OGG q6, mono, normalizzare a -1 dBTP; fornire anche stems WAV in `concept/`.
- **Checklist**:
  - [ ] Registrare vento proprietario e aggiornare layer a `audio-sfx-wind-sand-final-v01.ogg`.
  - [ ] Rimpiazzare percussioni stock con libreria interna o confermare attribuzione.
  - [ ] Verificare loop seamless e loudness integrato (-16 LUFS) prima del merge.

## HUD Icon – Energia Overcharge

- **Percorso atteso**: `assets/catalog/sandbox/production/icon/ui-icon-overcharge-final-v01.png`
- **Stato**: wip grafico, placeholder assente
- **Descrizione**: Icona HUD per stato "Overcharge" (energia elettrica, bordo dorato).
- **Dimensioni target**: 128x128 px (fit in 96x96 safe area), versione @2x.
- **Palette**: turchese/verde neon con bagliore arancio.
- **Dipendenze grafiche**: font simbolico interno per glifi overlay; shader outline.
- **Dipendenze audio**: nessuna.
- **Placeholder da sostituire**: aggiungere alone di bloom; verificare coerenza con set iconico HUD.
- **Export note**: PNG 32bit, background trasparente, linea 2px.
- **Checklist**:
  - [ ] Finalizzare glow e outline coerenti con altre icone HUD.
  - [ ] Validare leggibilità a 64px e 48px.
  - [ ] Aggiornare stato a `-final` e versione `v01` dopo approvazione art lead.
