import { readFileSync } from 'fs';
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
  };
  random_general_d20: RandomGeneralEntry[];
  forms: Record<string, FormDefinition>;
}

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
  if (key.startsWith('trait_T1')) return shop.trait_T1;
  if (key.startsWith('job_ability')) return shop.job_ability;
  if (key === 'cap_pt') return shop.cap_pt;
  if (key === 'guardia_situazionale') return shop.guardia_situazionale;
  if (key === 'starter_bioma') return shop.starter_bioma;
  if (key === 'sigillo_forma') return shop.sigillo_forma;
  if (key === 'PE') return 1;
  throw new Error('Chiave sconosciuta: ' + key);
};

type RollPackOptions = {
  seed?: string;
};

export function roll_pack(
  form: string,
  job: string,
  dataPath = '../../data/packs.yaml',
  seedOrOptions?: string | RollPackOptions,
) {
  const raw = readFileSync(dataPath, 'utf8');
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
    const formData = data.forms[form];
    const bias = formData?.bias_d12;
    if (!bias) throw new Error('Forma sconosciuta: ' + form);
    const entry = (Object.entries(bias) as [FormPackKey, Range][])
      .find(([, r]) => inRange(d12!, r));
    if (!entry) throw new Error('Bias d12 non copre il lancio: ' + d12);
    const [packKey] = entry; // A|B|C
    pick = { pack: packKey, combo: formData[packKey] };
  } else if (general.pack === 'BIAS_JOB') {
    const jobBias: Record<string, string[]> = {
      vanguard: ['B', 'D'],
      skirmisher: ['C', 'E'],
      warden: ['E', 'G'],
      artificer: ['A', 'F'],
      invoker: ['A', 'J'],
      harvester: ['D', 'J'],
    };
    const pref = jobBias[job.toLowerCase()] || ['A', 'B'];
    const first = data.random_general_d20.find((x) => pref.includes(x.pack));
    if (!first || !first.combo) {
      throw new Error('Bias lavoro non ha trovato un pacchetto valido per: ' + job);
    }
    pick = { pack: first.pack, combo: first.combo };
  } else if (general.pack === 'SCELTA') {
    const first = data.random_general_d20.find((x) => x.pack === 'A');
    if (!first || !first.combo) throw new Error('Pacchetto A non trovato per scelta manuale');
    pick = { pack: 'A', combo: first.combo };
  } else {
    if (!general.combo) throw new Error('Combinazione mancante per il pacchetto ' + general.pack);
    pick = { pack: general.pack, combo: general.combo };
  }

  const breakdown = pick.combo.map((item) => ({ item, cost: costOf(item, data.pi_shop.costs) }));
  const total = breakdown.reduce((sum, entry) => sum + entry.cost, 0);
  if (total !== 7) throw new Error(`Pacchetto ${pick.pack} non somma a 7 (= ${total})`);
  if (pick.combo.filter((x) => x === 'cap_pt').length > 1) throw new Error('Cap PT > 1');
  if (pick.combo.filter((x) => x === 'starter_bioma').length > 1) throw new Error('Starter>1');

  const rolls: { d20: number; d12?: number } = { d20 };
  if (typeof d12 === 'number') rolls.d12 = d12;

  return {
    inputs: { form, job },
    pack: pick.pack,
    combo: pick.combo,
    total_cost: total,
    cost_breakdown: breakdown,
    rolls,
    selection: { table: general.pack, notes: general.notes ?? null },
  };
}

// CLI
if (process.argv[1] && process.argv[1].includes('roll_pack')) {
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
  const [form = 'ENTP', job = 'invoker', dataPath = '../../data/packs.yaml'] = positional;
  const res = roll_pack(form, job, dataPath, seed);
  console.log(JSON.stringify(res, null, 2));
}
