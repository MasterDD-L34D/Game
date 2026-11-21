// FASE 1 T1.3 — Visual baseline compare utility.
//
// Modi:
//   --baseline <run-dir> [--scenario <name>]
//     Promuove i signature JSON di un run a baseline canonical sotto
//     tools/sim/baselines/<scenario>/. Sovrascrive (gated da --force).
//
//   --compare <run-dir-A> <run-dir-B>
//     Confronta due run dir per fase × ruolo × label, emette diff-report.md
//     in <run-dir-B>/diff-vs-<basename(A)>.md con pass/fail per cella +
//     pixel-delta % (RGBA L1 distance / 1024 * 100).
//
//   --compare-baseline <run-dir> [--scenario <name>]
//     Confronta un run vs baselines/<scenario>/, idem reporting.
//
// Razionale grid-signature vs PNG diff:
//   pngjs/pixelmatch NON sono installati nel monorepo (verified
//   2026-05-09). Installarli sarebbe nuova dep — vietato senza grant.
//   Il signature è un grid NxM RGBA (default 4x4 = 16 cell) catturato
//   dal canvas già al capture-time dal harness. Diff su 16 RGBA tuple
//   = 64 numeri = bilancia false-positive minor / regressione lorda.
//   Mantiene il PNG accanto come prova umana.
//
// Output diff-report.md schema:
//   # Visual diff <runB> vs <runA>
//   ## Phase <X> — role <Y> — label <Z>
//   - PASS / FAIL / MISSING
//   - delta avg per cell (max + mean)
//   - cell-level table (top 5 most diverging)
//
// Usage examples:
//   node tools/sim/visual-baseline-compare.js --baseline /tmp/browser-sync-runs/run-X --scenario enc_tutorial_01
//   node tools/sim/visual-baseline-compare.js --compare /tmp/browser-sync-runs/run-A /tmp/browser-sync-runs/run-B
//   node tools/sim/visual-baseline-compare.js --compare-baseline /tmp/browser-sync-runs/run-Z --scenario enc_tutorial_01
//
// Cross-ref:
//   tests/smoke/browser-sync-spectator.js (signature producer)
//   tools/ts/tests/playwright/phone/lib/canvasGrid.ts (sampler logic)
//   docs/playtest/2026-05-09-fase1-t1-3-browser-sync-handoff.md
//
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT_CANDIDATES = [path.resolve(__dirname, '..', '..'), process.cwd()];

function resolveBaselinesRoot() {
  // Priorità: tools/sim/baselines/ accanto a questo file.
  return path.resolve(__dirname, 'baselines');
}

function parseArgs(argv) {
  const args = {
    mode: null,
    runA: null,
    runB: null,
    scenario: 'default',
    force: false,
    threshold: Number(process.env.VISUAL_DIFF_THRESHOLD || 30),
  };
  for (let i = 2; i < argv.length; i += 1) {
    const tok = argv[i];
    const next = () => argv[++i];
    switch (tok) {
      case '--baseline':
        args.mode = 'baseline';
        args.runA = next();
        break;
      case '--compare':
        args.mode = 'compare';
        args.runA = next();
        args.runB = next();
        break;
      case '--compare-baseline':
        args.mode = 'compare-baseline';
        args.runA = next();
        break;
      case '--scenario':
        args.scenario = next();
        break;
      case '--force':
        args.force = true;
        break;
      case '--threshold':
        args.threshold = Number(next());
        break;
      case '-h':
      case '--help':
        args.mode = 'help';
        break;
      default:
        console.error(`Unknown arg: ${tok}`);
        process.exit(2);
    }
  }
  return args;
}

function listSignatures(runDir) {
  const sigDir = path.join(runDir, 'signatures');
  if (!fs.existsSync(sigDir)) {
    throw new Error(`No signatures/ in ${runDir}`);
  }
  const files = fs.readdirSync(sigDir).filter((f) => f.endsWith('.json'));
  const out = {};
  for (const f of files) {
    // tag schema: <NN>-<phase>-<role>-<label>.json
    // phase può contenere '_' (e.g., character_creation, world_setup).
    const base = f.replace(/\.json$/, '');
    const parts = base.split('-');
    if (parts.length < 4) continue;
    const idx = parts[0];
    const label = parts[parts.length - 1];
    const role = parts[parts.length - 2];
    const phase = parts.slice(1, parts.length - 2).join('-');
    const key = `${phase}::${role}::${label}`;
    const data = JSON.parse(fs.readFileSync(path.join(sigDir, f), 'utf8'));
    out[key] = { idx, phase, role, label, data, file: f };
  }
  return out;
}

