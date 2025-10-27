# Walkthrough video demo — Preset "Bundle demo pubblico"

## Obiettivi
- Evidenziare la generazione ecosistema con preset demo e pannelli guida.
- Mostrare la catena export (dossier HTML/PDF + press kit) come materiale condivisibile.
- Integrare cue telemetrici e HUD live per allineare marketing/QA.

## Sequenza narrativa (15 minuti)
1. **Hook & contesto (0:00-1:00)**
   - Overlay intro con il badge `Preset · Bundle demo pubblico`.
   - Richiamare il perché: onboarding <10 minuti per squadre 3-4 giocatrici.
2. **Dashboard overview (1:00-3:00)**
   - Navigare `docs/index.html` mostrando anchor `#overview` → `#updates`.
   - Sottolineare i token coerenti con `public/` (accent blu, superfici soft).
3. **Generazione ecosistema (3:00-7:00)**
   - Aprire `docs/evo-tactics-pack/generator.html` e selezionare preset demo.
   - Mostrare pannelli `composer` e `export` (focus su synergy radar & preset list).
   - Annotare come il filtro ruoli/tag aggiorna i preset suggeriti.
4. **Dossier & press kit (7:00-10:00)**
   - Aprire il nuovo dossier HTML generato (`docs/presentations/showcase/evo-tactics-showcase-dossier.html`).
   - Mettere in evidenza la corrispondenza con la cover SVG (`public/showcase-dossier.svg`) e l’export PDF (decodifica Base64) per mostrare il flusso completo.
   - Richiamare il comando `python tools/py/build_showcase_materials.py` per aggiornare asset live.
5. **Encounter spotlight (10:00-12:00)**
   - Zoom sulla sezione seed: "Tempesta Ferrosa" → spiegare hook per livestream.
   - Collegare i beat alle telemetrie/HUD (richiamare `public/embed.js`).
6. **Chiusura e CTA (12:00-15:00)**
   - Ripassare la call-to-action: condividere HTML/PDF, pianificare retro.
   - Invitare a compilare feedback via `docs/checklist/demo-release.md` nuova sezione review.

## Script parlato sintetico
- "Benvenuti nell'ecosistema Alpha: in 90 secondi entriamo nel preset demo pubblico."
- "Guardate come il composer suggerisce combinazioni con sinergia >70% mentre aggiorniamo ruoli e tag."
- "Il dossier HTML/PDF è pronto alla condivisione: stessi token grafici della landing, CTA evidenziate."
- "Chiudiamo con i seed dinamici: Tempesta Ferrosa e Nodo Sinfonico guidano la regia della live."

## Asset da preparare
- Slide di opening/closing con badge e metriche principali.
- Browser window pulita con i pannelli `composer`, `export`, `dossier` già pre-caricati.
- Overlay streaming con timeline della demo e indicatori telemetrici (ripresi da `public/`).

## Next step
- Registrare prova tecnica (screen capture 1080p) entro 48h.
- Condividere script + registrazione grezza in `docs/presentations/assets/` e linkare in `docs/changelog.md`.
- Allineare con marketing per scaletta Q&A live.
