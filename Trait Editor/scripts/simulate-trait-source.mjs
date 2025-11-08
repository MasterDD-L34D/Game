import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..');

async function importFromTs(relativePath) {
  const absolutePath = path.resolve(projectRoot, relativePath);
  const source = await readFile(absolutePath, 'utf8');

  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      esModuleInterop: true,
    },
    fileName: relativePath,
  });

  const moduleUrl = pathToFileURL(absolutePath).toString();
  const dataUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText, 'utf8').toString('base64')}`;

  return import(dataUrl + `#${moduleUrl}`);
}

const { resolveTraitSource, getSampleTraits } = await importFromTs('src/data/traits.sample.ts');

function mockFetchSuccess(payload) {
  return async (endpoint) => {
    console.log('[mock] Fetching from', endpoint);
    return {
      ok: true,
      status: 200,
      json: async () => payload,
    };
  };
}

function mockFetchFailure(message, status = 503) {
  return async (endpoint) => {
    console.log('[mock] Fetching from', endpoint, '-> forcing failure');
    return {
      ok: false,
      status,
      json: async () => {
        throw new Error(message);
      },
    };
  };
}

async function runSimulation() {
  const remoteEndpoint = 'https://example.test/api/traits';

  const remotePayload = [
    {
      id: 'sim-alpha',
      name: 'Sim Alpha',
      description: 'Unità mock restituita dalla simulazione di successo.',
      archetype: 'Diagnostic Runner',
      playstyle: 'Analitico, prova-integrazione, osservazione.',
      signatureMoves: ['Trace Route', 'Heartbeat Ping', 'Diff Analyzer'],
    },
  ];

  globalThis.fetch = mockFetchSuccess(remotePayload);
  const remoteResult = await resolveTraitSource(true, remoteEndpoint);
  console.log('[success] Remote traits:', remoteResult);

  const sampleCache = getSampleTraits();

  globalThis.fetch = mockFetchFailure('Service unavailable');
  const fallbackResult = await resolveTraitSource(true, remoteEndpoint);
  console.log('[failure] Fallback traits length:', fallbackResult.length);
  console.log('[failure] Sample matches fallback:',
    fallbackResult.length === sampleCache.length &&
      fallbackResult.every((trait, index) => trait.id === sampleCache[index].id));
}

runSimulation().catch((error) => {
  console.error('[simulation error]', error);
  process.exitCode = 1;
});
