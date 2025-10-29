const { spawn } = require('node:child_process');
const path = require('node:path');

const DEFAULT_SCRIPT_PATH = path.resolve(__dirname, 'orchestrator.py');

function invokePython({ pythonExecutable, scriptPath, action, payload }) {
  return new Promise((resolve, reject) => {
    const proc = spawn(pythonExecutable, [scriptPath, '--action', action], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const stdoutChunks = [];
    const stderrChunks = [];

    proc.stdout.on('data', (chunk) => stdoutChunks.push(chunk));
    proc.stderr.on('data', (chunk) => stderrChunks.push(chunk));
    proc.on('error', reject);

    proc.on('close', (code) => {
      const stdout = Buffer.concat(stdoutChunks).toString('utf8');
      const stderr = Buffer.concat(stderrChunks).toString('utf8');
      if (code !== 0) {
        const message = stderr || `orchestrator exited with code ${code}`;
        reject(new Error(message.trim()));
        return;
      }
      try {
        resolve(stdout ? JSON.parse(stdout) : {});
      } catch (error) {
        reject(error);
      }
    });

    proc.stdin.write(JSON.stringify(payload || {}));
    proc.stdin.end();
  });
}

function normaliseRequestPayload(input) {
  if (!input || typeof input !== 'object') {
    return { trait_ids: [] };
  }
  return {
    trait_ids: Array.isArray(input.trait_ids)
      ? input.trait_ids
      : Array.isArray(input.traitIds)
        ? input.traitIds
        : [],
    biome_id: input.biome_id || input.biomeId || null,
    seed: input.seed ?? null,
    base_name: input.base_name || input.baseName || null,
    request_id: input.request_id || input.requestId || null,
    fallback_trait_ids: Array.isArray(input.fallback_trait_ids)
      ? input.fallback_trait_ids
      : Array.isArray(input.fallbackTraitIds)
        ? input.fallbackTraitIds
        : undefined,
  };
}

function createGenerationOrchestratorBridge(options = {}) {
  const pythonExecutable = options.pythonPath || process.env.PYTHON || 'python3';
  const scriptPath = options.scriptPath || DEFAULT_SCRIPT_PATH;

  async function generateSpecies(requestPayload) {
    const payload = normaliseRequestPayload(requestPayload);
    if (!payload.trait_ids.length) {
      throw new Error('trait_ids richiesti per la generazione');
    }
    return invokePython({
      pythonExecutable,
      scriptPath,
      action: 'generate-species',
      payload,
    });
  }

  return {
    generateSpecies,
  };
}

module.exports = { createGenerationOrchestratorBridge };
