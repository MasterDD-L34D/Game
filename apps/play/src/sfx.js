// SFX sintetizzati via Web Audio API. Zero file/asset.
// Toni minimal: attack hit, miss, heal, turn change, win, defeat, crit.

let ctx = null;
let muted = false;

function ensureCtx() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    // Autoresume dopo user gesture (browser policy)
  } catch {
    return null;
  }
  return ctx;
}

function tone({
  freq = 440,
  duration = 0.12,
  type = 'sine',
  gain = 0.15,
  attack = 0.005,
  decay = 0.1,
}) {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  try {
    if (c.state === 'suspended') c.resume();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.linearRampToValueAtTime(gain, c.currentTime + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + attack + decay);
    osc.connect(g).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duration);
  } catch {
    /* empty */
  }
}

function sweep({ from = 200, to = 800, duration = 0.2, type = 'sawtooth', gain = 0.12 }) {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  try {
    if (c.state === 'suspended') c.resume();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, c.currentTime);
    osc.frequency.linearRampToValueAtTime(to, c.currentTime + duration);
    g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    osc.connect(g).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duration);
  } catch {
    /* empty */
  }
}

export const sfx = {
  hit: () => tone({ freq: 180, duration: 0.1, type: 'square', gain: 0.2, decay: 0.08 }),
  miss: () => tone({ freq: 240, duration: 0.1, type: 'sine', gain: 0.08, decay: 0.07 }),
  crit: () => {
    tone({ freq: 300, duration: 0.1, type: 'square', gain: 0.22 });
    setTimeout(() => tone({ freq: 600, duration: 0.15, type: 'triangle', gain: 0.18 }), 60);
  },
  heal: () => sweep({ from: 400, to: 800, duration: 0.25, type: 'sine', gain: 0.12 }),
  turn_end: () => tone({ freq: 360, duration: 0.08, type: 'triangle', gain: 0.1 }),
  sis_turn: () => tone({ freq: 180, duration: 0.12, type: 'sawtooth', gain: 0.1 }),
  win: () => {
    sweep({ from: 400, to: 900, duration: 0.25, type: 'triangle', gain: 0.15 });
    setTimeout(() => sweep({ from: 600, to: 1200, duration: 0.3, type: 'sine', gain: 0.15 }), 180);
  },
  defeat: () => sweep({ from: 400, to: 80, duration: 0.6, type: 'sawtooth', gain: 0.18 }),
  select: () => tone({ freq: 520, duration: 0.05, type: 'triangle', gain: 0.06, decay: 0.04 }),
};

export function setMuted(flag) {
  muted = !!flag;
}

export function isMuted() {
  return muted;
}