function gridDistance(gridA, gridB) {
  // Returns { mean, max, cellDeltas, mismatchedDims }.
  if (!gridA || !gridB) {
    return { mean: Infinity, max: Infinity, cellDeltas: [], mismatchedDims: true };
  }
  if (
    gridA.length !== gridB.length ||
    (gridA[0] && gridB[0] && gridA[0].length !== gridB[0].length)
  ) {
    return { mean: Infinity, max: Infinity, cellDeltas: [], mismatchedDims: true };
  }
  const cellDeltas = [];
  let sum = 0;
  let max = 0;
  for (let r = 0; r < gridA.length; r += 1) {
    for (let c = 0; c < gridA[r].length; c += 1) {
      const a = gridA[r][c]?.avg || { r: 0, g: 0, b: 0, a: 0 };
      const b = gridB[r][c]?.avg || { r: 0, g: 0, b: 0, a: 0 };
      const d =
        Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) + Math.abs(a.a - b.a);
      cellDeltas.push({ r, c, delta: d });
      sum += d;
      if (d > max) max = d;
    }
  }
  const mean = cellDeltas.length > 0 ? sum / cellDeltas.length : 0;
  return { mean, max, cellDeltas, mismatchedDims: false };
}

function cmdBaseline(args) {
  const baselinesRoot = resolveBaselinesRoot();
  const target = path.join(baselinesRoot, args.scenario);
  fs.mkdirSync(target, { recursive: true });
  const sigs = listSignatures(args.runA);
  const keys = Object.keys(sigs);
  if (keys.length === 0) {
    console.error(`No signatures in ${args.runA}`);
    process.exit(2);
  }
  let written = 0;
  let skipped = 0;
  for (const key of keys) {
    const sig = sigs[key];
    const fname = `${sig.phase}-${sig.role}-${sig.label}.json`;
    const dest = path.join(target, fname);
    if (fs.existsSync(dest) && !args.force) {
      skipped += 1;
      continue;
    }
    fs.writeFileSync(dest, JSON.stringify({ baseline_from: args.runA, ...sig.data }, null, 2));
    written += 1;
  }
  console.log(`Baseline scenario=${args.scenario} → ${target}`);
  console.log(`  written: ${written} | skipped (use --force): ${skipped}`);
}

function loadBaselines(scenario) {
  const dir = path.join(resolveBaselinesRoot(), scenario);
  if (!fs.existsSync(dir)) {
    throw new Error(`No baselines/${scenario}/ — run --baseline first`);
  }
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  const out = {};
  for (const f of files) {
    const base = f.replace(/\.json$/, '');
    // schema baseline: <phase>-<role>-<label>.json
    const parts = base.split('-');
    if (parts.length < 3) continue;
    const label = parts[parts.length - 1];
    const role = parts[parts.length - 2];
    const phase = parts.slice(0, parts.length - 2).join('-');
    const key = `${phase}::${role}::${label}`;
    out[key] = {
      phase,
      role,
      label,
      data: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')),
      file: f,
    };
  }
  return out;
}

function diffSignatureSets(setA, setB, threshold, labelA, labelB) {
  const allKeys = new Set([...Object.keys(setA), ...Object.keys(setB)]);
  const rows = [];
  let pass = 0;
  let fail = 0;
  let missing = 0;
  for (const key of Array.from(allKeys).sort()) {
    const a = setA[key];
    const b = setB[key];
    if (!a || !b) {
      missing += 1;
      rows.push({ key, status: 'MISSING', side: !a ? labelA : labelB });
      continue;
    }
    const dist = gridDistance(a.data.grid, b.data.grid);
    const status = dist.mean <= threshold && !dist.mismatchedDims ? 'PASS' : 'FAIL';
    if (status === 'PASS') pass += 1;
    else fail += 1;
    rows.push({
      key,
      status,
      mean: dist.mean,
      max: dist.max,
      mismatchedDims: dist.mismatchedDims,
      cellDeltas: dist.cellDeltas,
    });
  }
  return { rows, summary: { pass, fail, missing, total: rows.length, threshold } };
}

