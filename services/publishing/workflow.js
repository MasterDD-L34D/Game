import { promises as fs } from 'node:fs';
import path from 'node:path';

async function ensureDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJson(filePath, fallback) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
}

async function writeJson(filePath, payload) {
  await ensureDirectory(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

async function removeIfExists(targetPath) {
  try {
    await fs.rm(targetPath, { recursive: true, force: true });
  } catch (error) {
    if (!error || error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function copyDirectory(source, destination) {
  await ensureDirectory(path.dirname(destination));
  await fs.cp(source, destination, { recursive: true });
}

function normaliseHistoryEntry(entry) {
  return {
    timestamp: entry?.timestamp || new Date().toISOString(),
    actor: entry?.actor || 'system',
    action: entry?.action || 'update',
    notes: entry?.notes || null,
    metadata: entry?.metadata || {},
  };
}

export class PublishingWorkflow {
  constructor(options = {}) {
    const cwd = options.cwd || process.cwd();
    this.sourceRoot = path.resolve(cwd, options.sourceRoot || 'packs/evo_tactics_pack/out/patches');
    this.stagingRoot = path.resolve(cwd, options.stagingRoot || 'packs/evo_tactics_pack/out/staging');
    this.productionRoot = path.resolve(cwd, options.productionRoot || 'packs/evo_tactics_pack/out/production');
    this.validationReport = path.resolve(
      cwd,
      options.validationReport || 'packs/evo_tactics_pack/out/validation/last_report.json'
    );
    this.stateFile = path.resolve(cwd, options.stateFile || 'services/publishing/workflowState.json');
    this.initialised = false;
    this.state = { packages: {} };
  }

  async initialise() {
    if (this.initialised) {
      return;
    }
    await ensureDirectory(this.sourceRoot);
    await ensureDirectory(this.stagingRoot);
    await ensureDirectory(this.productionRoot);
    this.state = await readJson(this.stateFile, { packages: {} });
    this.initialised = true;
  }

  async listPackages() {
    await this.initialise();
    const entries = await fs.readdir(this.sourceRoot, { withFileTypes: true }).catch((error) => {
      if (error && error.code === 'ENOENT') {
        return [];
      }
      throw error;
    });
    const names = entries.filter((dirent) => dirent.isDirectory()).map((dirent) => dirent.name);
    const validationMap = await this._loadValidationMap(names);

    return names.map((name) => {
      const state = this.state.packages[name] || {};
      return {
        id: name,
        path: path.join(this.sourceRoot, name),
        validated: validationMap[name] ?? false,
        status: state.status || 'pending',
        stagedAt: state.stagedAt || null,
        promotedAt: state.promotedAt || null,
        approvals: state.approvals || [],
        history: state.history || [],
      };
    });
  }

  async getPackage(packageId) {
    const packages = await this.listPackages();
    return packages.find((pkg) => pkg.id === packageId) || null;
  }

  async stagePackage(packageId, options = {}) {
    const actor = options.actor || 'system';
    const pkg = await this.getPackage(packageId);
    if (!pkg) {
      throw new Error(`Pacchetto ${packageId} non trovato nella directory sorgente`);
    }
    if (!pkg.validated) {
      throw new Error(`Pacchetto ${packageId} non risulta validato dall'ultimo report`);
    }

    const destination = path.join(this.stagingRoot, packageId);
    await removeIfExists(destination);
    await copyDirectory(pkg.path, destination);

    this._ensureStateEntry(packageId);
    this.state.packages[packageId].status = 'staged';
    this.state.packages[packageId].stagedAt = new Date().toISOString();
    this._recordHistory(packageId, {
      actor,
      action: 'staged',
      notes: `Pacchetto copiato in staging (${destination})`,
    });
    await this._persistState();

    return {
      id: packageId,
      path: pkg.path,
      stagingPath: destination,
      status: 'staged',
    };
  }

  async requestApproval(packageId, approver, note = '') {
    if (!approver) {
      throw new Error('Specificare un approvatore valido per la richiesta');
    }
    await this.initialise();
    this._ensureStateEntry(packageId);
    const pkgState = this.state.packages[packageId];
    pkgState.approvals = pkgState.approvals || [];
    pkgState.approvals.push({
      approver,
      status: 'requested',
      requestedAt: new Date().toISOString(),
      note,
    });
    pkgState.status = pkgState.status === 'staged' ? 'awaiting-approval' : pkgState.status;
    this._recordHistory(packageId, {
      actor: approver,
      action: 'approval-requested',
      notes: note || 'Richiesta approvazione pubblicazione',
    });
    await this._persistState();
    return pkgState;
  }

  async approvePackage(packageId, approver, note = '') {
    if (!approver) {
      throw new Error('Specificare un approvatore valido');
    }
    await this.initialise();
    this._ensureStateEntry(packageId);
    const pkgState = this.state.packages[packageId];
    pkgState.approvals = pkgState.approvals || [];
    pkgState.approvals.push({
      approver,
      status: 'approved',
      approvedAt: new Date().toISOString(),
      note,
    });
    pkgState.status = 'approved';
    this._recordHistory(packageId, {
      actor: approver,
      action: 'approved',
      notes: note || 'Approvazione completata',
    });
    await this._persistState();
    return pkgState;
  }

  async promoteToProduction(packageId, options = {}) {
    const actor = options.actor || 'system';
    const force = Boolean(options.force);
    await this.initialise();
    const pkg = await this.getPackage(packageId);
    if (!pkg) {
      throw new Error(`Pacchetto ${packageId} non disponibile`);
    }
    if (pkg.status !== 'approved' && !force) {
      throw new Error(`Pacchetto ${packageId} non approvato. Usa force=true per ignorare il gate.`);
    }

    const sourceDir = await this._resolvePromotionSource(packageId);
    const destination = path.join(this.productionRoot, packageId);
    await removeIfExists(destination);
    await copyDirectory(sourceDir, destination);

    this._ensureStateEntry(packageId);
    const pkgState = this.state.packages[packageId];
    pkgState.status = 'production';
    pkgState.promotedAt = new Date().toISOString();
    this._recordHistory(packageId, {
      actor,
      action: 'promoted',
      notes: `Deploy su produzione (${destination})`,
    });
    await this._persistState();

    return {
      id: packageId,
      productionPath: destination,
      status: 'production',
    };
  }

  async summary() {
    await this.initialise();
    const packages = await this.listPackages();
    const totals = packages.reduce(
      (acc, pkg) => {
        acc.total += 1;
        acc.validated += pkg.validated ? 1 : 0;
        if (pkg.status === 'staged') {
          acc.staged += 1;
        }
        if (pkg.status === 'approved') {
          acc.approved += 1;
        }
        if (pkg.status === 'production') {
          acc.production += 1;
        }
        return acc;
      },
      { total: 0, validated: 0, staged: 0, approved: 0, production: 0 }
    );

    return {
      packages,
      totals,
      stateFile: this.stateFile,
      stagingRoot: this.stagingRoot,
      productionRoot: this.productionRoot,
    };
  }

  _ensureStateEntry(packageId) {
    if (!this.state.packages[packageId]) {
      this.state.packages[packageId] = { approvals: [], history: [] };
    }
  }

  _recordHistory(packageId, entry) {
    this._ensureStateEntry(packageId);
    const historyEntry = normaliseHistoryEntry(entry);
    const history = this.state.packages[packageId].history || [];
    history.push(historyEntry);
    this.state.packages[packageId].history = history;
  }

  async _persistState() {
    await writeJson(this.stateFile, this.state);
  }

  async _resolvePromotionSource(packageId) {
    const stagingPath = path.join(this.stagingRoot, packageId);
    try {
      const stats = await fs.stat(stagingPath);
      if (stats.isDirectory()) {
        return stagingPath;
      }
    } catch (error) {
      if (!error || error.code !== 'ENOENT') {
        throw error;
      }
    }
    return path.join(this.sourceRoot, packageId);
  }

  async _loadValidationMap(names = []) {
    const map = {};
    if (!names.length) {
      return map;
    }
    let payload;
    try {
      payload = await readJson(this.validationReport, { reports: [] });
    } catch (error) {
      return map;
    }
    const reports = Array.isArray(payload.reports) ? payload.reports : [];
    const normalisedNames = names.map((name) => ({
      name,
      tokens: [name, name.replace(/[-_]/g, ''), name.toLowerCase()],
    }));

    for (const { cmd, code } of reports) {
      if (typeof cmd !== 'string') {
        continue;
      }
      const lower = cmd.toLowerCase();
      for (const entry of normalisedNames) {
        if (entry.tokens.some((token) => token && lower.includes(token))) {
          const success = code === 0;
          if (success && map[entry.name] === undefined) {
            map[entry.name] = true;
          } else if (!success) {
            map[entry.name] = false;
          }
        }
      }
    }
    return map;
  }
}

export async function createPublishingWorkflow(options = {}) {
  const workflow = new PublishingWorkflow(options);
  await workflow.initialise();
  return workflow;
}
