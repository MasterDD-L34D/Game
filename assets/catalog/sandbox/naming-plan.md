# Sandbox Naming Plan

## Scopo

Linee guida provvisorie per denominare e organizzare asset visivi/audio in `assets/catalog/sandbox/` prima del rilascio. Le regole coprono naming, versioning e gestione dei placeholder.

## Struttura cartelle suggerita

- `concept/` – schizzi, moodboard, palette.
- `production/` – sprite, icone, VFX esportati.
- `audio/` – SFX e loop musicali.
- `placeholders/` – elementi temporanei da sostituire.
- `metadata/` – schede e checklist (Markdown/JSON).

## Convenzioni di naming

- Usa snake-case, prefisso per categoria e suffisso di stato.
- Formato generale: `{ambito}-{sottoambito}-{oggetto}-{stato}-v{nn}.{ext}`
  - `ambito`: ui, unit, env, fx, audio.
  - `sottoambito`: screen, icon, ability, biome, loop, sfx.
  - `oggetto`: nome descrittivo breve.
  - `stato`: concept, wip, final, placeholder.
  - `v{nn}`: due cifre per versioning (es. v01, v02).
- Esempi:
  - `ui-screen-loadout-background-final-v01.png`
  - `fx-ability-plasma-lance-final-v02.webp`
  - `audio-sfx-button-metal-placeholder-v00.wav`

## Formati file

- Immagini: preferisci `.png` per UI/2D, `.webp` per VFX leggeri, `.psd/.kra` per sorgenti in `concept/` (non committare file >25MB senza accordo).
- Audio: `.wav` per editing, `.ogg` o `.mp3` per runtime. Mantieni 44.1kHz, 16 bit mono per SFX UI.

## Versioning e varianti

- Incrementa `v{nn}` per modifiche rilevanti; usa suffisso `-alt{n}` per varianti cromatiche o layout.
- Se il file è un placeholder, mantieni `-placeholder` fino alla sostituzione e registra la dipendenza nella scheda asset.

## Metadati minimi da annotare

- Autore o fonte (se stock/CC con link licenza).
- Stato: concept / wip / final / placeholder.
- Palette o temperatura colore (se rilevante per coerenza HUD/biomi).
- Dipendenze grafiche/audio (es. shader, font, librerie SFX) e note di export (dimensioni, fps, compressione).

## Checklist placeholder → asset finale

- [ ] Confermare copyright e licenza (niente asset non verificati nel branch principale).
- [ ] Allineare risoluzione ai target (UI: 1080p/1440p scaling; VFX: atlas 512/1024 px multipli di 2).
- [ ] Verificare loop seamless per audio (no clip, normalizzare a -14 LUFS per musica, -10 dB peak per SFX UI).
- [ ] Aggiornare naming da `-placeholder` a `-final` e incrementare versione.
- [ ] Aggiornare scheda asset in `metadata/` con nuovo percorso e parametri export.
