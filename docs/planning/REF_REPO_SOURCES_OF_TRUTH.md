# REF_REPO_SOURCES_OF_TRUTH – PATCHSET-00

Versione: 0.5 (riallineato al repo aggiornato; percorsi canonici confermati post-conflitto)
Data: 2025-11-23
Owner: Laura B. (supporto: trait-curator, species-curator, biome-ecosystem-curator)
Stato: DRAFT – in attesa di approvazione 01B/02B

---

## Scopo

Definire le sorgenti di verità per trait, specie, biomi/ecosistemi e schemi correlati, come richiesto da `REF_REPO_SCOPE` (§2.1, §6.1), senza modificare dati core in PATCHSET-00.

## Percorsi canonici (proposta)

- Trait e glossario: `data/traits/**` e documentazione correlata in `traits/**`.
- Specie/unità/NPC: `data/core/**` (per specie) e `data/ecosystems/**` dove applicabile.
- Biomi/ecosistemi: `biomes/**` e `data/ecosystems/**` come sorgenti principali.
- Schemi e validatori: `schemas/**`, `config/**`, `jsonschema/**` (da mappare in 02A).

## Criteri di verità

- I dati core sono modificati manualmente; derived/pack devono essere generati a partire da questi.
- Allineamento con schema ALIENA e metriche UCUM (nessun cambio dati in 00; validazioni pianificate in 02A/02B).
- Collegamento con documentazione: evitare duplicati in `docs/` quando il dato è presente nei core.

## Azioni preparatorie (01B → 02B)

- Verificare copertura schema per trait/specie/biomi rispetto ai file core, con riferimenti espliciti agli schemi usati.
- Collegare le fonti canoniche ai pack derivati (`packs/evo_tactics_pack/**`) e alle snapshot in `data/derived/**`.
- Annotare in `logs/agent_activity.md` ogni verifica eseguita su percorsi canonici e gap individuati.
- Coordinare con il catalogo incoming (01A) per identificare materiale da promuovere o archiviare prima di toccare i core.

## Changelog

- v0.5 – Riallineamento con repo aggiornato e conflitti risolti; percorsi canonici confermati per readiness 01B/02B.
- v0.4 – Azioni preparatorie per 01B/02B esplicitate con logging e collegamento al catalogo incoming; governance ereditata (branch dedicati, owner umano).
- v0.3 – Percorsi canonici esplicitati, criteri di verità e rischi collegati alle fasi 01B/02B; governance (branch/log) ereditata da 0.2.
- v0.2 – Stato design completato, in attesa approvazione PATCHSET-00.
- v0.1 – Stub iniziale.
