# Validator parametri (report-only)

{
  "timestamp_utc": "2026-09-16T00:00:00Z",
  "validator_note": "Controllo integrità/sha256 pacchetti parametri (legacy, nessun unzip interattivo). Rilettura 2026-09-16: recuperato il validator-pack v1.5 con naming a trattino, checksum registrato e confermata modalità read-only.",
  "records": [
    {
      "path": "incoming/evo-tactics-validator-pack-v1.5.zip",
      "status": "present",
      "sha256": "76a6835938cca04dbc308e6461af2abbaaedc7ee67e16a605c4ffdbf4d7ba5ed",
      "integrity": "ok"
    },
    {
      "path": "incoming/evo_tactics_param_synergy_v8_3.zip",
      "status": "present",
      "sha256": "66d630a78fb3cb7ed30f460ac2168b06b0f79ca40dc0d4ea5ef0bee56c79e6bf",
      "integrity": "ok"
    },
    {
      "path": "incoming/evo_tactics_tables_v8_3.xlsx",
      "status": "present",
      "sha256": "86c616aa3f716765972a7814dfeec7073aebffc5c49ddc454827e5baae2b8e35",
      "integrity": "n/a (xlsx)"
    }
  ],
  "verification": {
    "checked_at": "2026-09-16T00:00:00Z",
    "notes": [
      "Checksum ricalcolati localmente; combaciano con i valori registrati per param_synergy_v8_3 e tables_v8_3.",
      "Validator-pack v1.5 presente come drop hyphen-case: registrato sha256 e confermato uso legacy/read-only."
    ]
  },
  "commands": [
    "python incoming/scan_engine_idents.py --root incoming --out reports/temp/engine_ids/incoming_scan.json"
  ]
}
