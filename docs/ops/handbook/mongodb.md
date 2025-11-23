# MongoDB operations handbook

## Configurazioni e ambienti

- I file di configurazione standard risiedono in `config/mongodb.dev.json` e `config/mongodb.prod.json` e seguono lo schema `config/schemas/mongodb-config.schema.json`.
- I parametri sensibili (URI, credenziali, database) vengono risolti tramite variabili d'ambiente (`MONGODB_DEV_URI`, `MONGODB_PROD_URI`, ecc.) gestite dal secret manager/Actions secrets.
- Per ambienti aggiuntivi è possibile creare un nuovo file JSON nello stesso formato e utilizzarlo sia con gli script locali sia nelle pipeline CI.

## Migrazioni e seed automatizzati

- Lo script `ops/mongodb/apply.sh` esegue in sequenza:
  1. `scripts/db/run_migrations.py up --config <config>`
  2. `scripts/db/run_migrations.py status --config <config>`
  3. `scripts/db/seed_evo_generator.py --config <config>` (salta con `--skip-seed`).
- Utilizzo rapido:

```bash
# Ambiente di sviluppo
ops/mongodb/apply.sh dev

# Ambiente di produzione (richiede variabili d'ambiente configurate)
MONGODB_PROD_URI="mongodb+srv://..." \
  MONGODB_PROD_DB="evo_tactics" \
  ops/mongodb/apply.sh prod
```

- Il workflow GitHub Actions `.github/workflows/deploy-test-interface.yml` invoca automaticamente `ops/mongodb/apply.sh prod` durante i deploy (esclusi i `pull_request`) utilizzando i secrets `MONGODB_PROD_URI` e `MONGODB_PROD_DB`.

## Backup e retention

- **Frequenza**: dump completi giornalieri, con conservazione di 7 giorni in storage S3 compatibile e snapshot settimanali conservati per 6 settimane. I dump vengono eseguiti fuori orario produttivo (02:00 UTC).
- **Comando di riferimento** (backup completo compressi in formato archivio):

```bash
mongodump \
  --uri="$MONGODB_PROD_URI" \
  --db "$MONGODB_PROD_DB" \
  --archive="/backups/evo_tactics_$(date +%Y%m%d).gz" \
  --gzip \
  --quiet
```

- **Ripristino puntuale** (ripristino completo su istanza temporanea o ambiente di staging):

```bash
mongorestore \
  --uri="$MONGODB_STAGING_URI" \
  --archive="/backups/evo_tactics_20241105.gz" \
  --gzip \
  --nsInclude "$MONGODB_PROD_DB.*" \
  --drop \
  --quiet
```

- **Retention**: i dump giornalieri più vecchi di 7 giorni e gli snapshot settimanali più vecchi di 45 giorni vengono eliminati automaticamente tramite lifecycle rules dello storage.

## Policy di accesso

- Gli URI di produzione sono gestiti dal secret manager: soltanto il team SRE e i referenti dati hanno accesso in lettura/scrittura; gli sviluppatori usano credenziali a privilegio minimo per ambienti di sviluppo/staging.
- Gli script CI utilizzano service account dedicati con permessi limitati al database target (`MONGODB_PROD_DB`).
- Ogni accesso manuale in produzione deve essere tracciato aprendo un ticket Ops e registrando il comando eseguito (inclusi `mongodump`/`mongorestore`).

## Procedure di ripristino

1. Ripristinare un dump recente su un ambiente di staging utilizzando `mongorestore` e verificare i log di applicazione/migrazioni.
2. Validare i dati critici (collezioni `biomes`, `species`, `traits`) confrontando i conteggi con i report generati da `scripts/db/seed_evo_generator.py --dry-run`.
3. Pianificare la finestra di manutenzione e applicare il ripristino sul cluster primario, monitorando la replica e il consumo di risorse.
