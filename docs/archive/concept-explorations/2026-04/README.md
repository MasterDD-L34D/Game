# Handoff pack — Evo Tactics, 20 aprile 2026

Questa cartella contiene due documenti pensati per essere **copiati dentro il repo `Game/` come `docs/planning/`** e usati come guida per i prossimi passi con Claude Code.

## File

### 1. `2026-04-20-integrated-design-map.md`

Documento principale. È una **mappa integrata** che intreccia tre fonti canoniche (Final Design Freeze v0.9, Source of Truth v5, audit Pilastri + consolidato del 20 aprile) con il lavoro di concept-exploration fatto fuori repo (4 vertical-slice HTML + pitch deck v2).

È organizzato in 5 sezioni:

1. **Le tre fonti** — cosa dice ciascuna, con priorità relative.
2. **Matrice 6 Pilastri × stato runtime × stato doc** — tabella unica che sostituisce la confusione "dataset vs runtime vs claim".
3. **Lacune identificate** — 11 gap concreti, con owner e severity.
4. **Come il lavoro fuori repo (deck v2, 4 HTML) si aggancia** — dove le 3 exploration-note toccano P2 e dove invece sono rumore.
5. **Piano per Claude Code** — 4 prompt numerati, in ordine di dipendenza, copia-incolla.

### 2. `2026-04-20-archive-concept-explorations-readme.md`

README da mettere dentro `docs/archive/concept-explorations/2026-04/` insieme ai 4 HTML + deck v2. Spiega a chiunque apra quella cartella fra 3 mesi **cosa è canonico e cosa no**, e traccia il link alle 3 exploration-note che valgono un triage.

## Come usarli

1. Scarica questa cartella `handoff/` dal progetto.
2. Nel repo `Game/` locale, copia:
   - `2026-04-20-integrated-design-map.md` → `docs/planning/`
   - `2026-04-20-archive-concept-explorations-readme.md` → `docs/archive/concept-explorations/2026-04/README.md`
   - (E sposta lì dentro anche i 4 HTML vertical-slice + `Evo Tactics Pitch Deck v2.html` + `deck-assets/` + `deck-stage.js`, tutti scaricati da questo progetto.)
3. Commit:
   ```
   docs: integrated design map + archive April 2026 concept exploration
   ```
4. Apri Claude Code nel repo. Usa i prompt in **sezione 5** del documento integrato, in ordine.

## Cosa NON fare

- Non trattare la mappa integrata come canonica A1/A2. È un **documento di planning** (livello A3 come il Freeze, ma subordinato alla Source Authority Map). In caso di conflitto vince sempre il SoT o l'ADR rilevante.
- Non partire da prompt Claude Code senza prima mergiare questi due file. Claude Code ha bisogno del contesto scritto dentro il repo, non in una conversazione separata.
