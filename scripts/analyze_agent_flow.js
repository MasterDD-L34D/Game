#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');

const DEFAULT_LOG_PATH = path.join(process.cwd(), 'logs', 'agent_workflow.log');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = { logPath: DEFAULT_LOG_PATH, thresholdMs: 2000 };
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token === '--help' || token === '-h') {
      options.help = true;
      break;
    } else if (token === '--log' && args[i + 1]) {
      options.logPath = path.resolve(args[i + 1]);
      i += 1;
    } else if (token === '--threshold' && args[i + 1]) {
      options.thresholdMs = Number(args[i + 1]);
      i += 1;
    }
  }
  return options;
};

const readLogLines = async (logPath) => {
  try {
    const raw = await fs.readFile(logPath, 'utf8');
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
};

const parseEvents = (lines) => {
  const events = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === 'object') {
        events.push(parsed);
      }
    } catch (error) {
      // Ignora righe malformate senza interrompere l'analisi.
    }
  }
  return events;
};

const summarizeDurations = (events) => {
  const perStep = new Map();
  const sessions = new Map();

  for (const event of events) {
    const { step, durationMs, latencyMs, sessionId } = event;
    const timing = typeof durationMs === 'number' ? durationMs : typeof latencyMs === 'number' ? latencyMs : null;
    if (step && timing !== null) {
      if (!perStep.has(step)) {
        perStep.set(step, { count: 0, total: 0, max: 0 });
      }
      const stats = perStep.get(step);
      stats.count += 1;
      stats.total += timing;
      stats.max = Math.max(stats.max, timing);
    }

    if (sessionId && timing !== null) {
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, { total: 0, events: 0 });
      }
      const bucket = sessions.get(sessionId);
      bucket.total += timing;
      bucket.events += 1;
    }
  }

  return { perStep, sessions };
};

const findBottlenecks = (events, thresholdMs) => {
  const flagged = [];
  for (const event of events) {
    const timing = typeof event.durationMs === 'number' ? event.durationMs : typeof event.latencyMs === 'number' ? event.latencyMs : null;
    if (timing !== null && timing >= thresholdMs) {
      flagged.push({
        step: event.step || 'unknown',
        sessionId: event.sessionId || 'n/a',
        timing,
        command: event.command,
        patchId: event.patchId,
        timestamp: event.timestamp,
      });
    }
  }

  flagged.sort((a, b) => b.timing - a.timing);
  return flagged.slice(0, 10);
};

const formatStepStats = (perStep) =>
  Array.from(perStep.entries())
    .map(([step, stats]) => ({
      step,
      count: stats.count,
      avg: stats.count ? Math.round(stats.total / stats.count) : 0,
      max: Math.round(stats.max),
    }))
    .sort((a, b) => b.avg - a.avg);

const printReport = ({ events, perStep, sessions, bottlenecks, options }) => {
  console.log('=== Agent workflow telemetry ===');
  console.log(`Log analizzato: ${options.logPath}`);
  console.log(`Eventi letti: ${events.length}`);
  console.log('');

  if (!events.length) {
    console.log('Nessun evento trovato. Abilita la telemetria e riesegui un flusso.');
    return;
  }

  console.log('--- Durate per step (ms) ---');
  for (const entry of formatStepStats(perStep)) {
    console.log(`- ${entry.step}: avg=${entry.avg} max=${entry.max} (n=${entry.count})`);
  }
  console.log('');

  const sessionEntries = Array.from(sessions.entries())
    .map(([sessionId, stats]) => ({ sessionId, total: stats.total, events: stats.events }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  console.log('--- Sessioni più pesanti ---');
  for (const entry of sessionEntries) {
    console.log(`- ${entry.sessionId}: totale=${Math.round(entry.total)}ms su ${entry.events} eventi`);
  }
  console.log('');

  console.log(`--- Colli di bottiglia (> ${options.thresholdMs} ms) ---`);
  if (!bottlenecks.length) {
    console.log('Nessun evento sopra soglia.');
  } else {
    for (const entry of bottlenecks) {
      console.log(
        `- ${entry.step} (${entry.sessionId}): ${entry.timing}ms` +
          (entry.command ? ` command=${entry.command}` : '') +
          (entry.patchId ? ` patch=${entry.patchId}` : ''),
      );
    }
  }
};

const main = async () => {
  const options = parseArgs();
  if (options.help) {
    console.log('Usage: node scripts/analyze_agent_flow.js [--log path] [--threshold ms]');
    console.log('Default log: logs/agent_workflow.log; default threshold: 2000ms');
    return;
  }

  const lines = await readLogLines(options.logPath);
  const events = parseEvents(lines);
  const { perStep, sessions } = summarizeDurations(events);
  const bottlenecks = findBottlenecks(events, options.thresholdMs);
  printReport({ events, perStep, sessions, bottlenecks, options });
};

if (require.main === module) {
  main().catch((error) => {
    console.error('Analisi telemetria fallita:', error.message);
    process.exit(1);
  });
}
