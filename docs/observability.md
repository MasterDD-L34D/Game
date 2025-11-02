# Osservabilità client webapp

Questo documento descrive come attivare, testare e monitorare i tre pilastri di osservabilità introdotti nella webapp:

1. **Error reporting** opzionale tramite Sentry (o compatibile) abilitabile da variabili d'ambiente.
2. **Pannello di diagnostica** visibile nella modalità demo per ispezionare richieste, fallback e log critici.
3. **Metriche di performance** (Core Web Vitals e PerformanceEntry) inoltrate a un endpoint configurabile o salvate in locale.

## 1. Error reporting

L'inizializzazione di Sentry avviene solo quando l'ambiente la abilita esplicitamente.

### Variabili supportate

| Variabile | Descrizione |
| --- | --- |
| `VITE_OBSERVABILITY_ERROR_REPORTING` | Flag (`enabled` / `disabled`). Se omessa rimane disabilitata. |
| `VITE_OBSERVABILITY_ERROR_REPORTING_DSN` | DSN del progetto Sentry o compatibile. Obbligatoria quando il flag è `enabled`. |
| `VITE_OBSERVABILITY_ENVIRONMENT` | Nome ambiente Sentry (default `import.meta.env.MODE`). |
| `VITE_OBSERVABILITY_RELEASE` | Identificativo release da allegare agli eventi (opzionale). |
| `VITE_OBSERVABILITY_TRACES_SAMPLE_RATE` | Sample rate `0-1` per il tracing browser. Default `0`. |
| `VITE_OBSERVABILITY_REPLAYS_SESSION_SAMPLE_RATE` | Sample rate `0-1` per registrazioni sessione. Default `0`. |
| `VITE_OBSERVABILITY_REPLAYS_ERROR_SAMPLE_RATE` | Sample rate `0-1` per replay in caso di errore. Default `0.1`. |

### Attivazione rapida

```bash
# .env.local
VITE_OBSERVABILITY_ERROR_REPORTING=enabled
VITE_OBSERVABILITY_ERROR_REPORTING_DSN=https://<public>@sentry.io/<project>
VITE_OBSERVABILITY_ENVIRONMENT=demo
```

Avviare la webapp (`npm run dev --workspace webapp`) e generare un errore (es. usando gli strumenti di sviluppo del browser `throw new Error('test Sentry')`). L'evento verrà inviato al DSN configurato; in caso di problemi l'app logga in console ` [observability] inizializzazione error reporting fallita`.

## 2. Pannello di diagnostica demo

In modalità demo (`/console/atlas` con meta `demo: true`) appare un pannello in fondo alla pagina che mostra:

- conteggio richieste totali, fallback, errori e pendenti;
- ultimo elenco di fetch indicando durata, fallback e messaggi d'errore;
- ultime metriche raccolte (Web Vitals e performance);
- errori/warning generati dal `clientLogger`.

### Controllo via env

| Variabile | Descrizione |
| --- | --- |
| `VITE_OBSERVABILITY_DIAGNOSTICS` | `enabled`, `disabled` o `auto` (default). In `auto` il pannello è attivo in build non production. |

### Come provarlo

1. Avviare la webapp (`npm run dev --workspace webapp`).
2. Navigare verso la sezione Atlas demo.
3. Attivare un fallback forzando l'assenza dell'API (es. offline) o modificando `VITE_API_BASE`.
4. Osservare nel pannello le richieste classificate come fallback/error.

## 3. Metriche di performance

Il modulo registra automaticamente:

- Core Web Vitals (`CLS`, `FID`, `INP`, `LCP`, `TTFB`);
- performance entries di tipo `navigation` e `resource` (fetch/script/link).

Ogni metrica viene inviata a un endpoint HTTP configurabile (via `sendBeacon`/`fetch`) oppure salvata in `localStorage` quando l'endpoint non è presente o non raggiungibile.

### Variabili supportate

| Variabile | Descrizione |
| --- | --- |
| `VITE_OBSERVABILITY_METRICS` | `enabled`, `disabled` o `auto` (default `auto`, attivo quando `window` esiste). |
| `VITE_OBSERVABILITY_METRICS_ENDPOINT` | URL assoluto/relativo a cui POSTare le metriche in JSON. |
| `VITE_OBSERVABILITY_METRICS_STORAGE_KEY` | Chiave `localStorage` usata per il fallback (default `nebula:observability:metrics`). |

### Formato payload

Esempio di corpo inviato all'endpoint:

```json
{
  "kind": "web-vital",
  "name": "LCP",
  "value": 1240.5,
  "rating": "good",
  "delta": 0,
  "navigationType": "navigate",
  "timestamp": 1719244800000,
  "details": [{ "name": "<img>", "startTime": 1120.4, "duration": 0 }],
  "userAgent": "Mozilla/5.0 ..."
}
```

Quando l'endpoint non è disponibile, le metriche vengono accodate nella chiave `localStorage` indicata (massimo 50 record) e sono visibili anche nel pannello demo.

### Verifica

1. Impostare `VITE_OBSERVABILITY_METRICS_ENDPOINT` su un server locale (es. `http://localhost:3000/metrics`).
2. Avviare il server che registra le richieste POST.
3. Navigare nella webapp: dovrebbero comparire richieste POST con i payload sopra descritti.

## Troubleshooting

- **Nessun evento in Sentry**: verificare che `VITE_OBSERVABILITY_ERROR_REPORTING` sia `enabled` e che il DSN sia corretto. Controllare la console per eventuali errori in fase di bootstrap.
- **Pannello assente**: assicurarsi che la route sia marcata `demo: true` e che `VITE_OBSERVABILITY_DIAGNOSTICS` non sia `disabled`.
- **Metriche non inviate**: controllare la console del browser per eventuali errori di `sendBeacon/fetch` e verificare il contenuto della chiave `localStorage` configurata.

## Monitoraggio continuativo

- Abilitare l'endpoint di metriche in ambienti di staging per confrontare i valori con le soglie attese.
- Collegare Sentry a un canale Slack/Teams per notificare errori in produzione solo quando il flag è abilitato.
- Usare il pannello demo durante sessioni QA per validare fallback e catene di fetch senza strumenti esterni.

