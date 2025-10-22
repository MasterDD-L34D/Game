import fs from 'fs';
import yaml from 'js-yaml';

type Range = string; // "1-4" or "11"
type PackCombo = string[];

interface Data {
  pi_shop: any;
  random_general_d20: { range: Range; pack: string; combo?: string[]; notes?: string }[];
  forms: Record<string, { A: PackCombo; B: PackCombo; C: PackCombo; bias_d12: Record<string, Range> }>;
}

function rollDie(sides: number): number { return 1 + Math.floor(Math.random() * sides); }
function inRange(val: number, r: string): boolean {
  if (r.includes('-')) { const [a,b] = r.split('-').map(Number); return val>=a && val<=b; }
  return val === Number(r);
}

const costOf = (key: string, shop: any): number => {
  if (key.startsWith('trait_T1')) return shop.trait_T1;
  if (key.startsWith('job_ability')) return shop.job_ability;
  if (key === 'cap_pt') return shop.cap_pt;
  if (key === 'guardia_situazionale') return shop.guardia_situazionale;
  if (key === 'starter_bioma') return shop.starter_bioma;
  if (key === 'sigillo_forma') return shop.sigillo_forma;
  if (key === 'PE') return 1;
  throw new Error('Chiave sconosciuta: '+key);
};

export function roll_pack(form: string, job: string, dataPath='../../data/packs.yaml') {
  const raw = fs.readFileSync(dataPath, 'utf8');
  const data = yaml.load(raw) as Data;
  const d20 = rollDie(20);
  const general = data.random_general_d20.find(x => inRange(d20, x.range));
  if (!general) throw new Error('Tabella d20 non copre il lancio: '+d20);

  let pick: { pack: string; combo: string[] };

  if (general.pack === 'BIAS_FORMA') {
    const d12 = rollDie(12);
    const bias = data.forms[form]?.bias_d12;
    if (!bias) throw new Error('Forma sconosciuta: '+form);
    const entry = Object.entries(bias).find(([pack, r]) => inRange(d12, r));
    if (!entry) throw new Error('Bias d12 non copre il lancio: '+d12);
    const [packKey] = entry; // A|B|C
    pick = { pack: packKey, combo: data.forms[form][packKey] };
  } else if (general.pack === 'BIAS_JOB') {
    const jobBias: Record<string, string[]> = {
      vanguard: ['B','D'], skirmisher: ['C','E'], warden: ['E','G'],
      artificer: ['A','F'], invoker: ['A','J'], harvester: ['D','J']
    };
    const pref = jobBias[job.toLowerCase()] || ['A','B'];
    const first = data.random_general_d20.find(x => pref.includes(x.pack));
    pick = { pack: first!.pack, combo: first!.combo! };
  } else if (general.pack === 'SCELTA') {
    const first = data.random_general_d20.find(x=>x.pack==='A')!;
    pick = { pack: 'A', combo: first.combo! };
  } else {
    pick = { pack: general.pack, combo: general.combo! };
  }

  // VALIDAZIONE
  const total = pick.combo.reduce((s,k)=> s+costOf(k, data.pi_shop.costs), 0);
  if (total !== 7) throw new Error(`Pacchetto ${pick.pack} non somma a 7 (=${total})`);
  const capPt = pick.combo.filter(x=>x==='cap_pt').length; if (capPt>1) throw new Error('Cap PT > 1');
  const starters = pick.combo.filter(x=>x==='starter_bioma').length; if (starters>1) throw new Error('Starter>1');

  return { d20, pick };
}

// CLI
if (process.argv[1] && process.argv[1].includes('roll_pack')) {
  const form = process.argv[2] || 'ENTP';
  const job = process.argv[3] || 'invoker';
  const dataPath = process.argv[4] || '../../data/packs.yaml';
  const res = roll_pack(form, job, dataPath);
  console.log(JSON.stringify(res, null, 2));
}
