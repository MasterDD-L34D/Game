# Media sessione pilota 2025-11-12

Le risorse visive sono archiviate in formato Base64 per evitare il tracciamento di file binari nel repository.

## Contenuto
- `*.png.b64`: screenshot HUD/eventi codificati in Base64.
- `*.mp4.b64`: clip video EVT codificate in Base64.
- `checksums.sha256`: digest SHA-256 calcolati sui file originali (non codificati).

## Ripristino asset
Per ricostruire i file originali posizionarsi in questa cartella ed eseguire, per ogni asset necessario:

```bash
base64 -d economy-dashboard.png.b64 > economy-dashboard.png
base64 -d event-evt-03-151530.mp4.b64 > event-evt-03-151530.mp4
```

I nomi dei file ripristinati corrispondono a quelli referenziati nel report `docs/playtest/SESSION-2025-11-12.md`.

## Verifica integrità
Dopo la decodifica, eseguire:

```bash
sha256sum -c checksums.sha256
```

Tutti i file devono risultare `OK`.
