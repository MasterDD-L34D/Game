---
title: Style Guide — Nomi & Descrizioni (Specie & Tratti)
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-05-06
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Style Guide — Nomi & Descrizioni (Specie & Tratti)

## Specie

- Binomiale in corsivo, Genere maiuscolo + specie minuscolo (es. _Elastovaranus hydrus_).
- Nome volgare: breve, evocativo, 1–2 varianti (es. “Viverna‑Elastico”).
- “Firma funzionale”: 1–2 frasi operative (attacco/difesa/sensi/metabolismo…).
- Abbreviazione specie: tre lettere (EHY per _Elastovaranus hydrus_).
- Slug file: `genus_species.json` (snake_case, ASCII).

## Tratti

- Denominazione criptozoologica: **Sostantivo + Qualificatore** (2–3 parole).
  - Co‑primari con trattino: “Emostatico‑Litico”.
  - Meccanismo con “a/di”: “Scheletro Idraulico **a Pistoni**”.
- Funzione primaria: **verbo + oggetto** (“Inoculare tossine ed enzimi”).
- Descrizione funzionale: 1–3 frasi, **UCUM** nelle unità, condizioni esplicite.
- Codice: locale `SPEC_ABBR-TRxx` (opzionale) + globale `TR-####`.
- Sinergie/Conflitti con codici di tratto.
- Costi: `rest|burst|sustained` + quando si paga.
- Livello: Essenziale | Funzionale.
- Trigger, Limiti & contromisure, Testabilità obbligatori.

## Metriche (UCUM)

Esempi: m/s, m/s2, J, Hz, Pa, N, L/min, Cel, K, dB, dB·s, %.
