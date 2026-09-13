#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR="$REPO_ROOT/logs/monthly_trait_maintenance"
TIMESTAMP="$(date -u +"%Y-%m-%dT%H-%M-%SZ")"
REPORT_FILE="$LOG_DIR/${TIMESTAMP}.md"
STATUS_FILE="$LOG_DIR/status-${TIMESTAMP}.json"
AUDIT_REPORT="$LOG_DIR/trait_audit_${TIMESTAMP}.md"
AUDIT_LOG="$LOG_DIR/trait_audit_${TIMESTAMP}.log"
DEPRECATION_REPORT="$LOG_DIR/deprecated_fields_${TIMESTAMP}.json"
CACHE_LOG="$LOG_DIR/cache_cleanup_${TIMESTAMP}.log"
STYLE_JSON="$LOG_DIR/trait_style_${TIMESTAMP}.json"
STYLE_MARKDOWN="$LOG_DIR/trait_style_${TIMESTAMP}.md"
STYLE_LOG="$LOG_DIR/trait_style_${TIMESTAMP}.log"
COMPLIANCE_JSON="$LOG_DIR/styleguide_compliance_${TIMESTAMP}.json"
COMPLIANCE_MARKDOWN="$LOG_DIR/styleguide_compliance_${TIMESTAMP}.md"
COMPLIANCE_LOG="$LOG_DIR/styleguide_compliance_${TIMESTAMP}.log"
COMPLIANCE_HISTORY="$LOG_DIR/styleguide_compliance_history.json"
DASHBOARD_BRIDGE="$REPO_ROOT/logs/qa/latest-dashboard-metrics.json"

mkdir -p "$LOG_DIR"

anomaly_count=0
anomaly_messages=()

relpath() {
  python3 -c "import os,sys; print(os.path.relpath(sys.argv[1], sys.argv[2]))" "$1" "$REPO_ROOT"
}

log_section() {
  local title="$1"
  printf '\n## %s\n\n' "$title" >>"$REPORT_FILE"
}

append_line() {
  printf '%s\n' "$1" >>"$REPORT_FILE"
}

echo "# Manutenzione mensile trait - ${TIMESTAMP} (UTC)" >"$REPORT_FILE"
append_line "Esecuzione automatizzata di audit, pulizia cache e controllo campi deprecati."

log_section "Audit principali"
if python3 "$REPO_ROOT/scripts/trait_audit.py" --output "$AUDIT_REPORT" >"$AUDIT_LOG" 2>&1; then
  append_line "- ✅ Audit tratti completato. Report: \`$(relpath "$AUDIT_REPORT")\` (log: \`$(relpath "$AUDIT_LOG")\`)."
else
  audit_status=$?
  anomaly_count=$((anomaly_count + 1))
  anomaly_messages+=("Audit trait fallito (codice ${audit_status}).")
  append_line "- ❌ Audit tratti con errori (log: \`$(relpath "$AUDIT_LOG")\`)."
fi

log_section "Pulizia cache temporanee"
{
  echo "| Percorso | Azione |"
  echo "| --- | --- |"
} >>"$REPORT_FILE"

: >"$CACHE_LOG"
CACHE_TARGETS=(
  "$REPO_ROOT/logs/tmp_traits"
  "$REPO_ROOT/logs/trait_audit/tmp"
  "$REPO_ROOT/tmp/trait_cache"
  "$REPO_ROOT/.cache/trait_import"
)
for path in "${CACHE_TARGETS[@]}"; do
  relative_path="$(relpath "$path")"
  if [ -d "$path" ]; then
    rm -rf "$path"
    printf "[%s] rimossa %s\n" "$(date -u +"%H:%M:%SZ")" "$relative_path" >>"$CACHE_LOG"
    printf "| %s | Rimossa |\n" "$relative_path" >>"$REPORT_FILE"
  else
    printf "| %s | Nessuna azione |\n" "$relative_path" >>"$REPORT_FILE"
  fi
done
append_line ""
append_line "Log dettagliato: \`$(relpath "$CACHE_LOG")\`"

