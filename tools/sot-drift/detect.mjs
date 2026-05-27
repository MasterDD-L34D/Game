// tools/sot-drift/detect.mjs
// Pure, dep-free glob matcher for SoT drift detection.

export function globToRegex(glob) {
  // Escape regex specials except '*'
  let re = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  // Order matters: '**/' (any dirs incl none) -> '*' (within a segment)
  re = re.replace(/\*\*\//g, '@@DOUBLEDIR@@');
  re = re.replace(/\*\*/g, '@@DOUBLE@@');
  re = re.replace(/\*/g, '[^/]*');
  re = re.replace(/@@DOUBLEDIR@@/g, '(?:[^/]+/)*');
  re = re.replace(/@@DOUBLE@@/g, '.*');
  return new RegExp('^' + re + '$');
}

export function matchChanges(watchMap, changedFiles) {
  const out = [];
  for (const entry of watchMap) {
    const rx = globToRegex(entry.pattern);
    const files = changedFiles.filter((f) => rx.test(f));
    if (files.length > 0) {
      out.push({ pattern: entry.pattern, sot_ref: entry.sot_ref, concept: entry.concept, files });
    }
  }
  return out;
}

// Minimal YAML-list parser for the constrained watch-map shape (no deps).
// Supports: list items with `pattern:`, `sot_ref:` (inline JSON array), `concept:`.
export function parseWatchMap(text) {
  const entries = [];
  let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, '');
    if (/^\s*#/.test(line) || line.trim() === '') continue;
    const item = line.match(/^-\s+pattern:\s*"(.+)"\s*$/);
    if (item) { cur = { pattern: item[1], sot_ref: [], concept: '' }; entries.push(cur); continue; }
    if (!cur) continue;
    const ref = line.match(/^\s+sot_ref:\s*(\[.*\])\s*$/);
    if (ref) { cur.sot_ref = JSON.parse(ref[1]); continue; }
    const con = line.match(/^\s+concept:\s*"(.+)"\s*$/);
    if (con) { cur.concept = con[1]; continue; }
  }
  return entries;
}

// CLI: node detect.mjs <watch-map.yml> <changed-files-file>
// changed-files-file = newline-separated paths (git diff output). Prints JSON matches to stdout.
// pathToFileURL makes the entry-point check correct on both POSIX and Windows.
if (process.argv[1]) {
  const { pathToFileURL } = await import('node:url');
  if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const { readFileSync } = await import('node:fs');
    const mapPath = process.argv[2];
    const filesPath = process.argv[3];
    const map = parseWatchMap(readFileSync(mapPath, 'utf8'));
    const files = readFileSync(filesPath, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const matches = matchChanges(map, files);
    process.stdout.write(JSON.stringify(matches, null, 2));
  }
}
