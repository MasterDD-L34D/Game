// Feedback collection endpoint — M7 demo playtest (2026-04-20).
//
// POST /api/feedback → salva feedback utente a logs/feedback/*.json
// Supporta 2 shape:
//   { kind: 'freetext', text: '...', session_id?, player_name? }
//   { kind: 'form', answers: {q1: 'val', q2: 'val', ...}, session_id?, player_name? }
//
// Aggiunge metadata automatici: timestamp, client_ip (hashed), user_agent.
// Storage flat file: 1 file JSON per feedback, facilmente zip-pable post demo.

'use strict';

const path = require('node:path');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const { Router } = require('express');

function sanitize(str, maxLen = 5000) {
  if (typeof str !== 'string') return '';
  return str.slice(0, maxLen).trim();
}

function hashIp(ip) {
  // One-way hash for anonymization (salt fisso, non reversibile)
  return crypto
    .createHash('sha256')
    .update(`evo-tactics-demo:${ip || 'unknown'}`)
    .digest('hex')
    .slice(0, 16);
}

function createFeedbackRouter(options = {}) {
  const router = Router();
  const repoRoot = path.resolve(__dirname, '..', '..', '..');
  const feedbackDir = options.feedbackDir || path.join(repoRoot, 'logs', 'feedback');

  // POST /api/feedback — submit feedback
  router.post('/feedback', async (req, res) => {
    try {
      const body = req.body || {};
      const kind = body.kind === 'form' ? 'form' : 'freetext';

      const entry = {
        timestamp: new Date().toISOString(),
        kind,
        player_name: sanitize(body.player_name, 100) || 'anonymous',
        session_id: sanitize(body.session_id, 64) || null,
        client_hash: hashIp(req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress),
        user_agent: sanitize(req.headers['user-agent'], 500),
      };

      if (kind === 'freetext') {
        entry.text = sanitize(body.text, 10000);
        if (!entry.text) {
          return res.status(400).json({ error: 'text vuoto' });
        }
      } else {
        const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};
        entry.answers = {};
        for (const [k, v] of Object.entries(answers)) {
          entry.answers[sanitize(k, 100)] = sanitize(String(v || ''), 5000);
        }
        if (Object.keys(entry.answers).length === 0) {
          return res.status(400).json({ error: 'answers vuoto' });
        }
      }

      await fs.mkdir(feedbackDir, { recursive: true });
      const filename = `${entry.timestamp.replace(/[:.]/g, '-')}_${kind}_${entry.client_hash}.json`;
      const filepath = path.join(feedbackDir, filename);
      await fs.writeFile(filepath, JSON.stringify(entry, null, 2), 'utf8');

      return res.json({
        status: 'ok',
        message: 'Grazie! Feedback ricevuto.',
        filename,
      });
    } catch (err) {
      console.error('[feedback] error:', err);
      return res.status(500).json({ error: 'internal error' });
    }
  });

  // GET /api/feedback/summary — admin dashboard simple
  router.get('/feedback/summary', async (_req, res) => {
    try {
      const files = await fs.readdir(feedbackDir).catch(() => []);
      const jsonFiles = files.filter((f) => f.endsWith('.json'));
      return res.json({
        count: jsonFiles.length,
        feedback_dir: feedbackDir,
        latest: jsonFiles.slice(-10),
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = { createFeedbackRouter };
