// =============================================================================
// Skiv-as-Monitor routes — exposes creature state + git-event feed via HTTP.
//
// GET  /api/skiv/status        current state snapshot (gauges, level, mood)
// GET  /api/skiv/feed?limit=N  JSONL feed tail (default 50, max 500)
// GET  /api/skiv/card          ASCII card pre-rendered (text/plain)
// POST /api/skiv/webhook       optional GitHub webhook receiver (HMAC verify)
//
// Storage produced by tools/py/skiv_monitor.py:
//   data/derived/skiv_monitor/{state.json, feed.jsonl, cursor.json}
// =============================================================================

'use strict';

const express = require('express');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

// @octokit/webhooks — typed payload verify + event handler abstraction.
// Approved Master DD 2026-04-26 (PR #1849 proposal). Replaces hand-rolled
// HMAC verify + manual switch with battle-tested Octokit official lib.
// Backward compat preserved: inline `verifyWebhookSignature` + `buildFeedEntryFromWebhook`
// still exported for legacy users / tests.
let octokitWebhooks = null;
try {
  const { Webhooks } = require('@octokit/webhooks');
  octokitWebhooks = Webhooks;
} catch {
  // Octokit not installed — fallback to hand-rolled. Should not happen post-merge
  // but keep graceful degrade for monorepo workspaces without backend deps.
}

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const DATA_DIR = path.join(ROOT_DIR, 'data', 'derived', 'skiv_monitor');
const STATE_PATH = path.join(DATA_DIR, 'state.json');
const FEED_PATH = path.join(DATA_DIR, 'feed.jsonl');

const FALLBACK_STATE = {
  schema_version: '0.1.0',
  unit_id: 'skiv',
  species_id: 'dune_stalker',
  species_label: 'Arenavenator vagans',
  biome: 'savana',
  job: 'stalker',
  level: 1,
  xp: 0,
  xp_next: 100,
  form: 'INTP',
  form_confidence: 0.5,
  gauges: { hp: 10, hp_max: 10, ap: 2, ap_max: 2, sg: 0, sg_max: 3 },
  currencies: { pe: 0, pi: 0 },
  cabinet: { slots_max: 3, slots_used: 0, internalized: [] },
  bond: {},
  pressure_tier: 1,
  sentience_tier: 'T1',
  mood: 'dormant',
  stress: 0,
  composure: 0,
  curiosity: 0,
  resolution_count: 0,
  perk_pending: 0,
  evolve_opportunity: 0,
  last_voice: 'Sabbia ferma. Aspetto eventi dal repo.',
  last_event_id: '',
  last_updated: '',
  narrative_log_size: 0,
  counters: {
    prs_merged: 0,
    issues_opened: 0,
    issues_closed: 0,
    workflows_passed: 0,
    workflows_failed: 0,
    commits_silent: 0,
    commits_fix: 0,
    commits_revert: 0,
  },
};

// OD-042-A (master-dd 2026-05-16): stato Skiv distribuito via branch
// dedicato `skiv-monitor/state` (no PR-to-main, no git-bloat). Backend
// fetcha quel branch (raw.githubusercontent) con cache TTL + fallback
// graceful al checkout locale (compat deploy senza rete / test con
// statePath|feedPath espliciti = bypass remoto, invariato).
const SKIV_STATE_BRANCH_BASE =
  process.env.SKIV_STATE_BRANCH_BASE ||
  'https://raw.githubusercontent.com/MasterDD-L34D/Game/skiv-monitor/state';
const SKIV_REMOTE_TTL_MS = Number.parseInt(process.env.SKIV_REMOTE_TTL_MS || '120000', 10);
const _remoteCache = new Map(); // relPath → { text, ts }

