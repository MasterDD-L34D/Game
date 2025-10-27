import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Script } from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

function createSandbox() {
  const logs = [];
  const scriptProperties = new Map();
  const sandbox = {
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty(key) {
            return scriptProperties.get(key) || null;
          },
          setProperty(key, value) {
            scriptProperties.set(key, value);
          }
        };
      }
    },
    Logger: {
      log(message) {
        logs.push(String(message));
      }
    },
    CacheService: {
      getScriptCache() {
        return {
          get() {
            return null;
          },
          put() {}
        };
      }
    },
    UrlFetchApp: {
      fetch() {
        throw new Error('fetch non supportato nel test');
      }
    },
    DriveApp: {
      getFolderById() {
        throw new Error('Drive non mockato in questo test');
      }
    },
    SpreadsheetApp: {},
    ScriptApp: {},
    MimeType: {
      PLAIN_TEXT: 'text/plain',
      GOOGLE_SHEETS: 'application/vnd.google-apps.spreadsheet'
    },
    console,
    __logs: logs
  };

  const scriptPath = join(process.cwd(), 'scripts', 'driveSync.gs');
  const source = readFileSync(scriptPath, 'utf8');
  const script = new Script(source, { filename: 'driveSync.gs' });
  script.runInNewContext(sandbox);
  return sandbox;
}

test('normalizeSourceConfig_ merge filters and logLevel', () => {
  const sandbox = createSandbox();
  const normalized = sandbox.normalizeSourceConfig_(
    {
      id: 'test',
      folderId: 'folder-123',
      destinationFolderId: 'folder-456',
      logLevel: 'DEBUG',
      filters: {
        allowedRecipients: ['HUD', 'pi.balance.alerts'],
        allowedStatuses: ['Raised'],
        recipientsMode: 'all'
      }
    },
    {
      folderId: 'folder-123',
      destinationFolderId: 'folder-456',
      filters: {
        allowedStatuses: ['Cleared'],
        blockedRecipients: ['legacy-team']
      }
    }
  );

  assert.equal(normalized.logLevel, 'debug');
  assert.deepEqual([...normalized.filters.allowedRecipients].sort(), ['hud', 'pi.balance.alerts']);
  assert.ok(normalized.filters.blockedRecipients.includes('legacy-team'));
  assert.deepEqual([...normalized.filters.allowedStatuses].sort(), ['cleared', 'raised']);
  assert.equal(normalized.filters.recipientsMode, 'all');
});

test('applyDatasetFilters_ filters hud_alert_log and does not mutate source', () => {
  const sandbox = createSandbox();
  const dataset = {
    hud_alert_log: [
      {
        mission_id: 'alpha',
        status: 'raised',
        recipients: ['HUD', 'pi.balance.alerts']
      },
      {
        mission_id: 'alpha',
        status: 'cleared',
        recipients: ['hud']
      }
    ],
    meta: { cycle: 4 }
  };
  const copyForCall = JSON.parse(JSON.stringify(dataset));
  const normalizedSource = {
    filters: {
      allowedRecipients: ['hud'],
      blockedRecipients: [],
      allowedStatuses: ['raised'],
      blockedStatuses: [],
      recipientsMode: 'any'
    },
    logLevel: 'debug'
  };

  const result = sandbox.applyDatasetFilters_(copyForCall, normalizedSource, 'session-metrics.yaml');
  assert.equal(result.data.hud_alert_log.length, 1);
  assert.equal(result.data.hud_alert_log[0].status, 'raised');
  assert.equal(result.summary.hud_alert_log.removed, 1);
  assert.equal(result.summary.hud_alert_log.kept, 1);
  assert.equal(result.summary.hud_alert_log.total, 2);
  assert.equal(dataset.hud_alert_log.length, 2, 'il dataset originale non deve essere mutato');
  assert.ok(Array.isArray(result.logs));
  assert.ok(result.logs.some(entry => entry.level === 'info'));
});

test('dispatchLogs_ rispetta il livello di log', () => {
  const sandbox = createSandbox();
  const logs = sandbox.__logs;
  sandbox.dispatchLogs_('info', [
    { level: 'info', message: 'info message', meta: { removed: 1 } },
    { level: 'debug', message: 'debug message', meta: { removed: 0 } }
  ]);
  assert.equal(logs.length, 1);
  assert.ok(logs[0].includes('info message'));

  logs.length = 0;
  sandbox.dispatchLogs_('debug', [
    { level: 'info', message: 'info2', meta: { removed: 0 } },
    { level: 'debug', message: 'debug2', meta: { removed: 0 } }
  ]);
  assert.equal(logs.length, 2);
});
