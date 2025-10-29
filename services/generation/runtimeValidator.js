const { spawn } = require('node:child_process');
const path = require('node:path');

const DEFAULT_SCRIPT_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'packs',
  'evo_tactics_pack',
  'validators',
  'runtime_api.py',
);

function invokePython(scriptPath, pythonExecutable, args, payload) {
  return new Promise((resolve, reject) => {
    const proc = spawn(pythonExecutable, [scriptPath, ...args], {
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
        const message = stderr || `runtime validator exited with code ${code}`;
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

function createRuntimeValidator(options = {}) {
  const pythonExecutable = options.pythonPath || process.env.PYTHON || 'python3';
  const scriptPath = options.scriptPath || DEFAULT_SCRIPT_PATH;

  async function validateSpeciesBatch(entries, context = {}) {
    if (!Array.isArray(entries) || entries.length === 0) {
      return { corrected: [], messages: [], discarded: [] };
    }
    return invokePython(
      scriptPath,
      pythonExecutable,
      ['--kind', 'species', '--biome-id', context.biomeId || ''],
      { entries },
    );
  }

  async function validateBiome(biome, context = {}) {
    if (!biome || typeof biome !== 'object') {
      return { corrected: biome, messages: [] };
    }
    const args = ['--kind', 'biome'];
    if (context.defaultHazard) {
      args.push('--default-hazard', context.defaultHazard);
    }
    return invokePython(scriptPath, pythonExecutable, args, { biome });
  }

  async function validateFoodweb(document) {
    if (!document || typeof document !== 'object') {
      return { messages: [] };
    }
    return invokePython(scriptPath, pythonExecutable, ['--kind', 'foodweb'], { foodweb: document });
  }

  return {
    validateSpeciesBatch,
    validateBiome,
    validateFoodweb,
  };
}

module.exports = {
  createRuntimeValidator,
};
