#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');

const DEFAULT_LOG_PATH = path.join(process.cwd(), 'logs', 'agent_workflow.log');
const TELEMETRY_ENABLED_VALUES = new Set(['1', 'true', 'yes', 'on']);

const isTelemetryEnabled = () => TELEMETRY_ENABLED_VALUES.has(String(process.env.AGENT_TELEMETRY_ENABLED || '').toLowerCase());

const resolveLogPath = () => process.env.AGENT_TELEMETRY_PATH || DEFAULT_LOG_PATH;

const sanitizeMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return undefined;
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value === null || value === undefined) continue;
    const valueType = typeof value;
    if (valueType === 'string') {
      sanitized[key] = value.slice(0, 500);
    } else if (valueType === 'number' || valueType === 'boolean') {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      sanitized[key] = value
        .map((entry) => {
          if (entry === null || entry === undefined) return null;
          if (typeof entry === 'string') return entry.slice(0, 120);
          if (typeof entry === 'number' || typeof entry === 'boolean') return entry;
          return null;
        })
        .filter((entry) => entry !== null)
        .slice(0, 20);
    }
  }

  return Object.keys(sanitized).length ? sanitized : undefined;
};

const appendEvent = async (payload) => {
  if (!isTelemetryEnabled()) return null;

  const logPath = resolveLogPath();
  const event = {
    timestamp: new Date().toISOString(),
    ...payload,
  };

  event.metadata = sanitizeMetadata(event.metadata);
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  await fs.appendFile(logPath, `${JSON.stringify(event)}\n`, 'utf8');
  return logPath;
};

const logAgentSelection = async ({
  sessionId,
  requestedAgent,
  selectedAgent,
  router,
  latencyMs,
  reason,
  metadata,
}) =>
  appendEvent({
    step: 'agent_selection',
    sessionId,
    requestedAgent,
    selectedAgent,
    router,
    latencyMs,
    reason,
    metadata,
  });

const logCommandApplication = async ({
  sessionId,
  command,
  target,
  success,
  durationMs,
  metadata,
}) =>
  appendEvent({
    step: 'command_application',
    sessionId,
    command,
    target,
    success,
    durationMs,
    metadata,
  });

const logPatchConfirmation = async ({
  sessionId,
  patchId,
  accepted,
  durationMs,
  metadata,
}) =>
  appendEvent({
    step: 'patch_confirmation',
    sessionId,
    patchId,
    accepted,
    durationMs,
    metadata,
  });

const logEvent = async (payload) => appendEvent(payload);

const help = () => {
  const lines = [
    '# Uso rapido: agent_flow_telemetry.js',
    '',
    'AGENT_TELEMETRY_ENABLED=1 node scripts/agent_flow_telemetry.js --demo',
    '',
    'Variabili supportate:',
    '- AGENT_TELEMETRY_ENABLED=1|true per attivare la scrittura degli eventi',
    '- AGENT_TELEMETRY_PATH per sovrascrivere logs/agent_workflow.log',
    '',
    'API (require):',
    '- logAgentSelection({ sessionId, requestedAgent, selectedAgent, router, latencyMs, reason, metadata })',
    '- logCommandApplication({ sessionId, command, target, success, durationMs, metadata })',
    '- logPatchConfirmation({ sessionId, patchId, accepted, durationMs, metadata })',
    '- logEvent(payload) per eventi custom',
  ];
  console.log(lines.join('\n'));
};

const runDemo = async () => {
  const sessionId = `demo-${Date.now()}`;
  await logAgentSelection({
    sessionId,
    requestedAgent: 'auto',
    selectedAgent: 'dev-tooling',
    router: 'router.md',
    latencyMs: 120,
    reason: 'Task di automazione',
    metadata: { requestId: 'demo-run' },
  });

  await logCommandApplication({
    sessionId,
    command: 'APPLICA_PATCHSET',
    target: 'tools/',
    success: true,
    durationMs: 2400,
    metadata: { files: 3 },
  });

  await logPatchConfirmation({
    sessionId,
    patchId: 'demo-patch-01',
    accepted: true,
    durationMs: 350,
    metadata: { reviewer: 'human-ops' },
  });

  const logPath = resolveLogPath();
  console.log(`Demo completata. Eventi scritti in ${logPath}`);
};

const main = async () => {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    help();
    return;
  }
  if (args.includes('--demo')) {
    if (!isTelemetryEnabled()) {
      console.error('Demo richiede AGENT_TELEMETRY_ENABLED=1');
      process.exit(1);
    }
    await runDemo();
    return;
  }
  help();
};

if (require.main === module) {
  main().catch((error) => {
    console.error('Errore telemetria agenti:', error.message);
    process.exit(1);
  });
}

module.exports = {
  logAgentSelection,
  logCommandApplication,
  logPatchConfirmation,
  logEvent,
  isTelemetryEnabled,
  resolveLogPath,
};
