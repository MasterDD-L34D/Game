/**
 * Tri-Sorgente Node Bridge — Q-001 T3.2
 *
 * Spawn Python worker (engine/tri_sorgente_worker.py), invia request JSON via stdin,
 * legge response JSON da stdout. Mirror del pattern services/generation/.
 *
 * MVP: single-worker (no pool). Pool manager = follow-up PR se throughput lo richiede.
 *
 * API:
 *   const bridge = createTriSorgenteBridge({ pythonPath, workerPath, timeoutMs });
 *   const offer = await bridge.offerCards({ actor_id, biome_id, recent_actions_counts, seed });
 *   await bridge.shutdown();
 *
 * ADR: docs/architecture/tri-sorgente-node-bridge.md
 */

const { spawn } = require('node:child_process');
const path = require('node:path');

const DEFAULT_WORKER_PATH = path.resolve(__dirname, '..', '..', 'engine', 'tri_sorgente_worker.py');
const DEFAULT_TIMEOUT_MS = 500;
const DEFAULT_PYTHON = process.env.PYTHON_PATH || 'python3';

function createTriSorgenteBridge(opts = {}) {
  const pythonPath = opts.pythonPath || DEFAULT_PYTHON;
  const workerPath = opts.workerPath || DEFAULT_WORKER_PATH;
  const timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : DEFAULT_TIMEOUT_MS;

  let proc = null;
  let nextReqId = 1;
  const pending = new Map(); // id → { resolve, reject, timer }
  let stdoutBuf = '';
  let readyPromise = null;

  function _ensureProcess() {
    if (proc && !proc.killed && proc.exitCode === null) return readyPromise;
    proc = spawn(pythonPath, [workerPath], { stdio: ['pipe', 'pipe', 'pipe'] });

    readyPromise = new Promise((resolve, reject) => {
      const onReady = (line) => {
        try {
          const msg = JSON.parse(line);
          if (msg && msg.type === 'ready') {
            proc.stdout.removeListener('data', onReady);
            resolve();
          }
        } catch {
          // ignore partial lines
        }
      };
      proc.stdout.once('data', (chunk) => {
        const firstLine = chunk.toString().split('\n')[0];
        onReady(firstLine);
      });
      proc.once('error', (err) => reject(err));
      proc.once('exit', (code) => {
        if (code !== 0 && pending.size > 0) {
          for (const { reject: rej, timer } of pending.values()) {
            clearTimeout(timer);
            rej(new Error(`worker exited code=${code}`));
          }
          pending.clear();
        }
      });
    });

    proc.stdout.on('data', (chunk) => {
      stdoutBuf += chunk.toString();
      let nl;
      while ((nl = stdoutBuf.indexOf('\n')) >= 0) {
        const line = stdoutBuf.slice(0, nl);
        stdoutBuf = stdoutBuf.slice(nl + 1);
        if (!line.trim()) continue;
        let msg;
        try {
          msg = JSON.parse(line);
        } catch {
          continue; // ignore malformed lines (including ready handshake)
        }
        if (msg.type === 'ready') continue;
        const entry = pending.get(msg.id);
        if (!entry) continue;
        clearTimeout(entry.timer);
        pending.delete(msg.id);
        if (msg.error) {
          entry.reject(new Error(`worker error: ${msg.error.message}`));
        } else {
          // Bridge fills timestamp (worker sends null)
          if (msg.result && msg.result.meta && msg.result.meta.timestamp == null) {
            msg.result.meta.timestamp = new Date().toISOString();
          }
          entry.resolve(msg.result);
        }
      }
    });

    return readyPromise;
  }

  async function offerCards(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new TypeError('offerCards: payload object required');
    }
    if (!payload.actor_id || !payload.biome_id) {
      throw new TypeError('offerCards: actor_id and biome_id required');
    }
    await _ensureProcess();

    const id = nextReqId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`tri-sorgente worker timeout after ${timeoutMs}ms`));
      }, timeoutMs);
      pending.set(id, { resolve, reject, timer });

      const req = JSON.stringify({ id, payload }) + '\n';
      try {
        proc.stdin.write(req);
      } catch (err) {
        clearTimeout(timer);
        pending.delete(id);
        reject(err);
      }
    });
  }

  async function shutdown() {
    if (!proc || proc.killed) return;
    for (const { reject, timer } of pending.values()) {
      clearTimeout(timer);
      reject(new Error('bridge shutdown'));
    }
    pending.clear();
    try {
      proc.stdin.end();
    } catch {
      /* ignore */
    }
    proc.kill('SIGTERM');
    await new Promise((resolve) => {
      if (proc.exitCode !== null) return resolve();
      proc.once('exit', () => resolve());
      setTimeout(() => resolve(), 200);
    });
    proc = null;
  }

  return { offerCards, shutdown };
}

module.exports = { createTriSorgenteBridge, DEFAULT_WORKER_PATH, DEFAULT_TIMEOUT_MS };
