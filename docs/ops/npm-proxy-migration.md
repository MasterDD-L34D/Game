# Migrazione variabili proxy npm

Il warning `Unknown env config "http-proxy"` compare quando l'ambiente espone
una variabile legacy come `npm_config_http_proxy` (o `npm_config_http-proxy`):
npm la mappa alla chiave di config `http-proxy`, che non è più supportata.
Per evitare il warning e mantenere la compatibilità con le prossime major di
npm, migra alle chiavi correnti `proxy` / `https-proxy`.

## Check rapido

- Elenca le variabili correnti: `env | grep -i npm_config_`.
- Verifica la config npm effettiva: `npm config list --json | jq '.proxy, ."https-proxy"'`.
- Se appare `http-proxy: null` o simili, l'ambiente sta ancora esportando la
  variabile legacy.

## Passaggi di migrazione

1. **Rimuovi le variabili obsolete**
   - Sessione corrente: `unset npm_config_http_proxy npm_config_http-proxy`.
   - Profili shell/CI: elimina la voce corrispondente da `.bashrc`, pipeline
     e secret store.
2. **Imposta le variabili supportate**
   - Proxy HTTP: `export npm_config_proxy=http://utente:pass@host:porta`.
   - Proxy HTTPS: `export npm_config_https_proxy=http://utente:pass@host:porta`.
   - (Opzionale) allinea `.npmrc` locale con `proxy=` e `https-proxy=`.
3. **Verifica**
   - `npm ping` deve riuscire senza warning.
   - `npm config list` non deve più riportare `Unknown env config "http-proxy"`.
   - Conferma che i log di CI non mostrino l'avviso nelle fasi `npm ci` /
     `npm test`.

## Note operative

- Se il proxy richiede certificati custom, aggiungi `cafile=/percorso/cert.pem`
  in `.npmrc` invece di disabilitare i controlli TLS.
- Per uniformità, evita le varianti uppercase (`HTTP_PROXY`/`HTTPS_PROXY`) nei
  job npm finché non servono anche per altri tool.
