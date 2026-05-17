---
title: Setup Git Remoto per Evo-Tactics
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-05-06
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Setup Git Remoto per Evo-Tactics

Questa guida riassume i passaggi necessari per inizializzare il repository e pubblicarlo su GitHub.

1. Inizializza il repository (se non esiste già):
   ```bash
   git init
   ```
2. Stabilisci il primo commit con tutti i file presenti:
   ```bash
   git add .
   git commit -m "chore: bootstrap repo starter"
   ```
3. Imposta il branch principale su `main`:
   ```bash
   git branch -M main
   ```
4. Aggiungi il remote con l'URL del tuo repository GitHub (sostituisci i placeholder con il tuo utente e il nome repo):
   ```bash
   git remote add origin https://github.com/<tuo-utente>/<repo>.git
   ```
5. Effettua il push iniziale:
   ```bash
   git push -u origin main
   ```

> **Suggerimento:** se l'ambiente non dispone delle credenziali GitHub, il push fallirà con un errore di autenticazione. Configura un token personale oppure esegui i passaggi dal tuo computer locale.
