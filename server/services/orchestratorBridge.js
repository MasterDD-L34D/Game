const { spawn } = require('node:child_process');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const { createOrchestratorMetrics } = require('./orchestratorMetrics');

const DEFAULT_CONFIG = {
  pythonPath: process.env.PYTHON || 'python3',
  poolSize: 2,
  requestTimeoutMs: 120_000,
  heartbeatIntervalMs: 5_000,
  heartbeatTimeoutMs: 15_000,
  maxTaskRetries: 1,
  restartDelayMs: 250,
  autoShutdownMs: null,
  workerStartTimeoutMs: 30_000,
};

const DEFAULT_CONFIG_PATH = path.resolve(__dirname, '../../config/orchestrator.json');
const DEFAULT_WORKER_SCRIPT = path.resolve(__dirname, '../../services/generation/worker.py');

function loadConfig(configPath = DEFAULT_CONFIG_PATH) {
  try {
    const text = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }
    return parsed;
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      console.warn('[orchestrator-bridge] configurazione non caricabile:', error.message);
    }
    return {};
  }
}

function coerceNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function resolveAutoShutdownMs(value) {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const normalised = trimmed.toLowerCase();
    if (['off', 'none', 'no', 'false', 'never', 'disable', 'disabled'].includes(normalised)) {
      return null;
    }
    const numeric = Number(trimmed);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return null;
    }
    return numeric;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  return null;
}

function resolveStartTimeoutMs(value, fallback) {
  if (value === undefined) {
    return fallback;
  }
  if (value === null) {
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return fallback;
    }
    const normalised = trimmed.toLowerCase();
    if (['off', 'none', 'no', 'false', 'never', 'disable', 'disabled', '0'].includes(normalised)) {
      return null;
    }
    const numeric = Number(trimmed);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return fallback;
    }
    return numeric;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return fallback;
    }
    if (value <= 0) {
      return null;
    }
    return value;
  }
  return fallback;
}

class PythonWorker extends EventEmitter {
  constructor(id, options) {
    super();
    this.id = id;
    this.options = options;
    this.process = null;
    this.stdout = null;
    this.currentTask = null;
    this.requestSeq = 0;
    this.ready = false;
    this._stopping = false;
    this._heartbeatTimer = null;
    this._startTimer = null;
    this.lastHeartbeatAt = null;
    this._spawn();
  }

  _spawn() {
    const env = {
      ...process.env,
      ORCHESTRATOR_WORKER_HEARTBEAT_INTERVAL_MS: String(
        coerceNumber(this.options.heartbeatIntervalMs, DEFAULT_CONFIG.heartbeatIntervalMs),
      ),
    };

    const proc = spawn(this.options.pythonPath, [this.options.workerScript], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
    });

    this.process = proc;
    this.ready = false;
    this.lastHeartbeatAt = null;

    proc.on('error', (error) => {
      this.emit('worker-error', error);
    });

    proc.on('exit', (code, signal) => {
      this._handleExit(code, signal);
    });

    proc.stdin.on('error', (error) => {
      if (this.currentTask) {
        const task = this.currentTask;
        clearTimeout(task.timer);
        this.currentTask = null;
        task.reject(error);
      }
      this.emit('worker-error', error);
    });

