# REF_PACKS_AND_DERIVED – PATCHSET-00

Versione: 0.4 (allineamento 01B/02B)
Data: 2025-11-23
Owner: Laura B. (supporto: coordinator, dev-tooling)
Stato: DRAFT – pronto per estensioni 01B/02B

---

## Scopo

Mappare relazione tra core, derived e pack, distinguendo le sorgenti di verità dai materiali derivati, in linea con `REF_REPO_SCOPE` (§2.2, §6.1).

## Mappatura iniziale

- Core: `data/core/**`, `data/ecosystems/**`, `data/traits/**`, `biomes/**`.
- Pack ufficiale: `packs/evo_tactics_pack/**` (derivato dai core, deve restare rigenerabile).
- Derived/snapshot/fixture: `data/derived/**` (mock, prod_snapshot, test-fixtures).
- Incoming rilevante per pack: bundle unificati e pack Badlands/Ancestors elencati in `REF_INCOMING_CATALOG.md` (v0.4).

## Regola di rigenerazione (proposta)

- Input: core (percorsi sopra) + schemi in `schemas/**` / `config/**`.
- Output: pack ufficiali e fixture di test generati da tooling (script da censire in 02A/02B).
- Nessuna rigenerazione eseguita in PATCHSET-00; solo definizione del perimetro e dei gap.

## Gap e note

- Identificare gli script/tool esistenti in `tools/`, `scripts/`, `ops/` che supportano rigenerazione pack/fixture (track in 02A/02B).
- Verificare duplicati tra `data/derived/**` e `packs/` rispetto ai core; usare il catalogo incoming per capire cosa archiviare.
- Documentare in `logs/agent_activity.md` le verifiche eseguite e i pack ritenuti superflui (es. serie legacy in `incoming/`).

## Changelog

- v0.4 – Collegati pack/derived con catalogo incoming v0.4; indicati log e mapping script per 02A/02B.
- v0.3 – Mappatura core/derived/pack consolidata, regola di rigenerazione proposta, riferimenti a 01B/02B.
- v0.2 – Stato design completato, in attesa approvazione PATCHSET-00.
- v0.1 – Stub iniziale.
