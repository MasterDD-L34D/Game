# Evo Tactics Pack – MongoDB Schema

Questo documento descrive la struttura dati pensata per servire l'ecosistema **Evo Tactics Pack** quando viene proiettato dentro un datastore MongoDB. Le sorgenti primarie dei dati sono i cataloghi JSON generati nello repository (`packs/evo_tactics_pack/docs/catalog`). Il modello è organizzato in sei collezioni principali: `biomes`, `species`, `traits`, `biome_pools`, `sessions` e `activity_logs`.

## Panoramica delle collezioni

| Collezione      | Descrizione                                                                            | Origine dati                                                                |
| --------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `biomes`        | Manifest e metadata dei biomi disponibili nel pacchetto.                               | `catalog_data.json` (`ecosistema.biomi`, `biomi`, `ecosistema.connessioni`) |
| `species`       | Anagrafiche delle specie, eventi climatici e unità giocabili.                          | `docs/catalog/species/*.json`                                               |
| `traits`        | Glossario dei tratti genetici/ambientali unificato con i riferimenti di bilanciamento. | `trait_glossary.json`, `trait_reference.json`, `env_traits.json`            |
| `biome_pools`   | Pool di tratti, template ruoli e clima per la sintesi rapida dei biomi giocabili.      | `data/core/traits/biome_pools.json` (seed runtime)                          |
| `sessions`      | Sessioni di gioco o simulazioni alimentate dal generatore Evo.                         | Eventi applicativi (telemetria runtime, non presenti nei cataloghi statici) |
| `activity_logs` | Log granulari generati durante le sessioni (azioni giocatore/sistema).                 | Eventi applicativi (telemetria runtime, non presenti nei cataloghi statici) |

## `biomes`

### Documento tipo

```jsonc
{
  "_id": "badlands",
  "label": "Brulle Terre Ferrose (Badlands)",
  "network_id": "BADLANDS",
  "profile": {
    "biome_profile": "canyons_risonanti",
    "weight": 0.45,
    "manifest": { /* riepilogo specie, gruppi funzionali, ecc. */ },
    "foodweb": { /* nodi/anelli della rete trofica */ }
  },
  "source_path": "../../data/ecosystems/badlands.biome.yaml",
  "generated_at": ISODate("2025-11-05T18:52:43.280Z"),
  "connections": [
    {
      "to": "FORESTA_TEMPERATA",
      "type": "corridor",
      "resistance": 0.6,
      "seasonality": "primavera/autunno",
      "notes": "gole ombreggiate e canyon → valichi boscosi"
    },
    /* altre connessioni */
  ]
}
```

### Indici

- `_id` (implicitamente indicizzato).
- `network_id` univoco (`unique: true`) per ricercare rapidamente connessioni inter-bioma.
- Indice multivalore `connections.to` per query sui corridoi ecologici.

### Relazioni

- `species.biomes` referenzia `_id` della collezione `biomes`.
- `sessions.biome_id` (campo previsto) punta al bioma usato in una sessione.

## `species`

### Documento tipo

I file JSON in `docs/catalog/species/*.json` vengono importati quasi 1:1.

```jsonc
{
  "_id": "aurora-gull",
  "display_name": "Gabbiano d’Aurora",
  "biomes": ["cryosteppe"],
  "role_trofico": "dispersore_ponte",
  "functional_tags": ["impollinatore", "dispersore_semi"],
  "flags": {
    "apex": false,
    "keystone": false,
    "bridge": true,
    "event": false,
    "threat": false,
    "sentient": false
  },
  "balance": {
    "rarity": "R2",
    "threat_tier": "T1",
    "encounter_role": "ambient"
  },
  "playable_unit": true,
  "morphotype": "volatore_planatore",
  "vc": {
    "aggro": 0.2,
    "risk": 0.2,
    "cohesion": 0.7,
    "setup": 0.5,
    "explore": 0.8,
    "tilt": 0.2
  },
  "spawn_rules": {
    "orario": ["diurno"],
    "meteo": ["sereno_freddo"],
    "densita": "mid"
  },
  "environment_affinity": {
    "biome_class": "mezzanotte_orbitale",
    "koppen": ["BSk", "Dfc"]
  },
  "derived_from_environment": {
    "suggested_traits": ["criostasi_adattiva", "eco_interno_riflesso", "sonno_emisferico_alternato"],
    "optional_traits": ["sacche_galleggianti_ascensoriali", "occhi_infrarosso_composti"],
    "jobs_bias": ["skirmisher", "vanguard", "warden"],
    "required_capabilities": [],
    "services_links": []
  },
  "telemetry": {
    "expected_pick_rate": 0.16,
    "spawn_weight": 0.24
  },
  "genetic_traits": [],
  "services_links": [],
  "description": "i18n:species.aurora-gull.description",
  "receipt": {
    "source": "PTPF.v1.0",
    "author": "designer",
    "date": "2025-10-25",
    "trace_hash": "7d527fc1cfc2c304e5a29fca9c9dbfc49ff818222b1a89c3c3884f81ab1a4a2f"
  },
  "last_synced_at": ISODate("2025-11-05T18:52:43.280Z")
}
```

