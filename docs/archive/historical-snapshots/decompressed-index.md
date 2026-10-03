---
title: Asset incoming decompressi
doc_status: draft
doc_owner: incoming-archivist
workstream: incoming
last_verified: 2026-04-14
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Asset incoming decompressi

Posizionare qui le directory estratte dagli archivi incoming prima di
eseguire `scripts/cli_smoke.sh` con il profilo `staging_incoming`.
Il workflow `incoming-smoke.yml` assume che i dataset siano disponibili
sotto `incoming/decompressed/latest/` (override tramite le variabili
`GAME_CLI_INCOMING_DATA_ROOT` e `GAME_CLI_INCOMING_PACK_ROOT`).
