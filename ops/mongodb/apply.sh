#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
CONFIG_DIR="$ROOT_DIR/config"
MIGRATION_SCRIPT="$ROOT_DIR/scripts/db/run_migrations.py"
SEED_SCRIPT="$ROOT_DIR/scripts/db/seed_evo_generator.py"

usage() {
  cat <<'USAGE'
Uso: ops/mongodb/apply.sh <ambiente|percorso-config> [--skip-seed]

Esegue le migrazioni MongoDB e il seed dei dati dell'Evo Tactics Pack
utilizzando i file di configurazione definiti in config/.

Argomenti:
  ambiente             Alias "dev"/"development" oppure "prod"/"production"
                       per usare i file predefiniti.
  percorso-config      Percorso esplicito a un file JSON di configurazione.

Opzioni:
  --skip-seed          Esegue solo le migrazioni, senza importare i dati di seed.
USAGE
}

if [[ $# -lt 1 ]]; then
  usage >&2
  exit 1
fi

TARGET="$1"
shift
RUN_SEED=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-seed)
      RUN_SEED=0
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Opzione sconosciuta: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

CONFIG_PATH=""
case "$TARGET" in
  dev|development)
    CONFIG_PATH="$CONFIG_DIR/mongodb.dev.json"
    ;;
  prod|production)
    CONFIG_PATH="$CONFIG_DIR/mongodb.prod.json"
    ;;
  *)
    if [[ -f "$TARGET" ]]; then
      CONFIG_PATH="$TARGET"
    elif [[ -f "$CONFIG_DIR/$TARGET" ]]; then
      CONFIG_PATH="$CONFIG_DIR/$TARGET"
    else
      echo "File di configurazione MongoDB non trovato: $TARGET" >&2
      exit 1
    fi
    ;;
esac

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "File di configurazione MongoDB non trovato: $CONFIG_PATH" >&2
  exit 1
fi

echo "[mongo] Applico migrazioni utilizzando $CONFIG_PATH"
python3 "$MIGRATION_SCRIPT" up --config "$CONFIG_PATH"

echo "[mongo] Stato migrazioni dopo l'upgrade"
python3 "$MIGRATION_SCRIPT" status --config "$CONFIG_PATH"

if [[ $RUN_SEED -eq 1 ]]; then
  echo "[mongo] Applico seed dei dati"
  python3 "$SEED_SCRIPT" --config "$CONFIG_PATH"
else
  echo "[mongo] Seed disabilitato (--skip-seed)"
fi
