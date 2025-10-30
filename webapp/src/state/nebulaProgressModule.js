import { computed } from 'vue';
import { atlasDataset } from './atlasDataset.js';

function normaliseArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values.filter((value) => typeof value === 'string' && value.trim().length > 0);
}

function readinessTone(readiness) {
  if (!readiness) {
    return 'neutral';
  }
  const value = readiness.toLowerCase();
  if (value.includes('approvazione') || value.includes('attesa')) {
    return 'warning';
  }
  if (value.includes('freeze') || value.includes('validazione completata') || value.includes('pronto')) {
    return 'success';
  }
  if (value.includes('richiede')) {
    return 'critical';
  }
  return 'neutral';
}

function coverageStage(percent) {
  if (percent >= 85) {
    return 'Mega';
  }
  if (percent >= 70) {
    return 'Ultimate';
  }
  if (percent >= 55) {
    return 'Champion';
  }
  return 'Rookie';
}

function computeHistory(percent, qaPercent) {
  const finalPoint = Number.isFinite(percent) ? percent : 0;
  const qaReference = Number.isFinite(qaPercent) ? qaPercent : finalPoint * 0.6;
  const baseline = Math.max(Math.min(finalPoint - 12, finalPoint), 0);
  const history = [
    Math.max(Math.round(qaReference * 0.6), 0),
    Math.max(Math.round((qaReference + baseline) / 2), 0),
    Math.max(Math.round((baseline + finalPoint) / 2), 0),
    Math.max(Math.round(finalPoint), 0),
  ];
  const deduped = history.filter((value, index, array) => index === 0 || value !== array[index - 1]);
  return deduped.length >= 2 ? deduped : [Math.max(Math.round(finalPoint * 0.6), 0), Math.max(Math.round(finalPoint), 0)];
}

function formatRelativeTime(timestamp) {
  if (!timestamp) {
    return 'Sync non disponibile';
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return `Sync: ${timestamp}`;
  }
  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) {
    return 'Sync adesso';
  }
  if (diff < hour) {
    const minutes = Math.round(diff / minute);
    return `Sync ${minutes} min fa`;
  }
  if (diff < day) {
    const hours = Math.round(diff / hour);
    return `Sync ${hours}h fa`;
  }
  const days = Math.round(diff / day);
  return `Sync ${days}g fa`;
}

