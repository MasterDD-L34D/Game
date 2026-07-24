const fs = require('node:fs/promises');
const path = require('node:path');

function resolveLogPath(options = {}) {
  if (options.filePath) {
    return options.filePath;
  }
  if (process.env.AUDIT_LOG_PATH) {
    return process.env.AUDIT_LOG_PATH;
  }
  return path.resolve(__dirname, '..', 'logs', 'audit.log');
}

function createAuditLogger(options = {}) {
  const targetPath = resolveLogPath(options);
  const disabled = options.disabled || false;

  async function append(entry) {
    if (disabled || !targetPath) {
      return;
    }
    const line = `${JSON.stringify(entry)}\n`;
    try {
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.appendFile(targetPath, line, 'utf8');
    } catch (error) {
      console.warn('[audit] impossibile registrare evento', error);
    }
  }

  function buildEntry(req, action, metadata = {}) {
    const now = new Date().toISOString();
    const auth = req?.auth || {};
    const user = auth.userId || auth.user || auth.email || null;
    const roles = Array.isArray(auth.roles) ? auth.roles : [];
    const ip = req?.ip || req?.connection?.remoteAddress || null;
    const requestId = req?.headers?.['x-request-id'] || req?.id || null;
    return {
      timestamp: now,
      action,
      user,
      roles,
      ip,
      requestId,
      metadata,
    };
  }

  async function record(req, action, metadata = {}) {
    await append(buildEntry(req, action, metadata));
  }

  return {
    record,
  };
}

module.exports = {
  createAuditLogger,
};
