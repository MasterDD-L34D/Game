import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const distDir = path.join(projectRoot, 'dist');

async function resolveTsDistDir() {
  const candidates = [
    path.join(distDir, 'ts'),
    path.join(distDir, 'tools', 'ts'),
  ];

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isDirectory()) {
        return candidate;
      }
    } catch (error) {
      if (!error || error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  throw new Error(
    `postbuild: could not locate TypeScript output directory. Checked ${candidates.join(', ')}`,
  );
}

async function copyFileIfExists(source, target) {
  try {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(source, target);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      throw new Error(`postbuild: missing artifact ${source}`);
    }
    throw error;
  }
}

async function syncTopLevelEntries() {
  const mappings = [
    ['roll_pack.js', 'roll_pack.js'],
    ['validate_species.js', 'validate_species.js'],
    ['playwright.config.js', 'playwright.config.js'],
  ];

  const tsDistDir = await resolveTsDistDir();

  await Promise.all(
    mappings.map(([sourceName, targetName]) =>
      copyFileIfExists(path.join(tsDistDir, sourceName), path.join(distDir, targetName)),
    ),
  );
}

await syncTopLevelEntries();
