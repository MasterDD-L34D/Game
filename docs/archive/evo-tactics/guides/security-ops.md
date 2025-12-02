---
title: Evo-Tactics · Security & Ops Playbook
description: Linee guida operative per audit, rotazione credenziali e response collegati al pacchetto Evo-Tactics.
tags:
  - evo-tactics
  - security
  - operations
archived: true
updated: 2025-12-02
---

# Security & Ops Playbook — Evo-Tactics

> **Nota archivio ROL-03 (2025-12-02):** questo playbook è stato spostato nella
> sezione `docs/archive/evo-tactics/guides/` e mantiene i riferimenti alle
> snapshot inventory in `docs/incoming/archive/2025-12-19_inventory_cleanup/`.

Questa guida consolida i controlli di sicurezza e le procedure operative dedicate al
pacchetto Evo-Tactics. Le indicazioni estendono la visione tattica descritta in
[`guides/visione-struttura.md`](visione-struttura.md) e sostituiscono il precedente
placeholder generale.

## 1. Scope & Responsabilità

| Squadra                  | Ruolo                                       | Artefatti collegati                                                                                        |
| ------------------------ | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Design Ops**           | Garantire coerenza dei deliverable.         | `docs/evo-tactics/README.md`, `docs/evo-tactics-pack/README.md`.                                           |
| **Security Engineering** | Esegue auditing e secret scanning.          | `incoming/lavoro_da_classificare/security.yml`, `incoming/lavoro_da_classificare/init_security_checks.sh`. |
| **Support/QA Bridge**    | Gestisce rotazione token e validazioni CLI. | `config/cli/support.yaml`, `docs/support/token-rotation.md`.                                               |

## 2. Workflow di validazione

1. **Pipeline CI** — la configurazione GitHub Actions in
   `incoming/lavoro_da_classificare/security.yml` esegue `bandit`, `npm audit` e
   `gitleaks` su `main` e `develop`. I report vengono salvati come artefatti.
2. **Audit locale** — `incoming/lavoro_da_classificare/init_security_checks.sh`
   produce report HTML/JSON in `reports/security/` replicando la pipeline CI.
3. **Allineamento telemetry** — eseguire `scripts/api/telemetry_alerts.py` in
   modalità lint (funzione `validate_alert_context`) sulle nuove missioni per
   assicurare soglie coerenti con `reports/trait_balance_summary.md`.
4. **Rotazione credenziali** — seguire la checklist documentata in
   `docs/support/token-rotation.md`, aggiornando `config/cli/support.yaml` con
   `last_completed` e `next_window`.

## 3. Controlli applicativi

| Controllo                | Obiettivo                                     | Script/Documento                                                                                            |
| ------------------------ | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Static Analysis**      | Individuare regressioni Python/Node.          | `incoming/lavoro_da_classificare/security.yml`, `reports/trait_balance_summary.md` (per correlare impatti). |
| **Trait Drift Alerting** | Normalizzare soglie e payload.                | `scripts/api/telemetry_alerts.py`, `reports/daily_tracker_summary.json`.                                    |
| **Vault & Token Ops**    | Assicurare rotazione settimanale dei segreti. | `docs/support/token-rotation.md`, `config/cli/support.yaml`.                                                |
| **Dataset Integrity**    | Validare YAML/JSON condivisi.                 | `incoming/docs/yaml_validator.py`, `reports/pathfinder_trait_gap.csv`.                                      |

## 4. Incident Response

- Aprire ticket con label `SEC-EVO` nel tracker e registrarlo in
  `reports/qa-changelog.md`.
- Collegare i log prodotti dagli script (`reports/security/*.json`) agli spazi
  condivisi, indicando riferimenti commit.
- Aggiornare il registro [`docs/archive/evo-tactics/integration-log.md`](../../archive/evo-tactics/integration-log.md)
  con il numero attività (DOC-XX) e le follow-up note.

## 5. Checklist di rilascio

- [ ] Verificare che `incoming/lavoro_da_classificare/security.yml` sia stato
      rieseguito con esito positivo (Bandit, npm audit, gitleaks).
- [ ] Aggiornare `reports/daily_tracker_summary.json` con l'esito degli alert
      drift/adozione.
- [ ] Documentare il turno di rotazione su `docs/support/token-rotation.md`.
- [ ] Archiviare eventuali placeholder rimossi in `docs/archive/evo-tactics/` con
      nota motivazionale.

**[END · Security & Ops Playbook]**
