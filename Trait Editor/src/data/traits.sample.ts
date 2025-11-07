import type { Trait } from '../types/trait';

export const TRAIT_DATA_ENDPOINT = '../data/traits/index.json';

const traitsSample: Trait[] = [
  {
    id: 'spectre-3',
    name: 'Spectre-3',
    description:
      'Adaptive infiltrator specialising in precision sabotage and split-second decision cycles.',
    archetype: 'Infiltrator Savant',
    playstyle: 'High tempo, precision takedowns, opportunistic reroutes.',
    signatureMoves: ['Phase-Locked Entry', 'Ghostline Relay', 'Vector Cancel'],
  },
  {
    id: 'nova-lead',
    name: 'Nova-Lead',
    description:
      'Command tactician orchestrating multi-squad pushes and dynamic risk balancing in contested zones.',
    archetype: 'Command Vanguard',
    playstyle: 'Coordinated aggression, distributed command, fallback elasticity.',
    signatureMoves: ['Solaris Surge', 'Command Relay Burst', 'Zero Hour Anchor'],
  },
  {
    id: 'helix-warden',
    name: 'Helix Warden',
    description:
      'Containment specialist who anchors anomaly perimeters while orchestrating stabiliser arrays.',
    archetype: 'Anomaly Custodian',
    playstyle: 'Territory denial, layered defences, sustained countermeasures.',
    signatureMoves: ['Tidewall Invocation', 'Gravitic Shear', 'Containment Pulse'],
  },
  {
    id: 'echo-ridge',
    name: 'Echo Ridge',
    description:
      'Recon collective that threads deep behind enemy lines to surface actionable telemetry.',
    archetype: 'Recon Collective',
    playstyle: 'Stealth scouting, asynchronous reporting, tactical adaptation.',
    signatureMoves: ['Silent Parallax', 'Data Loom', 'Ridgeback Cascade'],
  },
];

export const getSampleTraits = (): Trait[] =>
  traitsSample.map((trait) => ({ ...trait, signatureMoves: [...trait.signatureMoves] }));

export const fetchTraitsFromMonorepo = async (
  endpoint: string = TRAIT_DATA_ENDPOINT,
): Promise<Trait[]> => {
  if (typeof fetch !== 'function') {
    throw new Error('Fetch API non disponibile nell\'ambiente corrente.');
  }

  const response = await fetch(endpoint, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Impossibile recuperare i tratti da ${endpoint}: ${response.status}`);
  }

  const data = (await response.json()) as Trait[];
  return data.map((trait) => ({ ...trait, signatureMoves: [...trait.signatureMoves] }));
};

export const resolveTraitSource = async (
  useRemoteSource: boolean,
  endpoint?: string,
): Promise<Trait[]> => {
  if (!useRemoteSource) {
    return getSampleTraits();
  }

  try {
    return await fetchTraitsFromMonorepo(endpoint ?? TRAIT_DATA_ENDPOINT);
  } catch (error) {
    console.warn('Falling back to sample traits after remote fetch failure:', error);
    return getSampleTraits();
  }
};