function renderDiffReport(result, header) {
  const lines = [];
  lines.push(`# ${header}`);
  lines.push('');
  lines.push(`Threshold: mean RGBA L1 ≤ ${result.summary.threshold} per cell.`);
  lines.push('');
  lines.push(
    `**Summary**: ${result.summary.pass} PASS / ${result.summary.fail} FAIL / ${result.summary.missing} MISSING / ${result.summary.total} total.`,
  );
  lines.push('');
  for (const row of result.rows) {
    lines.push(`## ${row.key}`);
    if (row.status === 'MISSING') {
      lines.push(`- **MISSING** in ${row.side}`);
      lines.push('');
      continue;
    }
    if (row.mismatchedDims) {
      lines.push(`- **FAIL** (mismatched grid dimensions)`);
      lines.push('');
      continue;
    }
    lines.push(`- **${row.status}** — mean Δ=${row.mean.toFixed(2)} | max Δ=${row.max.toFixed(2)}`);
    if (row.status === 'FAIL') {
      const top = row.cellDeltas
        .slice()
        .sort((a, b) => b.delta - a.delta)
        .slice(0, 5);
      lines.push('');
      lines.push('| row | col | Δ |');
      lines.push('| --- | --- | --- |');
      for (const c of top) lines.push(`| ${c.r} | ${c.c} | ${c.delta.toFixed(2)} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function cmdCompare(args) {
  const setA = listSignatures(args.runA);
  const setB = listSignatures(args.runB);
  const result = diffSignatureSets(setA, setB, args.threshold, args.runA, args.runB);
  const reportPath = path.join(args.runB, `diff-vs-${path.basename(args.runA)}.md`);
  const md = renderDiffReport(
    result,
    `Visual diff ${path.basename(args.runB)} vs ${path.basename(args.runA)}`,
  );
  fs.writeFileSync(reportPath, md);
  console.log(`Diff report → ${reportPath}`);
  console.log(
    `  ${result.summary.pass} PASS / ${result.summary.fail} FAIL / ${result.summary.missing} MISSING`,
  );
  process.exit(result.summary.fail === 0 && result.summary.missing === 0 ? 0 : 1);
}

function cmdCompareBaseline(args) {
  const setRun = listSignatures(args.runA);
  const setBase = loadBaselines(args.scenario);
  const result = diffSignatureSets(
    setBase,
    setRun,
    args.threshold,
    `baseline:${args.scenario}`,
    path.basename(args.runA),
  );
  const reportPath = path.join(args.runA, `diff-vs-baseline-${args.scenario}.md`);
  const md = renderDiffReport(
    result,
    `Visual diff ${path.basename(args.runA)} vs baseline ${args.scenario}`,
  );
  fs.writeFileSync(reportPath, md);
  console.log(`Diff report → ${reportPath}`);
  console.log(
    `  ${result.summary.pass} PASS / ${result.summary.fail} FAIL / ${result.summary.missing} MISSING`,
  );
  process.exit(result.summary.fail === 0 && result.summary.missing === 0 ? 0 : 1);
}

function help() {
  console.log(`Usage:
  node tools/sim/visual-baseline-compare.js --baseline <run-dir> [--scenario <name>] [--force]
  node tools/sim/visual-baseline-compare.js --compare <run-dir-A> <run-dir-B> [--threshold <N>]
  node tools/sim/visual-baseline-compare.js --compare-baseline <run-dir> [--scenario <name>] [--threshold <N>]

Defaults:
  --scenario default
  --threshold 30 (mean RGBA L1 per cell)
`);
}

const args = parseArgs(process.argv);
switch (args.mode) {
  case 'baseline':
    cmdBaseline(args);
    break;
  case 'compare':
    cmdCompare(args);
    break;
  case 'compare-baseline':
    cmdCompareBaseline(args);
    break;
  case 'help':
  default:
    help();
    process.exit(args.mode ? 0 : 1);
}