### Indici

- `_id` (implicitamente indicizzato).
- `biomes` (indice multikey) per recuperare rapidamente tutte le specie di un bioma.
- `flags.apex`, `flags.keystone`, `flags.event` per filtri veloci su ruoli speciali.
- `playable_unit` + `balance.encounter_role` come indice composito per la selezione rapida delle unità giocabili in una determinata fascia di incontro.

### Relazioni

- `biomes` → `biomes._id`.
- `derived_from_environment.suggested_traits`/`optional_traits` → `traits._id`.
- `sessions.primary_species_id` (campo previsto) → `species._id`.
- `activity_logs.subject_id` può puntare sia a specie (`subject_type: "species"`) sia a eventi (`flags.event = true`).

### Ricevute e `trace_hash`

Ogni manifest (JSON o YAML) espone un campo `receipt.trace_hash` che consente di
verificare la coerenza tra le copie pubblicate (cataloghi locali e repliche in
`public/docs`). L'hash viene calcolato tramite lo script
[`tools/py/update_trace_hashes.py`](../../tools/py/update_trace_hashes.py):

1. Il payload del manifest viene caricato e normalizzato rimuovendo i campi
   `trace_hash`, ordinando ricorsivamente le chiavi e serializzando il
   risultato in JSON compatto.
2. Sul contenuto normalizzato viene calcolato un digest SHA-256 in formato
   esadecimale.
3. Il valore ottenuto viene scritto nel campo `receipt.trace_hash` del manifest
   sorgente, delle copie documentali (`docs/evo-tactics-pack/species`) e delle
   repliche aggregate (`catalog_data.json`). Lo stesso processo viene applicato
   alle YAML degli ecosistemi (`data/ecosystems/*.ecosystem.yaml`) per
   garantire la tracciabilità completa del pacchetto.

Lo stesso script è utilizzato nella pipeline di audit (`tests/scripts`)
per garantire che nessun `trace_hash` resti valorizzato a `to-fill`.

## `traits`

### Documento tipo

Durante il seed i dati del glossario e del riferimento vengono fusi in un unico documento:

```jsonc
{
  "_id": "antenne_plasmatiche_tempesta",
  "labels": {
    "it": "Antenne Plasmatiche di Tempesta",
    "en": "Antenne Plasmatiche di Tempesta"
  },
  "descriptions": {
    "it": "Convoglia fulmini atmosferici in attacchi o scudi psionici.",
    "en": "Channels storm lightning into psionic strikes or shields."
  },
  "reference": {
    "tier": "T1",
    "slot": [],
    "usage_tags": ["scout", "support"],
    "sinergie": ["focus_frazionato", "sinapsi_coraline_polifoniche"],
    "requisiti_ambientali": [
      {
        "capacita_richieste": [],
        "condizioni": {"biome_class": "stratosfera_tempestosa"},
        "fonte": "env_to_traits",
        "meta": {"notes": "Ali Fulminee ottimizza..."}
      }
    ]
  },
  "environment_recommendations": [
    {
      "conditions": {"biome_class": "badlands"},
      "effects": {"res_fire": "+1"},
      "jobs_bias": ["vanguard", "warden"],
      "require_capability_any": null
    }
  ],
  "source": {
    "glossary_version": "1.0",
    "reference_version": "2.0",
    "glossary_updated_at": ISODate("2025-10-29T14:21:01+00:00")
  }
}
```

### Indici

- `_id` (implicitamente indicizzato).
- `reference.tier` per filtrare velocemente i tratti per livello di potenza.
- `reference.slot` (multikey) per ricerche per tipo di slot.

### Relazioni

- `species.derived_from_environment.*traits` → `traits._id`.
- `sessions.loadout.traits` → `traits._id`.

## `biome_pools`

Collezione di configurazioni preconfezionate che descrivono pool di tratti, condizioni climatiche e ruoli consigliati per il generatore di biomi.

### Documento tipo