export function useNebulaProgressModule(sources) {
  const overview = computed(() => sources?.overview?.value || {});
  const qualityRelease = computed(() => sources?.qualityRelease?.value || {});
  const timelineState = computed(() => sources?.timeline?.value || {});

  const dataset = atlasDataset;

  const objectives = computed(() => normaliseArray(overview.value.objectives));
  const blockers = computed(() => normaliseArray(overview.value.blockers));

  const qaChecks = computed(() => {
    const checks = qualityRelease.value.checks || {};
    return Object.entries(checks)
      .map(([id, entry]) => ({
        id,
        passed: Number(entry?.passed) || 0,
        total: Number(entry?.total) || 0,
      }))
      .filter((entry) => entry.total > 0);
  });

  const qaSummary = computed(() => {
    const total = qaChecks.value.reduce((acc, entry) => acc + entry.total, 0);
    const completed = qaChecks.value.reduce((acc, entry) => acc + entry.passed, 0);
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      total,
      completed,
      percent,
      label: total > 0 ? `${completed}/${total} QA checks` : 'QA checks in setup',
      lastRun: qualityRelease.value.lastRun || null,
    };
  });

  const cards = computed(() => {
    const entries = [];
    for (const objective of objectives.value) {
      entries.push({
        id: `objective-${entries.length}`,
        title: 'Obiettivo',
        body: objective,
        tone: 'objective',
      });
    }
    for (const blocker of blockers.value) {
      entries.push({
        id: `blocker-${entries.length}`,
        title: 'Blocker',
        body: blocker,
        tone: 'blocker',
      });
    }
    entries.push({
      id: 'qa-progress',
      title: 'QA Sync',
      body: qaSummary.value.label,
      tone: qaSummary.value.percent >= 80 ? 'success' : qaSummary.value.percent >= 50 ? 'warning' : 'neutral',
      progress: qaSummary.value.percent,
    });
    const completion = overview.value?.completion || {};
    const total = Number(completion.total) || 0;
    const completed = Number(completion.completed) || 0;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    entries.push({
      id: 'milestone-progress',
      title: 'Milestone',
      body: total > 0 ? `${completed}/${total} milestone confermate` : 'Milestone da definire',
      tone: percent >= 70 ? 'success' : 'neutral',
      progress: percent,
    });
    return entries;
  });

  const qaPercent = computed(() => qaSummary.value.percent);

  const evolutionMatrix = computed(() => {
    return (dataset.species || []).map((species) => {
      const coverage = Number(species.telemetry?.coverage) || 0;
      const percent = Math.round(coverage * 100);
      const stage = coverageStage(percent);
      const tone = readinessTone(species.readiness);
      const history = computeHistory(percent, qaPercent.value);
      return {
        id: species.id,
        name: species.name,
        readiness: species.readiness || 'In progress',
        readinessTone: tone,
        telemetryOwner: species.telemetry?.curatedBy || 'QA Core',
        telemetryCoverage: percent,
        telemetryHistory: history,
        telemetryLabel: `${percent}% copertura`,
        telemetryTimestamp: formatRelativeTime(species.telemetry?.lastValidation),
        stage,
      };
    });
  });

  const timelineEntries = computed(() => {
    const entries = [];
    const referenceTime = qaSummary.value.lastRun || timelineState.value?.lastSync || null;

    objectives.value.forEach((objective, index) => {
      entries.push({
        id: `objective-${index}`,
        title: 'Obiettivo Nebula',
        status: 'info',
        summary: objective,
        timestamp: referenceTime,
      });
    });

    (dataset.species || [])
      .slice()
      .sort((a, b) => {
        const timeA = new Date(a.telemetry?.lastValidation || 0).getTime();
        const timeB = new Date(b.telemetry?.lastValidation || 0).getTime();
        return timeB - timeA;
      })
      .forEach((species) => {
        entries.push({
          id: `species-${species.id}`,
          title: species.name,
          status: readinessTone(species.readiness),
          summary: species.readiness || 'Readiness non definita',
          timestamp: species.telemetry?.lastValidation || referenceTime,
          meta: species.telemetry?.curatedBy ? `Curato da ${species.telemetry.curatedBy}` : null,
        });
      });

    qaChecks.value.forEach((check) => {
      entries.push({
        id: `qa-${check.id}`,
        title: `QA · ${check.id}`,
        status: check.passed >= check.total ? 'success' : 'warning',
        summary: `${check.passed}/${check.total} verifiche completate`,
        timestamp: qaSummary.value.lastRun || referenceTime,
      });
    });

    blockers.value.forEach((blocker, index) => {
      entries.push({
        id: `blocker-${index}`,
        title: 'Blocker',
        status: 'critical',
        summary: blocker,
        timestamp: referenceTime,
      });
    });

    return entries;
  });

  const header = computed(() => ({
    datasetId: dataset.id,
    title: dataset.title,
    summary: dataset.summary,
    releaseWindow: dataset.releaseWindow,
    curator: dataset.curator,
  }));

  const share = computed(() => {
    const payload = {
      datasetId: dataset.id,
      generatedAt: new Date().toISOString(),
      overview: {
        objectives: objectives.value,
        blockers: blockers.value,
        completion: overview.value?.completion || {},
      },
      qa: {
        percent: qaSummary.value.percent,
        completed: qaSummary.value.completed,
        total: qaSummary.value.total,
        lastRun: qaSummary.value.lastRun,
        checks: qaChecks.value,
      },
      timeline: timelineEntries.value.map((entry) => ({
        id: entry.id,
        title: entry.title,
        status: entry.status,
        summary: entry.summary,
        timestamp: entry.timestamp,
        meta: entry.meta || null,
      })),
      readiness: evolutionMatrix.value.map((entry) => ({
        id: entry.id,
        name: entry.name,
        stage: entry.stage,
        readiness: entry.readiness,
        readinessTone: entry.readinessTone,
        telemetry: {
          coverage: entry.telemetryCoverage,
          history: entry.telemetryHistory,
          owner: entry.telemetryOwner,
          label: entry.telemetryLabel,
          lastSync: entry.telemetryTimestamp,
        },
      })),
    };
    const json = JSON.stringify(payload, null, 2);
    const embedSnippet = `<script type="application/json" id="nebula-progress-${dataset.id}">\n${json}\n<\/script>`;
    return {
      datasetId: dataset.id,
      payload,
      json,
      embedSnippet,
    };
  });

  return {
    header,
    cards,
    timelineEntries,
    evolutionMatrix,
    share,
  };
}
