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