    proc.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      if (text.trim()) {
        this.emit('stderr', { id: this.id, message: text });
      }
    });

    const rl = readline.createInterface({ input: proc.stdout });
    this.stdout = rl;
    rl.on('line', (line) => this._handleLine(line));

    const startTimeout = resolveStartTimeoutMs(
      this.options.workerStartTimeoutMs,
      DEFAULT_CONFIG.workerStartTimeoutMs,
    );
    if (startTimeout) {
      const timer = setTimeout(() => this._handleStartTimeout(), startTimeout);
      if (typeof timer.unref === 'function') {
        timer.unref();
      }
      this._startTimer = timer;
    }
  }

  _handleLine(line) {
    if (!line) return;
    let message;
    try {
      message = JSON.parse(line);
    } catch (error) {
      this.emit('protocol-error', { id: this.id, line, error });
      return;
    }

    if (message.type === 'ready') {
      this.ready = true;
      this.lastHeartbeatAt = Date.now();
      this._clearStartTimer();
      this._resetHeartbeatTimer();
      this.emit('available');
      return;
    }

    if (message.type === 'heartbeat') {
      this.lastHeartbeatAt = Date.now();
      this._resetHeartbeatTimer();
      this.emit('heartbeat', message);
      return;
    }

    if (message.type !== 'response') {
      return;
    }

    const task = this.currentTask;
    if (!task || task.id !== message.id) {
      this.emit('protocol-error', { id: this.id, message, reason: 'unknown-request' });
      return;
    }

    clearTimeout(task.timer);
    this.currentTask = null;
    if (message.status === 'ok') {
      task.resolve(message.result || {});
    } else {
      const error = new Error(message.error || 'Errore generico worker orchestrator');
      error.code = message.code || 'REQUEST_ERROR';
      task.reject(error);
    }
    this.emit('available');
  }

  _handleExit(code, signal) {
    if (this.stdout) {
      this.stdout.removeAllListeners();
      this.stdout.close();
      this.stdout = null;
    }
    this._clearHeartbeatTimer();
    this._clearStartTimer();

    const task = this.currentTask;
    if (task) {
      clearTimeout(task.timer);
      this.currentTask = null;
      const error = new Error(
        `Worker ${this.id} terminato (${code !== null ? code : signal || 'sconosciuto'})`,
      );
      error.code = 'WORKER_CRASH';
      task.reject(error);
    }

    if (this._stopping) {
      this.process = null;
      this.emit('stopped');
      return;
    }

    this.process = null;
    this.ready = false;
    this.emit('crash', { id: this.id, code, signal });
    setTimeout(() => {
      if (!this._stopping) {
        this._spawn();
      }
    }, this.options.restartDelayMs || DEFAULT_CONFIG.restartDelayMs);
  }

  _resetHeartbeatTimer() {
    this._clearHeartbeatTimer();
    const timeout = coerceNumber(
      this.options.heartbeatTimeoutMs,
      DEFAULT_CONFIG.heartbeatTimeoutMs,
    );
    if (!timeout) return;
    const timer = setTimeout(() => this._handleHeartbeatTimeout(), timeout);
    if (typeof timer.unref === 'function') {
      timer.unref();
    }
    this._heartbeatTimer = timer;
  }

  _clearHeartbeatTimer() {
    if (this._heartbeatTimer) {
      clearTimeout(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }

  _clearStartTimer() {
    if (this._startTimer) {
      clearTimeout(this._startTimer);
      this._startTimer = null;
    }
  }

  _handleStartTimeout() {
    this._startTimer = null;
    if (this._stopping || this.ready) {
      return;
    }
    this.emit('start-timeout', { id: this.id });
    if (this.process) {
      this.process.kill('SIGKILL');
    }
  }

  _handleHeartbeatTimeout() {
    if (this._stopping || !this.process) {
      return;
    }
    this.emit('heartbeat-missed', { id: this.id });
    this.process.kill('SIGKILL');
  }

  isAvailable() {
    return this.ready && !this.currentTask;
  }

  runTask(action, payload, timeoutMs) {
    if (!this.process || !this.isAvailable()) {
      return Promise.reject(new Error('Worker non disponibile'));
    }

    const requestId = `${this.id}-${++this.requestSeq}`;
    return new Promise((resolve, reject) => {
      const timer = timeoutMs
        ? setTimeout(() => this._handleRequestTimeout(requestId), timeoutMs)
        : null;
      this.currentTask = { id: requestId, resolve, reject, timer, timeoutMs };
      try {
        this.process.stdin.write(
          `${JSON.stringify({ type: 'request', id: requestId, action, payload })}\n`,
          'utf8',
        );
      } catch (error) {
        if (timer) clearTimeout(timer);
        this.currentTask = null;
        reject(error);
        this.emit('available');
        return;
      }
    });
  }

  _handleRequestTimeout(requestId) {
    const task = this.currentTask;
    if (!task || task.id !== requestId) {
      return;
    }
    this.currentTask = null;
    const error = new Error(`Richiesta ${requestId} scaduta dopo ${task.timeoutMs || 0} ms`);
    error.code = 'REQUEST_TIMEOUT';
    task.reject(error);
    if (this.process) {
      this.process.kill('SIGKILL');
    }
  }

  async stop() {
    this._stopping = true;
    this._clearHeartbeatTimer();
    this._clearStartTimer();
    const proc = this.process;
    if (!proc) {
      this.emit('stopped');
      return;
    }
    return new Promise((resolve) => {
      const onStopped = () => {
        this.removeListener('stopped', onStopped);
        resolve();
      };
      this.on('stopped', onStopped);
      try {
        proc.kill('SIGTERM');
      } catch (error) {
        resolve();
      }
    });
  }

  forceCrash() {
    if (this.process) {
      this.process.kill('SIGKILL');
    }
  }
}

class WorkerPool {
  constructor(options) {
    this.options = options;
    this.queue = [];
    this.workers = [];
    this.maxTaskRetries = options.maxTaskRetries ?? DEFAULT_CONFIG.maxTaskRetries;
    this.metrics = options.metrics || null;
    for (let index = 0; index < options.poolSize; index += 1) {
      this._createWorker(index);
    }
    if (this.metrics) {
      this.metrics.setQueueDepth(0);
    }
  }

  _createWorker(index) {
    const worker = new PythonWorker(index, this.options);
    worker.on('available', () => this._dispatch());
    worker.on('crash', () => this._dispatch());
    worker.on('heartbeat-missed', () => this._dispatch());
    worker.on('start-timeout', () => this._dispatch());
    worker.on('worker-error', () => this._dispatch());
    this.workers[index] = worker;
  }

  _dispatch() {
    if (!this.queue.length) {
      if (this.metrics) {
        this.metrics.setQueueDepth(0);
      }
      return;
    }
    for (const worker of this.workers) {
      if (!worker || !worker.isAvailable()) {
        continue;
      }
      if (!this.queue.length) {
        break;
      }
      const task = this.queue.shift();
      if (!task) {
        break;
      }
      if (this.metrics) {
        this.metrics.setQueueDepth(this.queue.length);
      }
      this._assign(worker, task);
    }
  }

  _assign(worker, task) {
    const stopTimer = this.metrics ? this.metrics.startTaskTimer(task.action) : null;
    worker
      .runTask(task.action, task.payload, task.timeoutMs)
      .then((result) => {
        if (stopTimer) {
          stopTimer('ok');
        }
        if (this.metrics) {
          this.metrics.setQueueDepth(this.queue.length);
        }
        task.resolve(result);
        this._dispatch();
      })
      .catch((error) => {
        const willRetry = this._shouldRetry(error, task);
        if (stopTimer) {
          stopTimer(willRetry ? 'retry' : 'error', error);
        }
        if (willRetry) {
          task.attempts += 1;
          this.queue.unshift(task);
          if (this.metrics) {
            this.metrics.setQueueDepth(this.queue.length);
          }
          setTimeout(() => this._dispatch(), 0);
          return;
        }
        if (this.metrics) {
          this.metrics.setQueueDepth(this.queue.length);
        }
        task.reject(error);
        this._dispatch();
      });
  }

  _shouldRetry(error, task) {
    if (!error || typeof error !== 'object') {
      return false;
    }
    if (error.code === 'WORKER_CRASH' && task.attempts < this.maxTaskRetries) {
      return true;
    }
    return false;
  }

  run(action, payload, timeoutMs) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        action,
        payload,
        resolve,
        reject,
        attempts: 0,
        timeoutMs,
      });
      if (this.metrics) {
        this.metrics.setQueueDepth(this.queue.length);
      }
      this._dispatch();
    });
  }

  async close() {
    const pending = this.queue.splice(0);
    pending.forEach((task) => {
      task.reject(new Error('Pool terminato'));
    });
    await Promise.all(this.workers.filter(Boolean).map((worker) => worker.stop()));
  }

  debugKillWorker(index = 0) {
    const worker = this.workers[index];
    if (worker) {
      worker.forceCrash();
    }
  }

  getStats() {
    const available = this.workers.filter((worker) => worker && worker.isAvailable()).length;
    return {
      size: this.workers.length,
      available,
      queue: this.queue.length,
      lastHeartbeats: this.workers.map((worker) => (worker ? worker.lastHeartbeatAt : null)),
    };
  }
}

