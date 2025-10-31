# Variant: "Tri-Sorgente" — Card & Roll Engine

> **Stato:** Draft v1 (Docs-only) — questa PR introduce la documentazione e lo scheletro file per integrare la variante completa *Tri‑Sorgente* (Tavole di Tiro + Carte Azione/Reticolo + Profili Psicomotivi Enneagram/MBTI). Il codice di gioco potrà essere introdotto in PR successive.

## Obiettivi
- Aggiungere documentazione e spec formali per il sistema "Tri‑Sorgente".
- Stabilire schemi dati (YAML/JSON) per carte, tabelle di tiro e profili.
- Definire flussi di integrazione limitati ad una singola fase del progetto (non pervasive).

## Percorso
- Directory: `docs/tri_sorgente/`
- File principali: `README.md`, `SPEC.md`, `CARDS.schema.yaml`, `TABLES.schema.yaml`, `PROFILES.schema.yaml`, `CHANGELOG.md`.

## Integrazione Fase (non totale)
- **Fase consigliata:** Onboarding PG (Sessione Zero) *oppure* Scelte Interludio tra missioni.
- Meccanica: 1) Tiri su Tavole (roll), 2) Draft/Acquisto carta da pool generato, 3) Profilazione Enneagram/MBTI per modulare pool, limiti e sinergie.

## Struttura minima dei file inclusi
Vedi `docs/tri_sorgente/` in questa PR.