async function fetchRemoteText(relPath) {
  const cached = _remoteCache.get(relPath);
  if (cached && Date.now() - cached.ts < SKIV_REMOTE_TTL_MS) {
    return cached.text;
  }
  try {
    if (typeof fetch !== 'function') return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`${SKIV_STATE_BRANCH_BASE}/${relPath}`, {
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const text = await res.text();
    _remoteCache.set(relPath, { text, ts: Date.now() });
    return text;
  } catch {
    return null; // rete/abort/branch-assente → fallback locale
  }
}

async function readStateSafe(statePath = STATE_PATH) {
  if (statePath === STATE_PATH) {
    const remote = await fetchRemoteText('data/derived/skiv_monitor/state.json');
    if (remote) {
      try {
        return JSON.parse(remote);
      } catch {
        /* remote corrotto → prosegui a fallback locale */
      }
    }
  }
  try {
    const raw = await fsp.readFile(statePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      return { ...FALLBACK_STATE, _fallback: true };
    }
    throw err;
  }
}

async function readFeedTail(limit = 50, feedPath = FEED_PATH) {
  if (feedPath === FEED_PATH) {
    const remote = await fetchRemoteText('data/derived/skiv_monitor/feed.jsonl');
    if (remote) {
      const rlines = remote.split('\n').filter((l) => l.trim().length > 0);
      return rlines
        .slice(-limit)
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    }
  }
  try {
    const raw = await fsp.readFile(feedPath, 'utf8');
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    const slice = lines.slice(-limit);
    return slice
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

function bar(value, max, width = 10, glyph = '#') {
  if (!Number.isFinite(max) || max <= 0) return '';
  const filled = Math.max(0, Math.min(width, Math.round((width * value) / max)));
  return glyph.repeat(filled) + '.'.repeat(width - filled);
}

function renderLifecycleBar(state) {
  // Phase progression bar [Cucciolo][Giovane][▶ Maturo ◀][Apex][Memoria].
  const lc = state.lifecycle || {};
  const phases = (lc.progression && lc.progression.phases) || [];
  const cur = lc.progression ? lc.progression.current_index : 0;
  if (phases.length === 0) return '';
  const cells = phases.map((p, i) => {
    const lbl = (p.label_it || p.id || '?').slice(0, 9);
    if (i === cur) return `[> ${lbl} <]`;
    if (i < cur) return `[${lbl}]`;
    return `[${lbl}]`;
  });
  return cells.join(' ');
}

function renderAsciiCard(state, recent = []) {
  const g = state.gauges || {};
  const c = state.currencies || {};
  const cab = state.cabinet || {};
  const counters = state.counters || {};
  const lc = state.lifecycle || {};
  const bond = state.bond || {};
  const voice = (state.last_voice || 'Ascolto.').slice(0, 32).padEnd(32);

  const lines = [];
  lines.push('╔══════════════════════════════════════════════════════════════╗');
  lines.push('║           E V O - T A C T I C S   ·   S K I V               ║');
  // Phase-aware sprite (lifecycle YAML sprite_ascii) — fallback to default.
  // sprite can be string (with \n) or array of lines (saga.json format).
  const rawSprite = state.sprite_ascii || lc.sprite_ascii;
  let phaseSprite;
  if (Array.isArray(rawSprite)) phaseSprite = rawSprite;
  else if (typeof rawSprite === 'string') phaseSprite = rawSprite.split('\n');
  else phaseSprite = ['╱\\_/\\', '(  o.o )', ' > ^ <'];
  for (let i = 0; i < 3; i += 1) {
    const sLine = (phaseSprite[i] || '').slice(0, 18).padEnd(18);
    if (i === 1) {
      lines.push(`║         ${sLine}  "${voice}"║`);
    } else {
      lines.push(`║         ${sLine}                                  ║`);
    }
  }
  lines.push('║                                                              ║');
  lines.push(
    `║  ${(state.species_label || '?').slice(0, 30).padEnd(30)} · ${(state.biome || '?').slice(0, 12).padEnd(12)}        ║`,
  );
  lines.push(
    `║  ${(state.job || '?').padEnd(10)} Lv ${String(state.level || 0).padStart(2)}  (${String(
      state.xp || 0,
    ).padStart(4)}/${String(state.xp_next || 0).padStart(4)} XP)            ║`,
  );
  lines.push('║                                                              ║');
  lines.push(
    `║  HP ${bar(g.hp || 0, g.hp_max || 1)} ${String(g.hp || 0).padStart(2)}/${String(
      g.hp_max || 0,
    ).padStart(2)}     AP ${g.ap || 0}/${g.ap_max || 0}  SG ${g.sg || 0}/${g.sg_max || 0}   ║`,
  );
  lines.push(
    `║  PE ${String(c.pe || 0).padStart(4)}   PI ${String(c.pi || 0).padStart(3)}                                ║`,
  );
  lines.push('║                                                              ║');
  lines.push(
    `║  FORM  ${(state.form || '?').padEnd(6)} (${String(Math.round((state.form_confidence || 0) * 100)).padStart(3)}%)                              ║`,
  );
  lines.push(
    `║  CABINET ${cab.slots_used || 0}/${cab.slots_max || 0}   PRESSURE T${state.pressure_tier || 0}   SENT ${(
      state.sentience_tier || '?'
    ).padEnd(6)}║`,
  );
  lines.push('║                                                              ║');
  lines.push(
    `║  EVOLVE OPPS  ${String(state.evolve_opportunity || 0).padStart(2)}     PERK PENDING ${String(
      state.perk_pending || 0,
    ).padStart(2)}             ║`,
  );
  lines.push(
    `║  STRESS ${String(state.stress || 0).padStart(3)}  COMPOSURE ${String(
      state.composure || 0,
    ).padStart(3)}  CURIOSITY ${String(state.curiosity || 0).padStart(3)}      ║`,
  );
  lines.push('║                                                              ║');
  // Bond hearts (F-05 archaeologist quickwin) — Vega + Rhodo cross-PG affinity.
  const bondEntries = Object.entries(bond).slice(0, 3);
  if (bondEntries.length > 0) {
    const bondLine = bondEntries
      .map(([id, n]) => {
        const name = id.split('_')[0].slice(0, 5);
        const hearts = '♥'.repeat(Math.min(Math.max(n || 0, 0), 5));
        return `${name} ${hearts}`;
      })
      .join('  ');
    lines.push(`║  Bond: ${bondLine.slice(0, 50).padEnd(50)}     ║`);
    lines.push('║                                                              ║');
  }
  // Phase + next gate
  if (lc.phase_label_it) {
    lines.push(
      `║  PHASE: ${(lc.phase_label_it || '').slice(0, 24).padEnd(24)}                       ║`,
    );
    if (lc.next_phase_label_it) {
      const ng = lc.next_gate || {};
      const gate = `Lv ${ng.level || '?'} · mut ${ng.mutations_required || 0} · th ${
        ng.thoughts_internalized_required || 0
      }${ng.polarity_required ? ' · pol' : ''}`;
      lines.push(
        `║  NEXT:  ${(lc.next_phase_label_it || '').slice(0, 18).padEnd(18)} (${gate.slice(0, 22).padEnd(22)})  ║`,
      );
    }
    lines.push('║                                                              ║');
  }
  lines.push(
    `║  Repo pulse:  PR ${String(counters.prs_merged || 0).padStart(3)}  ISS+ ${String(
      counters.issues_opened || 0,
    ).padStart(2)}  ISS- ${String(counters.issues_closed || 0).padStart(2)}        ║`,
  );
  lines.push(
    `║               WF✓ ${String(counters.workflows_passed || 0).padStart(3)}  WF✗ ${String(
      counters.workflows_failed || 0,
    ).padStart(2)}  FIX ${String(counters.commits_fix || 0).padStart(3)}        ║`,
  );
  lines.push('╚══════════════════════════════════════════════════════════════╝');
  // Phase progression bar (5-cell) post box.
  const lifecycleBar = renderLifecycleBar(state);
  if (lifecycleBar) {
    lines.push('');
    lines.push('Lifecycle: ' + lifecycleBar);
  }
  if (recent && recent.length) {
    lines.push('');
    lines.push('-- ultimi eventi --');
    const tail = recent.slice(-6);
    for (let i = tail.length - 1; i >= 0; i -= 1) {
      const e = tail[i];
      const ev = e.event || {};
      const ts = (e.ts || '').slice(0, 19);
      const num = ev.number ? `#${ev.number}` : '';
      lines.push(`${ts}  ${ev.kind || '?'} ${num}  ${(ev.summary || '').slice(0, 40)}`);
      lines.push(`  > ${e.voice || ''}`);
    }
  }
  lines.push('');
  lines.push('Sabbia segue.');
  return lines.join('\n');
}

// Phase 4 webhook live: real-time event processing. Maps GitHub webhook payload
// to feed entry + voice line. Mirrors Python map_event for these 3 event_type:
// pull_request (opened/closed merged), issues (opened/closed), workflow_run.
function buildFeedEntryFromWebhook(eventType, payload) {
  const ts = new Date().toISOString();
  if (eventType === 'pull_request') {
    const action = payload.action;
    const pr = payload.pull_request || {};
    if (action === 'closed' && pr.merged) {
      const labels = (pr.labels || []).map((l) => l.name);
      const title = pr.title || '';
      const blob = labels.join(' ') + ' ' + title;
      let category = 'default';
      let voice = 'Sabbia si muove sotto le zampe.';
      if (/p2/i.test(blob)) {
        category = 'feat_p2';
        voice = 'Sento il guscio cambiare. Forma nuova preme.';
      } else if (/p3/i.test(blob)) {
        category = 'feat_p3';
        voice = 'Mestiere nuovo. Le mani sanno prima di me.';
      } else if (/p4/i.test(blob)) {
        category = 'feat_p4';
        voice = 'Voce nuova nella stanza interna.';
      } else if (/p5/i.test(blob)) {
        category = 'feat_p5';
        voice = 'Ho sentito un altro respiro vicino.';
      } else if (/p6/i.test(blob)) {
        category = 'feat_p6';
        voice = 'Sistema preme. Sabbia vibra.';
      } else if (/^fix/i.test(title)) {
        category = 'fix';
        voice = 'Una crepa chiusa. Bene.';
      } else if (/^revert/i.test(title)) {
        category = 'revert';
        voice = 'Era così. Adesso non più.';
      }
      return {
        ts,
        event: {
          id: `pr-${pr.number}`,
          kind: 'pr_merged',
          ts: pr.merged_at || ts,
          number: pr.number,
          title,
          labels,
          html_url: pr.html_url,
          author: (pr.user || {}).login || '?',
        },
        category,
        voice,
        source: 'webhook_live',
      };
    }
  }
  if (eventType === 'issues') {
    const action = payload.action;
    const issue = payload.issue || {};
    if (action === 'opened') {
      return {
        ts,
        event: {
          id: `iss-${issue.number}-open`,
          kind: 'issue_opened',
          ts: issue.created_at || ts,
          number: issue.number,
          title: issue.title || '',
          labels: (issue.labels || []).map((l) => l.name),
          html_url: issue.html_url,
        },
        category: 'issue_open',
        voice: "Domanda nuova nell'aria. Annuso.",
        source: 'webhook_live',
      };
    }
    if (action === 'closed') {
      return {
        ts,
        event: {
          id: `iss-${issue.number}-closed`,
          kind: 'issue_closed',
          ts: issue.closed_at || ts,
          number: issue.number,
          title: issue.title || '',
          labels: (issue.labels || []).map((l) => l.name),
          html_url: issue.html_url,
        },
        category: 'issue_close',
        voice: 'Una voce tace. Pace breve.',
        source: 'webhook_live',
      };
    }
  }
  if (eventType === 'workflow_run') {
    const action = payload.action;
    const run = payload.workflow_run || {};
    if (action === 'completed' && (run.conclusion === 'success' || run.conclusion === 'failure')) {
      const isPass = run.conclusion === 'success';
      return {
        ts,
        event: {
          id: `wf-${run.id}`,
          kind: isPass ? 'workflow_passed' : 'workflow_failed',
          ts: run.updated_at || ts,
          name: run.name || '?',
          head_sha: (run.head_sha || '').slice(0, 8),
          html_url: run.html_url,
        },
        category: isPass ? 'wf_pass' : 'wf_fail',
        voice: isPass ? 'Tutto in posto. Respiro.' : 'Qualcosa scricchiola. Aspetto.',
        source: 'webhook_live',
      };
    }
  }
  return null;
}

async function appendWebhookEntry(entry, feedPath = FEED_PATH) {
  await fsp.mkdir(path.dirname(feedPath), { recursive: true });
  await fsp.appendFile(feedPath, JSON.stringify(entry) + '\n', 'utf8');
}

function verifyWebhookSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader, 'utf8'),
      Buffer.from(expected, 'utf8'),
    );
  } catch {
    return false;
  }
}

