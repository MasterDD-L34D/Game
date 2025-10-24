import { readFileSync } from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

type Range = string; // "1-4" or "11"
type PackCombo = string[];
type FormPackKey = 'A' | 'B' | 'C';

type RandomGeneralEntry = {
  range: Range;
  pack: string;
  combo?: PackCombo;
  notes?: string;
};

interface FormDefinition {
  A: PackCombo;
  B: PackCombo;
  C: PackCombo;
  bias_d12: Record<FormPackKey, Range>;
}

interface Data {
  pi_shop: {
    costs: Record<string, number>;
    caps?: Record<string, number>;
  };
  random_general_d20: RandomGeneralEntry[];
  forms: Record<string, FormDefinition>;
  job_bias?: Record<string, string[]>;
}

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

type RandomFn = () => number;

function inRange(val: number, r: string): boolean {
  if (r.includes('-')) {
    const [a, b] = r.split('-').map(Number);
    return val >= a && val <= b;
  }
  return val === Number(r);
}

const UINT32_MASK = 0xffffffff;

const hashSeed = (seed: string): number => {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  const normalized = (h >>> 0) & UINT32_MASK;
  return normalized === 0 ? 0x6d2b79f5 : normalized;
};

const mulberry32 = (seed: number): RandomFn => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= Math.imul(t ^ (t >>> 7), t | 61) + t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const createRandom = (seed?: string | null): RandomFn => {
  if (!seed) return () => Math.random();
  return mulberry32(hashSeed(seed));
};

const resolveSeed = (seed?: string): string | undefined => {
  if (seed) return seed;
  if (typeof process !== 'undefined' && process?.env?.ROLL_PACK_SEED) {
    return process.env.ROLL_PACK_SEED;
  }
  return undefined;
};

const rollDie = (rng: RandomFn, sides: number): number => 1 + Math.floor(rng() * sides);

const costOf = (key: string, shop: Record<string, number>): number => {
  const base = key.split(':', 1)[0];
  if (base === 'PE') return 1;
  if (!(base in shop)) throw new Error('Chiave sconosciuta: ' + key);
  return shop[base];
};

const pickFromTable = (
  table: RandomGeneralEntry[],
  packs: string[],
  rng: RandomFn,
): RandomGeneralEntry => {
  const candidates = table.filter((row) => packs.includes(row.pack) && row.combo);
  if (!candidates.length) throw new Error(`Nessun pacchetto valido per ${packs.join(',')}`);
  const index = rollDie(rng, candidates.length) - 1;
  return candidates[index];
};

type RollPackOptions = {
  seed?: string;
};

export function roll_pack(
  form: string,
  job: string,
  dataPath?: string,
  seedOrOptions?: string | RollPackOptions,
) {
  const normalizedForm = form.toUpperCase();
  const resolvedDataPath = dataPath
    ? path.resolve(dataPath)
    : path.resolve(MODULE_DIR, '../../data/packs.yaml');
  const raw = readFileSync(resolvedDataPath, 'utf8');
  const data = yaml.load(raw) as Data;

  const resolvedSeed = typeof seedOrOptions === 'string'
    ? seedOrOptions
    : seedOrOptions?.seed;

  const rng = createRandom(resolveSeed(resolvedSeed));

  const d20 = rollDie(rng, 20);
  const general = data.random_general_d20.find((x) => inRange(d20, x.range));
  if (!general) throw new Error('Tabella d20 non copre il lancio: ' + d20);

  let d12: number | undefined;
  let pick: { pack: string; combo: string[] };

  if (general.pack === 'BIAS_FORMA') {
    d12 = rollDie(rng, 12);
    const formData = data.forms[normalizedForm];
    const bias = formData?.bias_d12;
    if (!bias) throw new Error('Forma sconosciuta: ' + form);
    const entry = (Object.entries(bias) as [FormPackKey, Range][])
      .find(([, r]) => inRange(d12!, r));
    if (!entry) throw new Error('Bias d12 non copre il lancio: ' + d12);
    const [packKey] = entry; // A|B|C
    pick = { pack: packKey, combo: formData[packKey] };
  } else if (general.pack === 'BIAS_JOB') {
    const biasRaw = data.job_bias ?? {};
    const normalized = Object.fromEntries(
      Object.entries(biasRaw).map(([key, value]) => [key.toLowerCase(), value]),
    );
    const pref = normalized[job.toLowerCase()] || normalized.default || ['A', 'B'];
    if (!Array.isArray(pref) || !pref.length) {
      throw new Error('Bias lavoro non configurato correttamente per: ' + job);
    }
    const entry = pickFromTable(data.random_general_d20, pref, rng);
    pick = { pack: entry.pack, combo: entry.combo! };
  } else if (general.pack === 'SCELTA') {
    const entry = pickFromTable(data.random_general_d20, ['A'], rng);
    pick = { pack: entry.pack, combo: entry.combo! };
  } else {
    if (!general.combo) throw new Error('Combinazione mancante per il pacchetto ' + general.pack);
    pick = { pack: general.pack, combo: general.combo };
  }

  const breakdown = pick.combo.map((item) => ({ item, cost: costOf(item, data.pi_shop.costs) }));
  const total = breakdown.reduce((sum, entry) => sum + entry.cost, 0);
  if (total !== 7) throw new Error(`Pacchetto ${pick.pack} non somma a 7 (= ${total})`);
  const caps = data.pi_shop.caps ?? {};
  Object.entries(caps).forEach(([capKey, limit]) => {
    const item = capKey.replace(/_max$/, '');
    const count = pick.combo.filter((x) => x === item).length;
    if (count > limit) throw new Error(`${item} supera il limite consentito (${limit})`);
  });

  const rolls: { d20: number; d12?: number } = { d20 };
  if (typeof d12 === 'number') rolls.d12 = d12;

  return {
    inputs: { form: normalizedForm, job },
    pack: pick.pack,
    combo: pick.combo,
    total_cost: total,
    cost_breakdown: breakdown,
    rolls,
    selection: { table: general.pack, notes: general.notes ?? null },
  };
}

// CLI
const isDirectExecution = (): boolean => {
  if (typeof process === 'undefined' || !process.argv || process.argv.length < 2) {
    return false;
  }
  const executed = process.argv[1];
  if (!executed) return false;
  const entryPath = path.resolve(fileURLToPath(import.meta.url));
  return path.resolve(executed) === entryPath;
};

if (isDirectExecution()) {
  const argv = process.argv.slice(2);
  let seed: string | undefined;
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--seed') {
      seed = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--seed=')) {
      seed = arg.split('=')[1];
    } else {
      positional.push(arg);
    }
  }
  const [form = 'ENTP', job = 'invoker', dataPath] = positional;
  const res = roll_pack(form, job, dataPath, seed);
  console.log(JSON.stringify(res, null, 2));
}
