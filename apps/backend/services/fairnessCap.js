// SPRINT_003 fase 1 — fairness cap PT hard enforcement.
//
// Responsabilita':
//   1. Caricare (al boot) il valore numerico di cap_pt_max da
//      data/packs.yaml (pi_shop.caps.cap_pt_max). Default 1.
//   2. Esporre funzioni pure checkCapPtBudget + consumeCapPt per
//      validare e mutare il contatore cap_pt_used nella session
//      state in apps/backend/routes/session.js.
//
// Formalizzato in engine/sistema_rules.md come FAIRNESS_CAP_001
// (non una REGOLA_ IA, per non confondere con le regole del Sistema).

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const DEFAULT_PACKS_PATH = path.resolve(__dirname, '..', '..', '..', 'data', 'packs.yaml');
const FALLBACK_CAP_PT_MAX = 1;

function loadFairnessConfig(packsYamlPath = DEFAULT_PACKS_PATH, logger = console) {
  try {
    const text = fs.readFileSync(packsYamlPath, 'utf8');
    const parsed = yaml.load(text);
    const capPtMax = Number(parsed?.pi_shop?.caps?.cap_pt_max);
    if (Number.isFinite(capPtMax) && capPtMax >= 0) {
      logger.log(`[fairness] cap_pt_max=${capPtMax} caricato da ${packsYamlPath}`);
      return { cap_pt_max: capPtMax };
    }
    logger.warn(
      `[fairness] pi_shop.caps.cap_pt_max non trovato in ${packsYamlPath}, uso default ${FALLBACK_CAP_PT_MAX}`,
    );
    return { cap_pt_max: FALLBACK_CAP_PT_MAX };
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      logger.warn(
        `[fairness] ${packsYamlPath} non trovato, uso default cap_pt_max=${FALLBACK_CAP_PT_MAX}`,
      );
    } else {
      logger.warn(
        `[fairness] errore caricamento ${packsYamlPath}: ${err.message || err}. Uso default ${FALLBACK_CAP_PT_MAX}`,
      );
    }
    return { cap_pt_max: FALLBACK_CAP_PT_MAX };
  }
}

function checkCapPtBudget(session, requested, config) {
  const max = Number.isFinite(config?.cap_pt_max) ? config.cap_pt_max : FALLBACK_CAP_PT_MAX;
  const used = Number.isFinite(session?.cap_pt_used) ? session.cap_pt_used : 0;
  const req = Number.isFinite(requested) && requested > 0 ? requested : 0;
  const ok = used + req <= max;
  return { ok, used, max, requested: req };
}

function consumeCapPt(session, amount) {
  const delta = Number.isFinite(amount) && amount > 0 ? amount : 0;
  if (delta === 0) return;
  session.cap_pt_used = (Number.isFinite(session.cap_pt_used) ? session.cap_pt_used : 0) + delta;
}

module.exports = {
  loadFairnessConfig,
  checkCapPtBudget,
  consumeCapPt,
  DEFAULT_PACKS_PATH,
  FALLBACK_CAP_PT_MAX,
};
