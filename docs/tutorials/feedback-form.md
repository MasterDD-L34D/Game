# Tutorial · Form feedback unificato

Questa guida illustra come accedere, compilare e monitorare il nuovo form di feedback introdotto con la pipeline descritta in `docs/process/feedback_collection_pipeline.md`.

## 1. Accesso al form
- **Dashboard documentazione**: link rapido nel menu "Supporto" → "Invia feedback".
- **Webapp di playtest**: pulsante `Invia feedback` in basso a destra, sincronizzato con questa configurazione.
- **CLI**: eseguire `python tools/py/game_cli.py feedback --open-form` per aprire l'URL precompilato.

> Il form è ospitato nell'app Notion condivisa del team. Copia sempre l'URL generato dal comando CLI per includere l'ID build.

## 2. Compilazione step-by-step
1. **Contesto build**
   - `build_version`: seleziona dal menu la build in test (es. `v0.8.3-nightly`).
   - `platform`: indica il device principale (`pc`, `steamdeck`, `cloud`).
   - `session_type`: scegli tra `playtest_guidato`, `regressione`, `sandbox`.
2. **Scenario e feature**
   - `scenario_slug`: inserisci l'identificativo scenario (`badlands_intro`, `nido_difensivo`).
   - `feature_area`: scegli la categoria (gameplay, tecnica, narrativa, ux).
   - `mutations_tested`: elenca i trait o mutazioni principali coinvolte e aggiungi tag come `hud_canary` o `squadsync_adaptive` se rilevanti.
3. **Valutazione**
   - `severity`: scala 1-4 (1 = suggerimento, 4 = blocco).
   - `impact_scope`: indica se impatta `solo_party`, `biome`, `metagame`.
   - `confidence`: 1-5 sulla riproducibilità.
4. **Dettagli e allegati**
   - `summary`: descrizione breve (max 120 caratteri).
   - `description`: dettaglia i passi per riprodurre l'anomalia o il feedback.
   - `attachments`: incolla link a video, log o screenshot.
5. **Follow-up opzionale**
   - `requires_followup`: seleziona se desideri aggiornamenti.
   - `contact`: email o handle Discord/Slack.

## 3. Linee guida qualitative
- Preferisci **descrizioni osservabili** alle interpretazioni (es. "la mutazione non attiva il bonus" invece di "non funziona").
- Se il problema è critico (`severity >= 3`), fornisci sempre **passi di riproduzione** e, se possibile, un log estratto.
- Seleziona `sandbox` solo per sessioni esplorative; per regressioni indica sempre la build di riferimento.

## 4. Dopo l'invio
- Riceverai una conferma via email con l'ID feedback (es. `FDB-2024-051`).
- Quando il feedback entra nel backlog, l'owner aggiorna lo stato in `tools/feedback/collection_pipeline.yaml`.
- Puoi monitorare i progressi nel report settimanale pubblicato in `docs/playtest/INSIGHTS-2025-11.md`.

## 5. Risoluzione dei problemi
- **Il form non carica?** Verifica la VPN aziendale; il dominio Notion è accessibile solo da IP autorizzati.
- **Non trovi la build in elenco?** Apri un ticket in `#feedback-enhancements` con l'ID commit e l'ambiente.
- **Serve supporto audio/video?** Allegare file superiori a 50MB direttamente su Drive e incollare il link con permessi `comment`.

## 6. Link utili
- Configurazione del form: [`tools/feedback/form_config.yaml`](../../tools/feedback/form_config.yaml)
- Pipeline di raccolta: [`docs/process/feedback_collection_pipeline.md`](../process/feedback_collection_pipeline.md)
- Changelog delle revisioni: [`docs/changelog.md`](../changelog.md)
