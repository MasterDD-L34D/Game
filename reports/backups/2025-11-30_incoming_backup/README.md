# Backup incoming 2025-11-30 (freeze cleanup)

## Sommario
- Archivio creato per salvare lo stato corrente di `incoming/` prima della pulizia/rigenerazione link.
- Posizione locale del pacchetto: `/tmp/incoming_20251130T034435Z.tar.gz`.
- Checksum per verifica: vedere sezione **Checksum**.

## Dettagli archivio
- Comando eseguito: `tar -czf /tmp/incoming_20251130T034435Z.tar.gz incoming`
- Timestamp UTC: 20251130T034435Z
- Contenuto: directory `incoming/` completa al timestamp indicato.

## Checksum
```
95f4b777d18f6899048b926c4daffbcabb21062f5953abbb8b0add42c2052f31  /tmp/incoming_20251130T034435Z.tar.gz
```

## Ripristino rapido
1. Copia l'archivio dal percorso locale indicato in un bucket di storage sicuro (non committato nel repo).
2. Per validare: `sha256sum -c <(echo "95f4b777d18f6899048b926c4daffbcabb21062f5953abbb8b0add42c2052f31  incoming_20251130T034435Z.tar.gz")`.
3. Estrarre in staging: `tar -xzf incoming_20251130T034435Z.tar.gz`.
4. Confrontare con redirect/report rigenerati prima di pubblicare.
