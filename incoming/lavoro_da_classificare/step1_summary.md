# Step 1 – Raccolta informazioni di base

**Data:** 03/11/2025

Per avviare correttamente il piano di integrazione per il progetto **Evo‑Tactics**, è stato necessario raccogliere e riorganizzare le informazioni esistenti. Questo documento riassume le attività eseguite nel primo step.

## Attività svolte

1. **Lettura del README principale**
   - Analizzate le sezioni *Panoramica*, *Settori e dipendenze* e *Tour del repository* per identificare la struttura del progetto e le dipendenze tra moduli (dataset, CLI Python/TypeScript, backend Idea Engine, webapp).
   - Evidenziato che il monorepo include dati YAML, script di generazione/validazione, pack di ecosistemi, workflow CI e una dashboard di test.

2. **Analisi dei workflow CI/CD**
   - Esaminati i file sotto `.github/workflows/` per comprendere i processi attuali (lint/test Python/TS, deploy della test interface, aggiornamento automatico dei tracker).
   - Verificato che esistono workflow dedicati (`ci.yml`, `deploy-test-interface.yml`, `daily-tracker-refresh.yml`) e altri per naming, QA, HUD, KPI.

3. **Valutazione dei test automatizzati**
   - Identificate le suite di test Python (pytest), TypeScript (Vitest e Playwright), test API Node e test per la webapp.
   - Verificato che esistono script per generare report e validare i dataset.

4. **Raccolta documenti e checklist**
   - Presa visione dell’indice operativo (`docs/00-INDEX.md`), delle checklist (`docs/checklist/action-items.md`, `docs/checklist/milestones.md`) e della roadmap (`docs/piani/roadmap.md`) per valutare l’esistente piano di lavoro.

## Osservazioni

- Il progetto è ben documentato e presenta già automazioni CI/CD, ma l’attività è frammentata tra molti fronti (dataset, strumenti, backend, webapp, QA, telemetria).
- È necessaria una centralizzazione delle attività e una maggiore integrazione tra i diversi moduli.
- L’integrazione delle best practice di sicurezza (Secure SDLC) e di gestione del rischio non è evidente nei workflow attuali.

## Prossime azioni

Passare allo **Step 2**: definire e consolidare il Game Design Document (GDD), raccogliendo concept, target, regole di gioco, architettura dati e monetizzazione.

