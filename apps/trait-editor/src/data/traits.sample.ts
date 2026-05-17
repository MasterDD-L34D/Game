import type { Trait, TraitIndexDocument } from '../types/trait';
import { parseTraitIndexDocument, parseTraitPayload } from '../services/trait-parser';

export const TRAIT_DATA_ENDPOINT = '../data/traits/index.json';

const sampleIndex: TraitIndexDocument = {
  schema_version: '2.0',
  trait_glossary: 'data/core/traits/glossary.json',
  traits: {
    'spectre-3': {
      id: 'spectre-3',
      label: 'Spectre-3',
      tier: 'T2',
      famiglia_tipologia: 'Infiltrator Savant',
      slot_profile: { core: 'Infiltratore', complementare: 'Sabotatore' },
      slot: ['assalto', 'sabotaggio'],
      usage_tags: ['burst', 'control'],
      completion_flags: {
        has_biome: true,
        has_data_origin: true,
        has_species_link: true,
        has_usage_tags: true,
      },
      data_origin: 'mock_reference',
      debolezza: 'Sensibile a contrattacchi coordinati.',
      mutazione_indotta: 'Innestata rete di sensori adattivi multi-spettro.',
      requisiti_ambientali: [
        {
          capacita_richieste: ['furtività'],
          condizioni: { biome_class: 'urbano' },
          fonte: 'mock',
          meta: { expansion: 'demo', tier: 'T2' },
        },
      ],
      sinergie: ['Phase-Locked Entry', 'Ghostline Relay', 'Vector Cancel'],
      sinergie_pi: {
        co_occorrenze: ['scia_quantica'],
        combo_totale: 2,
        forme: ['sequenza_infiltrazione'],
        tabelle_random: [],
      },
      species_affinity: [
        {
          roles: ['scout'],
          species_id: 'spectre_line',
          weight: 0.6,
        },
      ],
      spinta_selettiva: 'Alta intensità, decisioni istantanee.',
      uso_funzione: 'Infiltra punti critici e disarticola linee di difesa.',
      fattore_mantenimento_energetico: 'Moderato',
      conflitti: ['nova-lead'],
      biome_tags: ['urbano', 'notturno'],
    },
    'nova-lead': {
      id: 'nova-lead',
      label: 'Nova-Lead',
      tier: 'T3',
      famiglia_tipologia: 'Command Vanguard',
      slot_profile: { core: 'Comando', complementare: 'Supporto' },
      slot: ['strategia', 'supporto'],
      usage_tags: ['coordinamento', 'buffer'],
      completion_flags: {
        has_biome: true,
        has_data_origin: true,
        has_species_link: true,
        has_usage_tags: true,
      },
      data_origin: 'mock_reference',
      debolezza: 'Richiede linea di comando stabile.',
      mutazione_indotta: 'Amplifica reti neurali per coordinamento multi-squadra.',
      requisiti_ambientali: [
        {
          capacita_richieste: ['leadership'],
          condizioni: { biome_class: 'frontline' },
          fonte: 'mock',
          meta: { expansion: 'demo', tier: 'T3' },
        },
      ],
      sinergie: ['Solaris Surge', 'Command Relay Burst', 'Zero Hour Anchor'],
      sinergie_pi: {
        co_occorrenze: ['focus_comando'],
        combo_totale: 3,
        forme: ['ondata_di_controllo'],
        tabelle_random: [],
      },
      species_affinity: [
        {
          roles: ['commander'],
          species_id: 'nova_command',
          weight: 0.75,
        },
      ],
      spinta_selettiva: 'Coordinamento aggressivo e resilienza.',
      uso_funzione: 'Orchestra spinta multi-nodo e mantiene l’equilibrio tattico.',
      fattore_mantenimento_energetico: 'Elevato',
      conflitti: ['spectre-3'],
      biome_tags: ['frontline'],
    },
  },
};

export const getSampleTraits = (): Trait[] => parseTraitIndexDocument(sampleIndex);

export const fetchTraitsFromMonorepo = async (
  endpoint: string = TRAIT_DATA_ENDPOINT,
): Promise<Trait[]> => {
  if (typeof fetch !== 'function') {
    throw new Error("Fetch API non disponibile nell'ambiente corrente.");
  }

  let response: Response;
  try {
    response = await fetch(endpoint, { cache: 'no-cache' });
  } catch (error) {
    throw new Error(`Errore di rete durante il recupero dei tratti: ${String(error)}`);
  }

  if (!response.ok) {
    throw new Error(`Impossibile recuperare i tratti da ${endpoint}: ${response.status}`);
  }

  const data = await response.json();
  return parseTraitPayload(data);
};

export const resolveTraitSource = async (
  useRemoteSource: boolean,
  endpoint?: string,
): Promise<Trait[]> => {
  if (!useRemoteSource) {
    return getSampleTraits();
  }

  return fetchTraitsFromMonorepo(endpoint ?? TRAIT_DATA_ENDPOINT);
};