function createSkivRouter(opts = {}) {
  const router = express.Router();
  const statePath = opts.statePath || STATE_PATH;
  const feedPath = opts.feedPath || FEED_PATH;
  const webhookSecret = opts.webhookSecret || process.env.SKIV_WEBHOOK_SECRET || '';

  // Octokit Webhooks instance — used ONLY for HMAC verify (battle-tested
  // signature comparison + timing-safe). Entry build remains inline to
  // preserve sync entry_id contract for tests + minimize race conditions.
  let octokit = null;
  if (octokitWebhooks && webhookSecret) {
    try {
      octokit = new octokitWebhooks({ secret: webhookSecret });
    } catch (err) {
      console.warn('[skiv] octokit webhooks init failed, fallback inline', err);
      octokit = null;
    }
  }

  router.get('/skiv/status', async (_req, res, next) => {
    try {
      const state = await readStateSafe(statePath);
      res.json(state);
    } catch (err) {
      next(err);
    }
  });

  router.get('/skiv/feed', async (req, res, next) => {
    try {
      let limit = Number.parseInt(req.query.limit, 10);
      if (!Number.isFinite(limit) || limit <= 0) limit = 50;
      if (limit > 500) limit = 500;
      const entries = await readFeedTail(limit, feedPath);
      res.json({ count: entries.length, entries });
    } catch (err) {
      next(err);
    }
  });

  router.get('/skiv/card', async (_req, res, next) => {
    try {
      const state = await readStateSafe(statePath);
      const recent = await readFeedTail(20, feedPath);
      const card = renderAsciiCard(state, recent);
      res.set('Content-Type', 'text/plain; charset=utf-8');
      res.send(card);
    } catch (err) {
      next(err);
    }
  });

  // Optional: webhook receiver. Requires SKIV_WEBHOOK_SECRET env (HMAC verify).
  // Body parsing must preserve raw payload for signature check.
  router.post(
    '/skiv/webhook',
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
      limit: '1mb',
    }),
    async (req, res) => {
      if (!webhookSecret) {
        return res
          .status(503)
          .json({ error: 'webhook_disabled', detail: 'SKIV_WEBHOOK_SECRET not set' });
      }
      const sig = req.get('X-Hub-Signature-256');
      const eventType = req.get('X-GitHub-Event') || 'unknown';
      // Verify HMAC: Octokit preferred (typed + timing-safe), inline fallback.
      let verified = false;
      const handler = octokit ? 'octokit' : 'inline';
      if (octokit) {
        try {
          // Octokit verify() returns Promise<boolean>, not throw on bad sig.
          verified = await octokit.verify(
            (req.rawBody && req.rawBody.toString('utf8')) || '',
            sig || '',
          );
        } catch {
          verified = false;
        }
      } else {
        verified = verifyWebhookSignature(req.rawBody || Buffer.from(''), sig, webhookSecret);
      }
      if (!verified) {
        return res.status(401).json({ error: 'invalid_signature' });
      }
      const entry = buildFeedEntryFromWebhook(eventType, req.body || {});
      if (!entry) {
        return res.json({
          ok: true,
          event_type: eventType,
          processed: false,
          handler,
          note: 'event_type not actionable for Skiv (skipped)',
        });
      }
      appendWebhookEntry(entry, feedPath).catch((err) => {
        console.error('[skiv] webhook feed append failed', err);
      });
      return res.json({
        ok: true,
        event_type: eventType,
        processed: true,
        handler,
        entry_id: entry.event.id,
      });
    },
  );

  return router;
}

module.exports = {
  createSkivRouter,
  // Exported for tests + reuse.
  readStateSafe,
  readFeedTail,
  renderAsciiCard,
  FALLBACK_STATE,
  STATE_PATH,
  FEED_PATH,
};