```jsonc
{
  "_id": "cryosteppe_convergence",
  "label": "Convergenza Cryosteppe",
  "summary": "Distese glaciali fratturate dove cristalli piezoelettrici amplificano bufere notturne.",
  "climate_tags": ["frozen", "wind", "night"],
  "size": { "min": 3, "max": 6 },
  "hazard": {
    "severity": "high",
    "description": "Bombe di ghiaccio sovraccariche e whiteout magnetici che colpiscono i punti di raccolta.",
    "stress_modifiers": {
      "whiteout": 0.07,
      "cryogenic_shock": 0.06
    }
  },
  "ecology": {
    "biome_type": "cryosteppe",
    "primary_resources": ["ghiaccio_piezoelettrico", "gas_ionizzati"],
    "notes": "Colonie nomadi sfruttano ponti di luce per attraversare canyon congelati."
  },
  "traits": {
    "core": [
      "ghiaccio_piezoelettrico",
      "criostasi_adattiva",
      "capillari_criogenici",
      "gusci_criovetro"
    ],
    "support": [
      "ghiandole_nebbia_ionica",
      "antenne_wideband",
      "foliage_fotocatodico"
    ]
  },
  "role_templates": [
    {
      "role": "apex",
      "label": "Predatore Risonante",
      "summary": "Predatori che sfruttano i bianchi magnetici per colpi rapidi.",
      "functional_tags": ["skirmisher", "siege"],
      "preferred_traits": ["criostasi_adattiva", "ghiaccio_piezoelettrico"],
      "tier": "T2"
    }
  ],
  "metadata": {
    "schema_version": "1.0",
    "updated_at": ISODate("2025-02-18T00:00:00Z")
  }
}
```

### Indici

- `_id` (implicitamente indicizzato).
- `hazard.severity` per filtrare rapidamente i pool per severità delle minacce ambientali.
- `climate_tags` (multikey) per ricerche per tag climatici.
- `role_templates.role` (multikey) per filtrare template per ruolo.
- `traits.core` (multikey) per recuperare i pool che includono un tratto chiave.

### Relazioni

- `ecology.biome_type` → `biomes._id` (associazione tematica con i biomi disponibili).
- `traits.core`/`traits.support`/`role_templates.preferred_traits` → `traits._id`.
- Utilizzato dal servizio `catalog` (`server/services/catalog.js`) e dal sintetizzatore biomi (`services/generation/biomeSynthesizer.js`) per assemblare configurazioni di gioco.

## `sessions`

Collezione runtime usata per tracciare le generazioni/partite avviate con il generatore Evo.

### Documento tipo

```jsonc
{
  "_id": ObjectId,
  "pack_id": "evo_tactics_pack",
  "status": "active",               // active | completed | aborted
  "player_id": "user-123",
  "biome_id": "cryosteppe",
  "primary_species_id": "aurora-gull",
  "seed_version": "2025-11-05T18:52:43.280Z",
  "started_at": ISODate("2025-11-05T19:00:00Z"),
  "ended_at": ISODate("2025-11-05T20:15:00Z"),
  "summary": {
    "score": 1840,
    "outcome": "victory",
    "telemetry_snapshot_id": ObjectId
  },
  "metadata": {
    "platform": "tabletop-sim",
    "build": "1.14.3",
    "tags": ["playtest", "alpha"]
  }
}
```

### Indici

- `status` + `started_at` (composito) per estrarre timeline attive o completate.
- `player_id` per cronologia utente.
- `pack_id` + `status` (composito) per isolare velocemente le sessioni per pacchetto e stato.

### Relazioni

- `biome_id` → `biomes._id`.
- `primary_species_id` → `species._id`.
- `summary.telemetry_snapshot_id` → collezioni di analytics (se presenti).
- `activity_logs.session_id` → `sessions._id`.

## `activity_logs`

Stream append-only di eventi granulari associati alle sessioni.

### Documento tipo

```jsonc
{
  "_id": ObjectId,
  "session_id": ObjectId,
  "timestamp": ISODate("2025-11-05T19:03:12Z"),
  "event_type": "trait_selected",
  "subject_type": "species",      // species | trait | biome | system
  "subject_id": "aurora-gull",
  "payload": {
    "trait_id": "antenne_plasmatiche_tempesta",
    "source": "player"
  },
  "pack_id": "evo_tactics_pack",
  "metadata": {
    "request_id": "3c2035",
    "platform": "tabletop-sim"
  }
}
```

### Indici

- `session_id` + `timestamp` (composito) per riprodurre velocemente una sessione.
- `event_type` per analisi puntuali.
- `pack_id` + `subject_id` per ricostruire l'impatto di specie/tratti nel tempo.
- Eventuale indice TTL su `expires_at` (se il campo viene introdotto) per prune automatico dei log.

### Relazioni

- `session_id` → `sessions._id`.
- `subject_id` → `species._id` / `traits._id` / `biomes._id` a seconda di `subject_type`.

## Evoluzione dello schema

- Le migrazioni iniziali (`202411050001_initialize_evo_schema.py`) creano le collezioni con gli indici chiave e vengono orchestrate tramite lo script Python `scripts/db/run_migrations.py` (comandi `up`, `down`, `status`).
- Migrazioni successive (es. `202411050002_add_pack_id_to_sessions.py`) dimostrano come introdurre nuovi campi obbligatori (`pack_id` su `sessions`) e relativi indici, mantenendo retro-compatibilità con i dati esistenti.
- Le modifiche future (nuovi attributi ai tratti, nuove tipologie di log) devono seguire lo stesso approccio incrementale, aggiornando prima lo schema via migrazione e solo dopo gli script di seed/servizi applicativi.
