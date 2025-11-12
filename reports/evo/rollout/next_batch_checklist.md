---
title: Checklist operativa rollout Evo-Tactics
description: Attività da collegare al board roadmap per i prossimi batch documentali.
tags:
  - evo-tactics
  - rollout
  - checklist
updated: 2025-12-19
---

# Checklist operativa rollout Evo-Tactics

## Preparazione batch

- [ ] Rieseguire `python3 scripts/evo_tactics_metadata_diff.py --output reports/evo/rollout/documentation_diff.json` e allegare il JSON aggiornato alla card roadmap.
- [ ] Validare i link della documentazione con `npm run docs:lint` e archiviare l’esito in `reports/evo/qa/docs.log`.
- [ ] Aggiornare la wiki interna (Notion/Confluence) con gli anchor ID introdotti nelle guide consolidate.
- [ ] Sincronizzare il registro `reports/evo/inventory_audit.md` con le nuove destinazioni archivio.

## Comunicazioni

- [ ] Inviare recap settimanale ai team Design, QA, Telemetria e Security con link al report `reports/evo/rollout/documentation_gap.md`.
- [ ] Programmare sessione di onboarding per illustrare la checklist frontmatter/anchor ai nuovi maintainer.
- [ ] Aggiornare il canale #evo-tactics con eventuali breaking changes individuati dal diff automatico.

## Verifiche post-rilascio

- [ ] Confermare che gli script `make update-tracker` e `tools/automation/update_tracker_registry.py` leggano i nuovi path consolidati.
- [ ] Tracciare le modifiche nel registro `docs/archive/evo-tactics/integration-log.md` con tag DOC-XX e link al commit.
- [ ] Pianificare audit successivo (T+14 giorni) per verificare l’applicazione dei reindirizzamenti nelle piattaforme legacy.