log_section "Verifica campi deprecati"
DEPRECATED_COUNT=$(python3 - "$REPO_ROOT" "$DEPRECATION_REPORT" "$TIMESTAMP" <<'PY'
import json
import sys
from pathlib import Path

repo = Path(sys.argv[1])
output = Path(sys.argv[2])
timestamp = sys.argv[3]
index_path = repo / "data" / "traits" / "index.json"
schema_path = repo / "config" / "schemas" / "trait.schema.json"

traits_index = json.loads(index_path.read_text(encoding="utf-8"))
trait_schema = json.loads(schema_path.read_text(encoding="utf-8"))
allowed_fields = set(trait_schema.get("properties", {}).keys())
deprecated_fields = []
traits = traits_index.get("traits", {})
if isinstance(traits, dict):
    for trait_id, payload in sorted(traits.items()):
        if isinstance(payload, dict):
            for field in sorted(payload.keys()):
                if field not in allowed_fields:
                    deprecated_fields.append({"trait": trait_id, "field": field})
        else:
            deprecated_fields.append({"trait": trait_id, "field": "<non-dict payload>"})
output.write_text(
    json.dumps(
        {
            "generated_at": timestamp,
            "schema_allowed_fields": sorted(allowed_fields),
            "deprecated_fields": deprecated_fields,
        },
        ensure_ascii=False,
        indent=2,
    )
    + "\n",
    encoding="utf-8",
)
print(len(deprecated_fields))
PY
)
DEPRECATED_COUNT="${DEPRECATED_COUNT//$'\n'/}"
if [ -z "$DEPRECATED_COUNT" ]; then
  DEPRECATED_COUNT=0
fi

log_section "Controllo guida stile"
if node "$REPO_ROOT/scripts/trait_style_check.js" \
  --output-json "$STYLE_JSON" \
  --output-markdown "$STYLE_MARKDOWN" \
  --fail-on error >"$STYLE_LOG" 2>&1; then
  if [ -f "$STYLE_JSON" ]; then
    read -r STYLE_ERRORS STYLE_WARNINGS STYLE_INFO < <(
      python3 - "$STYLE_JSON" <<'PY'
import json
import sys

path = sys.argv[1]
data = json.loads(open(path, encoding='utf-8').read())
counts = data.get('counts', {})
errors = counts.get('error', 0)
warnings = counts.get('warning', 0)
infos = counts.get('info', 0)
print(errors, warnings, infos)
PY
    )
    STYLE_ERRORS=${STYLE_ERRORS:-0}
    STYLE_WARNINGS=${STYLE_WARNINGS:-0}
    STYLE_INFO=${STYLE_INFO:-0}
    if [ "$STYLE_ERRORS" -gt 0 ]; then
      anomaly_count=$((anomaly_count + STYLE_ERRORS))
      anomaly_messages+=("${STYLE_ERRORS} violazioni guida stile da risolvere.")
      append_line "- ❌ Rilevati ${STYLE_ERRORS} errori guida stile e ${STYLE_WARNINGS} warning (report: \`$(relpath \"$STYLE_MARKDOWN\")\`)."
    else
      append_line "- ✅ Guida stile allineata (warning=${STYLE_WARNINGS}, info=${STYLE_INFO}). Report: \`$(relpath \"$STYLE_MARKDOWN\")\`."
    fi
  else
    append_line "- ✅ Controllo stile completato (nessun report JSON generato)."
  fi
else
  style_status=$?
  anomaly_count=$((anomaly_count + 1))
  anomaly_messages+=("Controllo style guide fallito (codice ${style_status}).")
  append_line "- ❌ Controllo style guide fallito (log: \`$(relpath \"$STYLE_LOG\")\`)."
fi

