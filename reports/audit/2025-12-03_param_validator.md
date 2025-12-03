# Validator parametri (report-only)

{
  "timestamp_utc": "2025-12-03T20:53:41.078747Z",
  "validator_note": "Controllo integrit\u00e0/sha256 pacchetti parametri (legacy, nessun unzip interattivo).",
  "records": [
    {
      "path": "incoming/evo_tactics_validator-pack_v1.5.zip",
      "status": "missing",
      "sha256": null,
      "integrity": null
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
  "commands": [
    "python incoming/scan_engine_idents.py --root incoming --out reports/temp/engine_ids/incoming_scan.json"
  ]
}