# Redirect config backup – staging (2025-12-01)

Contesto: preparazione redirect R-01/R-02/R-03 su staging con finestra QA 2025. Questo readme documenta
il backup della configurazione redirect prima dell'applicazione e punta al manifest generato secondo
`docs/planning/REF_BACKUP_AND_ROLLBACK.md`.

Finestre QA confermate (2025):
- Primaria: 2025-12-01T09:00Z → 2025-12-08T18:00Z
- Fallback: 2025-12-09T09:00Z → 2025-12-09T18:00Z

Il manifest sottostante elenca l'archivio off-repo con checksum, location e contatti on-call per
ripristino/rollback (ticket #1206 in caso di failure post-apply).
