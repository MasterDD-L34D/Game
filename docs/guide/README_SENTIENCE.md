---
title: Scala di senzienza T0–T6
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-05-06
source_of_truth: true
language: it-en
review_cycle_days: 14
---

# Scala di senzienza T0–T6

Questa nota operativa definisce il significato del campo `sentience_index` usato nelle schede Specie/Tratti e fornisce linee guida per assegnarlo in modo coerente.

Tassonomia canonica approvata: merge di README (T0) + RFC v0.1 (T1-T6). Vedi [Canonical Promotion Matrix](../core/00B-CANONICAL_PROMOTION_MATRIX.md) per la decisione.

## Definizioni sintetiche

- **T0 · Reattivo**: risposte puramente istintive/riflessive; nessuna pianificazione, linguaggio o uso intenzionale di strumenti. Pattern motorio ripetitivo, nessuna memoria episodica rilevante. Non partecipa come unità di combattimento.
- **T1 · Proto-Sentiente**: socialità minima; uso incidentale di strumenti; nessun linguaggio. Apprendimento associativo limitato, sfruttamento opportunistico dell'ambiente.
- **T2 · Pre-Sociale**: bande piccole; vocalizzazioni contestuali; uso opportunistico di strumenti. Riconoscimento di individui e memoria spaziale estesa.
- **T3 · Emergente**: ruoli embrionali; strumenti deliberati; attenzione condivisa. Problem solving multi-step, gerarchie sociali strutturate, segnali proto-linguistici.
- **T4 · Civico**: ruoli sociali definiti; artigianato strutturato; proto-canoni. Linguaggi convenzionali condivisi, trasmissione intergenerazionale, rituali.
- **T5 · Avanzato**: istituzioni; linguaggio semantico; archivi. Tecnologia modulare, teoria della mente, pianificazione a lungo termine.
- **T6 · Sapiente**: scrittura; legge; scienza. Civiltà completa. Capacità di modificare sistematicamente ecosistemi e modellare scenari futuri.

## Linee guida d'uso

- Assegna `sentience_index` **solo alle specie** (non ai tratti) e mantieni valori coerenti in tutti i file correlati (`species/*.json`, ecotipi, cataloghi aggregati).
- Prediligi il **livello minimo sufficiente**: se una specie mostra occasionali abilità del tier superiore ma non le sostiene in modo affidabile, usa il tier inferiore.
- Documenta nel campo `interactions` o `constraints` eventuali **abilità borderline** (es. T2 che impara un trucco T3 con addestramento) senza alzare il tier.
- Se un tratto implica un salto di senzienza (es. interfaccia neurale), verifica che **ecotipi e varianti** riflettano la stessa scelta oppure motivino deviazioni locali.
- Nelle esportazioni o report statistici, conserva i valori testuali `T0`…`T6` e usa fallback `Unknown` solo per dati incompleti; evita numeri interi o scale alternative.
- **T0** non ha un combat tier corrispondente — le creature T0 non partecipano come unità nelle sessioni tattiche.

## Mapping verso sistemi correlati

| Sistema                      | Range usato     | Note                         |
| ---------------------------- | --------------- | ---------------------------- |
| `schemas/evo/enums.json`     | T0-T6           | Validazione specie/tratti    |
| `schemas/core/enums.json`    | T0-T6           | Validazione core             |
| `combat.schema.json` tier    | 1-6 (integer)   | Solo unità combattenti (T1+) |
| `data/external/evo/species/` | T0-T3 (attuale) | Estendibile fino a T6        |

## Storico

- **v1 (pre-2025-10)**: T1-T6 nella RFC draft (`docs/planning/research/sentience-rfc/`)
- **v2 (2025-10 — 2026-04)**: T0-T5 in questa guida (README)
- **v3 (2026-04-16)**: T0-T6 canonico — merge T0 da README + T1-T6 da RFC
