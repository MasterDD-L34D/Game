// ADR-2026-05-29-ermes-runtime-bridge sezione D (TKT-BR-03).
// Reverse-index trait -> [pool_id] cached at boot. Edit trait -> rerun
// solo biomi che lo includono. Idempotent queue + checkpoint pattern
// (anti-pattern #5 CLAUDE.md). Lazy spawn ermes_sim.py --multi-biome.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const DEFAULT_BIOME_POOLS = path.resolve(
  __dirname,
  '../../../../data/core/traits/biome_pools.json',
);
const DEFAULT_LAB_SCRIPT = path.resolve(__dirname, '../../../../prototypes/ermes_lab/ermes_sim.py');
const DEFAULT_LAB_CONFIG = path.resolve(
  __dirname,
  '../../../../prototypes/ermes_lab/configs/multi_biome.json',
);
const DEFAULT_OUTPUT = path.resolve(
  __dirname,
  '../../../../prototypes/ermes_lab/outputs/latest_eco_pressure_report.json',
);

function createErmesRunner(opts = {}) {
  const biomePoolsPath = opts.biomePoolsPath || DEFAULT_BIOME_POOLS;
  const labScriptPath = opts.labScriptPath || DEFAULT_LAB_SCRIPT;
  const labConfig = opts.labConfig || DEFAULT_LAB_CONFIG;
  const outputPath = opts.outputPath || DEFAULT_OUTPUT;
  const python = opts.pythonExecutable || 'python';

  // Build trait -> [pool_id] reverse map at boot.
  const _traitToPoolsMap = new Map();
  if (fs.existsSync(biomePoolsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(biomePoolsPath, 'utf8'));
      for (const pool of data.pools || []) {
        const traits = [
          ...(pool.traits?.core || []),
          ...(pool.traits?.support || []),
          ...(pool.role_templates || []).flatMap((rt) => rt.preferred_traits || []),
        ];
        for (const traitId of traits) {
          if (!_traitToPoolsMap.has(traitId)) _traitToPoolsMap.set(traitId, new Set());
          _traitToPoolsMap.get(traitId).add(pool.id);
        }
      }
      // Normalize Set -> Array.
      for (const [k, v] of _traitToPoolsMap) _traitToPoolsMap.set(k, Array.from(v));
    } catch (err) {
      console.warn('[ermesRunner] reverse-index boot fail:', err && err.message);
    }
  }

  // Idempotent queue (set-based dedup).
  const _pending = new Set();
  let _running = false;
  const _listeners = [];

  function getTraitToPoolsMap() {
    return _traitToPoolsMap;
  }

  function poolsForTrait(traitId) {
    return _traitToPoolsMap.get(traitId) || [];
  }

  function enqueueRerun({ traitId } = {}) {
    if (!traitId) return false;
    _pending.add(traitId);
    return true;
  }

  function pendingQueueSize() {
    return _pending.size;
  }

  function isRunning() {
    return _running;
  }

  function onRerunComplete(callback) {
    if (typeof callback === 'function') _listeners.push(callback);
  }

  async function runQueuedRerun() {
    if (_running) return { skipped: true, reason: 'already_running' };
    if (_pending.size === 0) return { skipped: true, reason: 'empty_queue' };
    _running = true;
    const trait_ids = Array.from(_pending);
    _pending.clear();
    try {
      const affected_pools = new Set();
      for (const tid of trait_ids) {
        for (const p of poolsForTrait(tid)) affected_pools.add(p);
      }
      if (labScriptPath === '/skip') {
        const result = {
          skipped_lab: true,
          trait_ids,
          affected_pools: Array.from(affected_pools),
        };
        _listeners.forEach((cb) => {
          try {
            cb(result);
          } catch (_) {
            /* swallow */
          }
        });
        return result;
      }
      const result = await new Promise((resolve, reject) => {
        const proc = spawn(
          python,
          [labScriptPath, '--multi-biome', '--config', labConfig, '--output', outputPath],
          { stdio: 'pipe' },
        );
        let stderr = '';
        proc.stderr.on('data', (d) => {
          stderr += d.toString();
        });
        proc.on('exit', (code) => {
          if (code === 0)
            resolve({
              output: outputPath,
              trait_ids,
              affected_pools: Array.from(affected_pools),
            });
          else reject(new Error(`ermes_sim exited ${code}: ${stderr.slice(0, 400)}`));
        });
      });
      _listeners.forEach((cb) => {
        try {
          cb(result);
        } catch (_) {
          /* swallow */
        }
      });
      return result;
    } finally {
      _running = false;
    }
  }

  return {
    getTraitToPoolsMap,
    poolsForTrait,
    enqueueRerun,
    pendingQueueSize,
    isRunning,
    onRerunComplete,
    runQueuedRerun,
    DEFAULT_BIOME_POOLS,
    DEFAULT_LAB_SCRIPT,
    DEFAULT_LAB_CONFIG,
    DEFAULT_OUTPUT,
  };
}

module.exports = { createErmesRunner };