log_section "Report compliance styleguide"
if python3 "$REPO_ROOT/tools/py/styleguide_compliance_report.py" \
  --out-json "$COMPLIANCE_JSON" \
  --out-markdown "$COMPLIANCE_MARKDOWN" \
  --history-file "$COMPLIANCE_HISTORY" \
  --dashboard-bridge "$DASHBOARD_BRIDGE" \
  >"$COMPLIANCE_LOG" 2>&1; then
  read -r COMPLIANCE_BREACHES COMPLIANCE_OVERVIEW COMPLIANCE_LABELS < <(
    python3 - "$COMPLIANCE_JSON" <<'PY'
import json
import sys

payload = json.loads(open(sys.argv[1], encoding="utf-8").read())
metrics = payload.get("kpi", {})
breaches = []
overview_parts = []
if isinstance(metrics, dict):
    for key in ("name_compliance", "description_completeness", "ucum_presence"):
        bucket = metrics.get(key)
        if isinstance(bucket, dict):
            label = bucket.get("label", key)
            percent = bucket.get("percent")
            if isinstance(percent, (int, float)):
                overview_parts.append(f"{label} {percent:.1f}%")
            else:
                overview_parts.append(f"{label} n/d")
            if bucket.get("status") == "breach":
                breaches.append(label)
summary = payload.get("summary") if isinstance(payload, dict) else None
if isinstance(summary, dict):
    breach_labels = summary.get("breach_labels")
    if isinstance(breach_labels, list):
        breaches = [str(label) for label in breach_labels]
print(len(breaches))
print(" · ".join(overview_parts))
print(", ".join(breaches))
PY
  )
  COMPLIANCE_BREACHES=${COMPLIANCE_BREACHES:-0}
  if [ -z "$COMPLIANCE_OVERVIEW" ]; then
    COMPLIANCE_OVERVIEW="Metriche non disponibili"
  fi
  if [ "$COMPLIANCE_BREACHES" -gt 0 ]; then
    anomaly_count=$((anomaly_count + COMPLIANCE_BREACHES))
    if [ -n "$COMPLIANCE_LABELS" ]; then
      anomaly_messages+=("KPI styleguide sotto SLA: ${COMPLIANCE_LABELS}.")
    else
      anomaly_messages+=("${COMPLIANCE_BREACHES} KPI styleguide sotto SLA.")
    fi
    msg="- ❌ KPI styleguide in breach (${COMPLIANCE_OVERVIEW}). Report: \`$(relpath "$COMPLIANCE_MARKDOWN")\` (log: \`$(relpath "$COMPLIANCE_LOG")\`)."
    append_line "$msg"
  else
    append_line "- ✅ KPI styleguide allineati (${COMPLIANCE_OVERVIEW}). Report: \`$(relpath "$COMPLIANCE_MARKDOWN")\`."
  fi
else
  compliance_status=$?
  anomaly_count=$((anomaly_count + 1))
  anomaly_messages+=("Generazione report styleguide fallita (codice ${compliance_status}).")
  append_line "- ❌ Impossibile generare il report styleguide (log: \`$(relpath \"$COMPLIANCE_LOG\")\`)."
fi
if [ "$DEPRECATED_COUNT" -gt 0 ]; then
  anomaly_count=$((anomaly_count + DEPRECATED_COUNT))
  anomaly_messages+=("${DEPRECATED_COUNT} campi non conformi allo schema trait.")
  append_line "- ❌ Rilevati ${DEPRECATED_COUNT} campi non presenti nello schema (dettagli in \`$(relpath "$DEPRECATION_REPORT")\`)."
else
  append_line "- ✅ Nessun campo deprecato individuato."
fi

append_line ""
append_line "### Esito"
if [ "$anomaly_count" -gt 0 ]; then
  append_line "- ⚠️ Manutenzione completata con anomalie ($anomaly_count)."
else
  append_line "- ✅ Manutenzione completata senza anomalie."
fi

python3 - "$STATUS_FILE" "$REPORT_FILE" "$REPO_ROOT" "$TIMESTAMP" "$anomaly_count" "${anomaly_messages[@]}" <<'PY'
import json
import sys
from pathlib import Path

status_path = Path(sys.argv[1])
report_path = Path(sys.argv[2])
repo_root = Path(sys.argv[3])
timestamp = sys.argv[4]
anomaly_count = int(sys.argv[5])
notes = list(sys.argv[6:])
payload = {
    "generated_at": timestamp,
    "anomaly_count": anomaly_count,
    "notes": notes,
    "report_markdown": str(report_path.relative_to(repo_root)),
}
status_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
PY

echo "Report disponibile in $(relpath "$REPORT_FILE")"
echo "Stato sintetico in $(relpath "$STATUS_FILE")"

action_status="ok"
if [ "$anomaly_count" -gt 0 ]; then
  action_status="warning"
fi

echo "Esito manutenzione: ${action_status} (anomalie=$anomaly_count)"

exit 0