function normaliseRequestPayload(input) {
  if (!input || typeof input !== 'object') {
    return { trait_ids: [] };
  }
  const traitIds = Array.isArray(input.trait_ids)
    ? input.trait_ids
    : Array.isArray(input.traitIds)
      ? input.traitIds
      : [];
  const fallback = Array.isArray(input.fallback_trait_ids)
    ? input.fallback_trait_ids
    : Array.isArray(input.fallbackTraitIds)
      ? input.fallbackTraitIds
      : undefined;
  return {
    trait_ids: traitIds,
    biome_id: input.biome_id || input.biomeId || null,
    seed: input.seed ?? null,
    base_name: input.base_name || input.baseName || null,
    request_id: input.request_id || input.requestId || null,
    fallback_trait_ids: fallback,
    dataset_id: input.dataset_id || input.datasetId || null,
    profile_id: input.profile_id || input.profileId || null,
  };
}

function createGenerationOrchestratorBridge(options = {}) {
  const fileConfig = loadConfig(options.configPath || DEFAULT_CONFIG_PATH);
  const merged = {
    ...DEFAULT_CONFIG,
    workerScript: DEFAULT_WORKER_SCRIPT,
    ...fileConfig,
    ...options,
  };

  const snapshotStore = merged.snapshotStore || null;
  const metricsOptions = merged.metrics && typeof merged.metrics === 'object' ? merged.metrics : {};
  const metrics = createOrchestratorMetrics(metricsOptions);
  const resolved = {
    pythonPath: merged.pythonPath || DEFAULT_CONFIG.pythonPath,
    workerScript: merged.workerScript || DEFAULT_WORKER_SCRIPT,
    poolSize: Math.max(1, coerceNumber(merged.poolSize, DEFAULT_CONFIG.poolSize)),
    requestTimeoutMs: coerceNumber(merged.requestTimeoutMs, DEFAULT_CONFIG.requestTimeoutMs),
    heartbeatIntervalMs: coerceNumber(
      merged.heartbeatIntervalMs,
      DEFAULT_CONFIG.heartbeatIntervalMs,
    ),
    heartbeatTimeoutMs: coerceNumber(merged.heartbeatTimeoutMs, DEFAULT_CONFIG.heartbeatTimeoutMs),
    maxTaskRetries: Math.max(0, merged.maxTaskRetries ?? DEFAULT_CONFIG.maxTaskRetries),
    restartDelayMs: coerceNumber(merged.restartDelayMs, DEFAULT_CONFIG.restartDelayMs),
    workerStartTimeoutMs: resolveStartTimeoutMs(
      merged.workerStartTimeoutMs,
      DEFAULT_CONFIG.workerStartTimeoutMs,
    ),
    autoShutdownMs: resolveAutoShutdownMs(
      merged.autoShutdownMs ??
        process.env.ORCHESTRATOR_AUTOCLOSE_MS ??
        DEFAULT_CONFIG.autoShutdownMs,
    ),
  };

  const pool = new WorkerPool({ ...resolved, metrics });
  const cleanupRegistrations = [];
  let shutdownTimer = null;
  let closingPromise = null;

  const requestShutdown = () => {
    if (!closingPromise) {
      cancelAutoShutdown();
      closingPromise = pool
        .close()
        .catch((error) => {
          console.warn('[orchestrator-bridge] arresto pool fallito', error);
        })
        .then(() => undefined);
    }
    return closingPromise;
  };

  const cancelAutoShutdown = () => {
    if (shutdownTimer) {
      clearTimeout(shutdownTimer);
      shutdownTimer = null;
    }
  };

  const scheduleAutoShutdown = () => {
    if (!resolved.autoShutdownMs || closingPromise) {
      return;
    }
    cancelAutoShutdown();
    shutdownTimer = setTimeout(() => {
      requestShutdown();
    }, resolved.autoShutdownMs);
    if (typeof shutdownTimer.unref === 'function') {
      shutdownTimer.unref();
    }
  };

  const registerCleanup = (event) => {
    const handler = () => {
      requestShutdown();
    };
    process.on(event, handler);
    cleanupRegistrations.push([event, handler]);
  };

  ['beforeExit', 'SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(registerCleanup);

  async function persistRuntime(result, error) {
    if (!snapshotStore || typeof snapshotStore.recordRuntime !== 'function') {
      return;
    }
    try {
      await snapshotStore.recordRuntime(result, error);
    } catch (storeError) {
      console.warn('[orchestrator-bridge] aggiornamento runtime snapshot fallito', storeError);
    }
  }

  async function generateSpecies(requestPayload) {
    const payload = normaliseRequestPayload(requestPayload);
    if (!payload.trait_ids.length) {
      throw new Error('trait_ids richiesti per la generazione');
    }
    if (closingPromise) {
      throw new Error('Pool orchestrator non disponibile');
    }
    cancelAutoShutdown();
    try {
      const result = await pool.run('generate-species', payload, resolved.requestTimeoutMs);
      await persistRuntime(result, null);
      return result;
    } catch (error) {
      await persistRuntime(null, error);
      throw error;
    } finally {
      scheduleAutoShutdown();
    }
  }

  async function generateSpeciesBatch(requestPayload) {
    const entries = Array.isArray(requestPayload?.batch)
      ? requestPayload.batch
      : Array.isArray(requestPayload)
        ? requestPayload
        : [];
    const batch = entries
      .map((entry) => normaliseRequestPayload(entry))
      .filter((entry) => entry.trait_ids && entry.trait_ids.length);
    if (!batch.length) {
      return { results: [], errors: [] };
    }
    if (closingPromise) {
      throw new Error('Pool orchestrator non disponibile');
    }
    cancelAutoShutdown();
    try {
      const result = await pool.run('generate-species-batch', { batch }, resolved.requestTimeoutMs);
      const results = Array.isArray(result?.results) ? result.results : [];
      if (results.length) {
        await persistRuntime(results[results.length - 1], null);
      } else if (Array.isArray(result?.errors) && result.errors.length) {
        const firstError = result.errors[0];
        const batchError = new Error(firstError?.error || 'Errore generazione batch specie');
        await persistRuntime(null, batchError);
      }
      return result;
    } catch (error) {
      await persistRuntime(null, error);
      throw error;
    } finally {
      scheduleAutoShutdown();
    }
  }

  async function fetchTraitDiagnostics() {
    if (closingPromise) {
      throw new Error('Pool orchestrator non disponibile');
    }
    cancelAutoShutdown();
    try {
      const result = await pool.run('trait-diagnostics', {}, resolved.requestTimeoutMs);
      return result;
    } finally {
      scheduleAutoShutdown();
    }
  }

  async function close() {
    cancelAutoShutdown();
    while (cleanupRegistrations.length) {
      const [event, handler] = cleanupRegistrations.pop();
      if (typeof process.off === 'function') {
        process.off(event, handler);
      } else {
        process.removeListener(event, handler);
      }
    }
    await requestShutdown();
  }

  const api = {
    generateSpecies,
    generateSpeciesBatch,
    fetchTraitDiagnostics,
    close,
  };

  if (process.env.NODE_ENV === 'test') {
    Object.defineProperty(api, '_pool', {
      value: pool,
      enumerable: false,
      configurable: false,
      writable: false,
    });
  }

  return api;
}

module.exports = { createGenerationOrchestratorBridge };
