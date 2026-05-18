# Runbook — M1 Combat Freeze closure + co-op playtest (TKT-M11B-06)

> **Cosa e' questo**: enablement runbook per la mossa max-leverage del
> first-principles verdict 2026-05-18 (close M1 -> playtest co-op live ->
> ri-derivare DF/Sistema da evidenza). **Proposta codemasterdd-side** (no
> merge auto; Game self-governed -- esegui/mergi tu). Ground-truth dal
> freeze-doc §1/§5 + MILESTONES_AND_GATES G2 + PILLAR-LIVE-STATUS P5.
> Io preparo, l'esecuzione (gate + playtest umano) e' tua.

---

## Stato di partenza (verificato 2026-05-18, gh-api origin/main)

- **M1 = Gate G2 "Combat Freeze"**: condizione formale = _"Combat canon
  unico, scope azioni chiuso, test combat e schema verdi"_
  (`docs/planning/EVO_FINAL_DESIGN_MILESTONES_AND_GATES.md` §3).
- Runtime canonical = **Node** `apps/backend/services/combat/` +
  `apps/backend/routes/session.js`. Python resolver DEPRECATO 2026-04-19
  (freeze §174) -- i pytest legacy NON sono il gate.
- Pillar canonical (`docs/reports/PILLAR-LIVE-STATUS.md`, SOT 2026-05-06):
  **5/6 🟢 + P3 🟡++, demo-ready confirmed**. P5 = 🟢 **cand**, gate finale
  = **TKT-M11B-06 playtest userland** (user-action only). NON 6/6-giallo
  (quel claim era fabbricazione, gia' corretto codemasterdd-side).

---

## PARTE 1 — Chiudere M1 (Gate G2)

Exit criteria G2 = combat canon unico + scope azioni chiuso + **test
combat e schema verdi**. Validator/smoke realmente presenti (freeze §5):

### Checklist closure

- [ ] **Combat canon unico**: confermare che `apps/backend/services/combat/`
  - `routes/session.js` sono l'unica fonte runtime; nessun path combat
    alternativo attivo (Python `services/rules/*` = solo spec storica,
    `services/rules/DEPRECATED.md`).
- [ ] **Scope azioni chiuso**: lista azioni combat congelata in
      `docs/combat/combat-canon.md` (no nuove azioni durante freeze).
- [ ] **Test combat verdi**:
  ```bash
  npm ci
  npm run test:stack          # AI tests + cross-stack
  node --test tests/api/contracts-combat.test.js
  node --test tests/api/contracts-trait-mechanics.test.js
  ```
- [ ] **Schema/dataset verdi**:
  ```bash
  python tools/py/game_cli.py validate-datasets
  python tools/py/game_cli.py validate-ecosystem-pack
  python tools/check_docs_governance.py        # docs schema+registry strict
  ```
- [ ] **Smoke combat**:
  ```bash
  bash scripts/run_deploy_checks.sh            # deploy gate
  # demo/smoke combat: vedi services/rules/demo_cli.py (legacy ref) +
  # apps/backend smoke gia' in test:stack
  ```
- [ ] Tutti verdi -> aggiornare `EVO_FINAL_DESIGN_MILESTONES_AND_GATES.md`
      G2 ☐ -> ☑ + nota evidenza (PR/commit + output) + flip eventuale
      `PILLAR-LIVE-STATUS` se cambia.

### Stop conditions

Se un test combat o schema e' rosso -> **NON chiudere G2**. Fix prima
(behavior-critical = gate, non bypass). Se ambiguo se un'azione e' "in
scope" -> decisione master-dd, non auto.

---

## PARTE 2 — Co-op playtest live (TKT-M11B-06)

**Gate finale P5** ("Sistema troppo passivo" e' la debolezza diagnosticata
in `docs/planning/2026-04-20-pilastri-reality-audit.md`). Chiude P5 🟢
cand -> 🟢 def. **User-action only** -- nessun agente puo' eseguirlo.

### Setup (ground-truth: 2-4 amici + ngrok + phone+TV)

1. Backend up: `npm run start:api` (Express :3334 + WS :3341).
2. Tunnel pubblico per gli amici remoti:
   ```bash
   ngrok http 3334        # OR cloudflared tunnel (vedi Godot-v2 named-tunnel)
   ```
3. Frontend: M11 stack lobby (WebSocket room-code) + TV view + phone
   composer. Condividi room-code agli amici (phone), TV = schermo condiviso.
4. Sessione: 2-4 player co-op vs Sistema, 1 missione a obiettivo completa
   (setup squad -> match -> debrief).

### Cosa OSSERVARE (il punto: solo umani-che-giocano lo rivela)

Il playtest non e' "funziona?" ma **"il Sistema e' davvero troppo
passivo come percepito da player reali?"** — la domanda che sblocca i
verdetti DF/Sistema (ADR-2026-05-18-sistema-persistent-state #2328).
Annota durante/dopo:

- [ ] Il Sistema **reagisce** alle tattiche del team in-match, o sembra
      flat/scriptato? (P5 core)
- [ ] La pressure-tier (Calm->Apex) e' **percepibile** dai player o
      invisibile/opaca?
- [ ] I player **sentono** un avversario o "muovono pedine"? (fantasy P5)
- [ ] Friction co-op: room-code/reconnect/TV-phone sync rotti?
- [ ] Quali momenti hanno generato storia spontanea (kill drammatico,
      ultima unita', sopravvivenza al pelo)? = evidenza pro/contro DF L0-L1.
- [ ] Serve davvero "Sistema che ricorda tra partite" (S7) o il problema
      e' **tuning in-match**? (questo decide #2328: se tuning -> C/defer
      confermato; se serve memoria -> ri-apri con requisito concreto).

### Output playtest -> decisioni sbloccate

Scrivi un debrief breve (anche 10 righe) in `docs/playtest/` con le
osservazioni sopra. Quel debrief e' l'**evidenza** che converte:

- P5: 🟢 cand -> 🟢 def (se co-op regge) o lista-fix concreta
- ADR #2328 Sistema S7: verdetto C/defer **confermato da evidenza**
  (non piu' speculativo) OPPURE requisito-persistenza concreto emerso
- DF L0-L1 (identita'/eventi): priorita' reale vs ipotesi

---

## Perche' questo ordine (non invertibile)

Il freeze (§1) fa di "combat resolver frozen" la **precondizione di tutto
il downstream**. Persistere/imparare da un combat non-frozen = build su
sabbia. Quindi: **G2 prima, playtest poi, decisioni DF/Sistema solo dopo
l'evidenza del playtest.** Nessun codice DF/Sistema prima di questo
(verdetto first-principles 2026-05-18, codemasterdd `STATUS_MULTI_REPO`
§DF + Decisione 009).

---

_Runbook enablement. Autorita': proposta operativa (A4-livello, "how").
Esecuzione gate G2 + playtest = master-dd/Eduardo (user-action). Rif:
freeze §1/§5, MILESTONES_AND_GATES G2, PILLAR-LIVE-STATUS P5,
codemasterdd Decisione 009._
