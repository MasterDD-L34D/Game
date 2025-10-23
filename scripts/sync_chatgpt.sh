#!/usr/bin/env bash
# Wrapper per la sincronizzazione e l'analisi delle conversazioni ChatGPT.
#
# Il comportamento è controllato da variabili d'ambiente opzionali:
#   CHATGPT_SYNC_SOURCE       "api" (default) oppure "export"
#   CHATGPT_SYNC_PROMPT       Prompt da utilizzare con la sorgente "api"
#   CHATGPT_SYNC_MODEL        Modello da utilizzare con la sorgente "api" (default: gpt-4o-mini)
#   CHATGPT_SYNC_EXPORT_FILE  Percorso del file di export per la sorgente "export"
#   CHATGPT_SYNC_DIFF_CONTEXT Numero di linee di contesto per il diff (default: 3)
#   CHATGPT_SYNC_SKIP_ON_ERROR Se impostata a "1", non interrompe l'esecuzione in caso di errori
#
# Lo script aggiorna inoltre docs/chatgpt_sync_status.md con l'esito dell'esecuzione.

set -euo pipefail

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$REPO_ROOT"

STATUS_FILE="docs/chatgpt_sync_status.md"
LOG_DIR="logs"
mkdir -p "$LOG_DIR"

START_TIME=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
SOURCE=${CHATGPT_SYNC_SOURCE:-api}
MODEL=${CHATGPT_SYNC_MODEL:-gpt-4o-mini}
PROMPT=${CHATGPT_SYNC_PROMPT:-}
EXPORT_FILE=${CHATGPT_SYNC_EXPORT_FILE:-}
DIFF_CONTEXT=${CHATGPT_SYNC_DIFF_CONTEXT:-3}
SKIP_ON_ERROR=${CHATGPT_SYNC_SKIP_ON_ERROR:-0}

RESULT="success"
MESSAGE="Sincronizzazione completata."
NEW_SNAPSHOT=""
PREV_SNAPSHOT=""
DIFF_PATH=""

log() {
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] $*"
}

fail() {
  RESULT="failure"
  MESSAGE="$1"
  log "ERRORE: $1"
  if [[ "$SKIP_ON_ERROR" != "1" ]]; then
    update_status
    exit 1
  fi
}

update_status() {
  cat > "$STATUS_FILE" <<EOF_STATUS
# Stato sincronizzazione ChatGPT

- Ultimo run: $START_TIME
- Esito: ${RESULT^}
- Fonte configurata: $SOURCE
- Modello: ${MODEL:-N/D}
- Snapshot corrente: ${NEW_SNAPSHOT:-N/D}
- Snapshot precedente: ${PREV_SNAPSHOT:-N/D}
- Diff generato: ${DIFF_PATH:-N/D}
- Messaggio: $MESSAGE
- Runner: ${GITHUB_WORKFLOW:-esecuzione locale}
- Script: scripts/sync_chatgpt.sh
EOF_STATUS
}

run_sync() {
  if [[ "$SOURCE" == "api" ]]; then
    if [[ -z "$PROMPT" ]]; then
      RESULT="skipped"
      MESSAGE="Prompt mancante per la sorgente API."
      return 1
    fi
    if [[ -z "${OPENAI_API_KEY:-}" ]]; then
      RESULT="skipped"
      MESSAGE="Variabile OPENAI_API_KEY non impostata: sincronizzazione API ignorata."
      return 1
    fi
    log "Richiesta all'API OpenAI con il modello $MODEL"
    if ! python3 "$REPO_ROOT/scripts/chatgpt_sync.py" --source api --prompt "$PROMPT" --model "$MODEL"; then
      RESULT="failure"
      MESSAGE="Errore durante la sincronizzazione tramite API."
      return 1
    fi
  elif [[ "$SOURCE" == "export" ]]; then
    if [[ -z "$EXPORT_FILE" ]]; then
      RESULT="skipped"
      MESSAGE="Percorso export non specificato per la sorgente export."
      return 1
    fi
    if [[ ! -f "$EXPORT_FILE" ]]; then
      RESULT="failure"
      MESSAGE="File di export non trovato: $EXPORT_FILE"
      return 1
    fi
    log "Import del file di export $EXPORT_FILE"
    if ! python3 "$REPO_ROOT/scripts/chatgpt_sync.py" --source export --export-file "$EXPORT_FILE"; then
      RESULT="failure"
      MESSAGE="Errore durante l'import del file di export."
      return 1
    fi
  else
    fail "Sorgente non supportata: $SOURCE"
    return 1
  fi
}

collect_snapshots() {
  python3 - "$REPO_ROOT" <<'PY'
from pathlib import Path
import sys
repo_root = Path(sys.argv[1])
root = repo_root / "data" / "chatgpt"
snapshots = sorted(root.rglob("snapshot-*"))
if snapshots:
    print(snapshots[-1])
    if len(snapshots) > 1:
        print(snapshots[-2])
    else:
        print()
else:
    print()
    print()
PY
}

run_analysis() {
  mapfile -t snaps < <(collect_snapshots)
  NEW_SNAPSHOT=${snaps[0]}
  PREV_SNAPSHOT=${snaps[1]:-}

  if [[ -z "$NEW_SNAPSHOT" ]]; then
    RESULT="failure"
    MESSAGE="Nessuno snapshot disponibile dopo la sincronizzazione."
    return 1
  fi

  if [[ -z "$PREV_SNAPSHOT" ]]; then
    log "Nessuno snapshot precedente: diff non generato."
    MESSAGE="Snapshot iniziale creato senza diff."
    RESULT="success"
    return 0
  fi

  DATE_DIR=$(basename "$(dirname "$NEW_SNAPSHOT")")
  DIFF_BASENAME="${DATE_DIR}.diff"
  mkdir -p "$REPO_ROOT/docs/chatgpt_changes"
  DIFF_PATH="docs/chatgpt_changes/$DIFF_BASENAME"
  log "Generazione diff tra $PREV_SNAPSHOT e $NEW_SNAPSHOT"
  python3 "$REPO_ROOT/scripts/chatgpt_compare.py" "$NEW_SNAPSHOT" --previous "$PREV_SNAPSHOT" --output "$DIFF_PATH" --context "$DIFF_CONTEXT" || return 1
  MESSAGE="Diff aggiornato in $DIFF_PATH."
}

# Corpo principale
if ! run_sync; then
  if [[ "$RESULT" == "failure" ]]; then
    update_status
    exit 1
  fi
  if [[ "$RESULT" == "skipped" ]]; then
    log "$MESSAGE"
    update_status
    exit 0
  fi
fi

if ! run_analysis; then
  if [[ "$RESULT" == "failure" ]]; then
    update_status
    exit 1
  fi
fi

update_status
log "$MESSAGE"
exit 0
