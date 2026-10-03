#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
FREEZE_LABEL="2025-11-25"
FREEZE_EPOCH="$(python - <<'PY'
from datetime import datetime, timezone

print(int(datetime(2025, 11, 25, tzinfo=timezone.utc).timestamp()))
PY
)"
SOURCE_LIST_DIR="$ROOT_DIR/reports/backups/${FREEZE_LABEL}_freeze/source_lists"
STAGING_DIR="$ROOT_DIR/reports/backups/${FREEZE_LABEL}_freeze/staging"
ARTIFACT_DIR="$STAGING_DIR/artifacts"

BUCKETS=(
  "data/core core_snapshot_2025-11-25"
  "data/derived derived_snapshot_2025-11-25"
  "incoming incoming_backup_2025-11-25"
  "docs/incoming docs_incoming_backup_2025-11-25"
)

log() {
  printf '[freeze-%s] %s\n' "$FREEZE_LABEL" "$*"
}

require_clean_tree() {
  if [[ ${ALLOW_DIRTY:-0} == 1 ]]; then
    log "Controllo working tree disattivato (ALLOW_DIRTY=1)"
    return
  fi
  if ! git -C "$ROOT_DIR" diff --quiet --ignore-submodules --exit-code; then
    log "Working tree non pulito: commit/stash prima di procedere."
    exit 1
  fi
  if [ -n "$(git -C "$ROOT_DIR" status --porcelain)" ]; then
    log "Working tree non pulito: commit/stash prima di procedere."
    exit 1
  fi
}

sync_bucket() {
  local bucket_path="$1"
  local list_file="$SOURCE_LIST_DIR/$(echo "$bucket_path" | tr '/' '_')_files.txt"
  if [[ ! -f "$list_file" ]]; then
    log "Lista sorgenti mancante per $bucket_path ($list_file)"
    exit 1
  fi
  rsync -a --relative --files-from="$list_file" "$ROOT_DIR/" "$STAGING_DIR/"
}

create_tar_archive() {
  local bucket_path="$1"
  local archive_name="$2"
  local tar_target="$ARTIFACT_DIR/${archive_name}.tar.gz"
  tar --sort=name --owner=0 --group=0 --numeric-owner --format=gnu --mtime="@$FREEZE_EPOCH" \
    -cf - -C "$STAGING_DIR" "$bucket_path" | gzip -n > "$tar_target"
  log "Creato tar deterministico $tar_target"
}

create_zip_archive() {
  local bucket_path="$1"
  local archive_name="$2"
  local zip_target="$ARTIFACT_DIR/${archive_name}.zip"
  STAGING_DIR="$STAGING_DIR" BUCKET_PATH="$bucket_path" ZIP_PATH="$zip_target" FREEZE_EPOCH="$FREEZE_EPOCH" \
    python - <<'PY'
import datetime
import os
import pathlib
import zipfile

staging = pathlib.Path(os.environ["STAGING_DIR"])
bucket = pathlib.Path(os.environ["BUCKET_PATH"])
out = pathlib.Path(os.environ["ZIP_PATH"])
timestamp = int(os.environ["FREEZE_EPOCH"])
anchor = staging / bucket
if not anchor.exists():
    raise SystemExit(f"Bucket staging missing: {anchor}")

anchor.parent.mkdir(parents=True, exist_ok=True)
out.parent.mkdir(parents=True, exist_ok=True)
base_dt = datetime.datetime.utcfromtimestamp(timestamp).timetuple()[:6]

with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
    for path in sorted(anchor.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(staging)
        info = zipfile.ZipInfo(str(rel).replace("\\", "/"), date_time=base_dt)
        info.compress_type = zipfile.ZIP_DEFLATED
        mode = path.stat().st_mode
        info.external_attr = (mode & 0xFFFF) << 16
        with path.open("rb") as fh:
            zf.writestr(info, fh.read())
PY
  log "Creato zip deterministico $zip_target"
}

main() {
  require_clean_tree
  umask 022
  export LC_ALL=C
  export TZ=UTC
  export SOURCE_DATE_EPOCH="$FREEZE_EPOCH"

  rm -rf "$STAGING_DIR"
  mkdir -p "$ARTIFACT_DIR"

  for entry in "${BUCKETS[@]}"; do
    set -- $entry
    local bucket_path="$1"
    local archive_name="$2"
    log "Sincronizzo $bucket_path in staging"
    sync_bucket "$bucket_path"
    log "Creo archivi per $bucket_path"
    create_tar_archive "$bucket_path" "$archive_name"
    create_zip_archive "$bucket_path" "$archive_name"
  done

  log "Staging pronto in $STAGING_DIR"
  log "Archivi deterministici disponibili in $ARTIFACT_DIR (non committare)"
}

main "$@"
