---
title: Tutorial rapido — Feedback Idea Engine
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-05-06
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Tutorial rapido — Feedback Idea Engine

![Idea Engine feedback](../../assets/tutorials/idea-engine-feedback.svg)

## Obiettivo

Attivare il flusso completo di ideazione e invio feedback sfruttando l'API Express e il canale Slack dedicato.

## Passaggi

1. **Avvio backend** — dalla root del progetto lancia `npm run start:api` per esporre il servizio su `http://0.0.0.0:3333`.
2. **Invio idea** — visita `docs/ideas/index.html`, compila il form e invia al backend (verifica l'ID restituito nel riepilogo).
3. **Feedback potenziato** — usa il modulo dedicato o passa dal canale `#feedback-enhancements` per discutere follow-up e allegare materiali.

## Consigli

- Imposta `IDEA_WIDGET_CONFIG.apiBase` su `http://localhost:3333` se apri il form fuori dal repo.
- Conserva i log in `logs/idea_engine/feedback/` (cartella versionata nel repo) per tracciare suggerimenti e output codificati.
  Crea un file per ogni sessione usando lo schema `feedback-YYYYMMDD.md` e allega estratti rilevanti del canale Slack.
