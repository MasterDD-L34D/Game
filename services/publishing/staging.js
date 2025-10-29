import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

import { createPublishingWorkflow } from './workflow.js';

function relativeToCwd(targetPath) {
  return path.relative(process.cwd(), targetPath);
}

function titleCase(value) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

async function collectPatchMetadata(workflow, packageId) {
  const packageDir = path.join(workflow.stagingRoot, packageId);
  let entries;
  try {
    entries = await fs.readdir(packageDir, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const patches = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.patch.yaml')) {
      continue;
    }
    const filePath = path.join(packageDir, entry.name);
    const content = await fs.readFile(filePath, 'utf8');
    let data;
    try {
      data = yaml.load(content) || {};
    } catch (error) {
      data = {};
    }
    const patchId = typeof data.id === 'string' && data.id.trim()
      ? data.id.trim()
      : entry.name.replace(/\.patch\.yaml$/, '');
    const title = typeof data.title === 'string' && data.title.trim()
      ? data.title.trim()
      : typeof data.name === 'string' && data.name.trim()
        ? data.name.trim()
        : titleCase(patchId.replace(/[-_]+/g, ' '));

    patches.push({
      id: patchId,
      title,
      file: entry.name,
      path: path.relative(workflow.stagingRoot, filePath),
    });
  }

  patches.sort((a, b) => a.id.localeCompare(b.id));
  return patches;
}

async function buildIndices(workflow, packages) {
  const generatedAt = new Date().toISOString();
  const enrichedPackages = [];

  for (const pkg of packages) {
    const patches = await collectPatchMetadata(workflow, pkg.id);
    enrichedPackages.push({
      ...pkg,
      sourcePath: path.relative(workflow.sourceRoot, pkg.path),
      stagingPath: path.relative(workflow.stagingRoot, path.join(workflow.stagingRoot, pkg.id)),
      productionPath: path.relative(workflow.productionRoot, path.join(workflow.productionRoot, pkg.id)),
      patchCount: patches.length,
      patches,
      displayName: titleCase(pkg.id),
    });
  }

  const indexPayload = {
    generatedAt,
    sourceRoot: relativeToCwd(workflow.sourceRoot),
    stagingRoot: relativeToCwd(workflow.stagingRoot),
    productionRoot: relativeToCwd(workflow.productionRoot),
    packages: enrichedPackages,
  };

  const siteManifest = {
    generatedAt,
    packages: enrichedPackages.map((pkg) => ({
      id: pkg.id,
      displayName: pkg.displayName,
      status: pkg.status,
      validated: pkg.validated,
      stagedAt: pkg.stagedAt,
      promotedAt: pkg.promotedAt,
      approvals: pkg.approvals,
      patchCount: pkg.patchCount,
      patches: pkg.patches.map((patch) => ({
        id: patch.id,
        title: patch.title,
        path: patch.path,
      })),
    })),
  };

  const indexPath = path.join(workflow.stagingRoot, 'index.json');
  const manifestPath = path.join(workflow.stagingRoot, 'site_manifest.json');

  await writeJson(indexPath, indexPayload);
  await writeJson(manifestPath, siteManifest);

  return { indexPath, manifestPath };
}

export async function prepareStaging(options = {}) {
  const {
    actor = process.env.PUBLISHING_ACTOR || 'staging-bot',
    includeUnvalidated = false,
    workflowOptions = {},
  } = options;

  const workflow = await createPublishingWorkflow(workflowOptions);
  const packages = await workflow.listPackages();

  const staged = [];
  const skipped = [];

  for (const pkg of packages) {
    if (!pkg.validated && !includeUnvalidated) {
      skipped.push({ id: pkg.id, reason: 'not-validated' });
      continue;
    }
    const force = includeUnvalidated && !pkg.validated;
    const result = await workflow.stagePackage(pkg.id, { actor, force });
    staged.push({ id: pkg.id, stagingPath: result.stagingPath });
  }

  const finalPackages = await workflow.listPackages();
  const indices = await buildIndices(workflow, finalPackages);

  return {
    staged,
    skipped,
    indices,
  };
}

function parseCliArgs(argv) {
  const options = {
    includeUnvalidated: false,
    actor: process.env.PUBLISHING_ACTOR || 'staging-bot',
  };
  for (const arg of argv) {
    if (arg === '--include-unvalidated') {
      options.includeUnvalidated = true;
    } else if (arg.startsWith('--actor=')) {
      const value = arg.slice('--actor='.length);
      if (value) {
        options.actor = value;
      }
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }
  return options;
}

async function runCli() {
  const args = parseCliArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      'Usage: node services/publishing/staging.js [--actor=NAME] [--include-unvalidated]\n'
    );
    process.exit(0);
  }

  try {
    const result = await prepareStaging({
      actor: args.actor,
      includeUnvalidated: args.includeUnvalidated,
    });
    process.stdout.write(
      `Staging completed. Packages staged: ${result.staged.length}. ` +
        `Skipped: ${result.skipped.length}.\n` +
        `Index: ${relativeToCwd(result.indices.indexPath)}\n` +
        `Site manifest: ${relativeToCwd(result.indices.manifestPath)}\n`
    );
  } catch (error) {
    process.stderr.write(`Staging failed: ${error.message}\n`);
    process.exit(1);
  }
}

const isCli = (() => {
  const thisFile = fileURLToPath(import.meta.url);
  return process.argv[1] && path.resolve(process.argv[1]) === thisFile;
})();

if (isCli) {
  runCli();
}
