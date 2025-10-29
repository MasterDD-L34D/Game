/**
 * Encounter template registry and schema definition.
 *
 * The DSL is deliberately JSON-schema compatible so that the server-side
 * validators for the Evo Tactics pack can ingest the same payload without
 * additional translation. Templates describe the tactical role of each slot
 * together with biome availability, configurable parameters and derived
 * metrics.
 */

export const EncounterTemplateSchema = Object.freeze({
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'com.meridian.encounters/EncounterTemplate.json',
  type: 'object',
  additionalProperties: false,
  required: ['id', 'name', 'category', 'biomes', 'slots', 'summary', 'description'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    category: { enum: ['skirmish', 'siege', 'hazard', 'story'] },
    tags: {
      type: 'array',
      items: { type: 'string' },
      uniqueItems: true,
      default: [],
    },
    biomes: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      uniqueItems: true,
    },
    summary: { type: 'string' },
    description: { type: 'string' },
    parameters: {
      type: 'array',
      default: [],
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'type', 'values'],
        properties: {
          id: { type: 'string' },
          type: { enum: ['enum'] },
          default: { type: 'string' },
          label: { type: 'string' },
          values: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['value'],
              properties: {
                value: { type: 'string' },
                label: { type: 'string' },
                summary: { type: 'string' },
                description: { type: 'string' },
              },
            },
          },
        },
      },
    },
    slots: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'quantity', 'filters'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          quantity: {
            anyOf: [
              { type: 'integer', minimum: 0 },
              {
                type: 'object',
                additionalProperties: false,
                required: ['min', 'max'],
                properties: {
                  min: { type: 'integer', minimum: 0 },
                  max: { type: 'integer', minimum: 0 },
                },
              },
            ],
          },
          optional: { type: 'boolean', default: false },
          filters: {
            type: 'object',
            additionalProperties: false,
            required: ['roles'],
            properties: {
              roles: {
                type: 'array',
                minItems: 1,
                items: { type: 'string' },
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                default: [],
              },
              rarity: {
                type: 'array',
                items: { type: 'string' },
                default: [],
              },
            },
          },
          variants: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  quantity: {
                    anyOf: [
                      { type: 'integer', minimum: 0 },
                      {
                        type: 'object',
                        additionalProperties: false,
                        required: ['min', 'max'],
                        properties: {
                          min: { type: 'integer', minimum: 0 },
                          max: { type: 'integer', minimum: 0 },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
    dynamics: {
      type: 'object',
      additionalProperties: false,
      properties: {
        threat: {
          type: 'object',
          additionalProperties: false,
          properties: {
            base: { type: 'number', default: 0 },
            slotWeight: {
              type: 'object',
              additionalProperties: { type: 'number' },
            },
            parameterMultipliers: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                additionalProperties: { type: 'number' },
              },
            },
          },
        },
        pacing: {
          type: 'object',
          additionalProperties: false,
          properties: {
            base: { type: 'string' },
          },
        },
      },
    },
  },
});

const DEFAULT_SUMMARY = 'Schieramento {{template.name}} nel biome {{biome.name}}';
const DEFAULT_DESCRIPTION =
  'Configurazione standard: {{slots.leader.primary.display_name || "specie ignota"}} guida {{slots.support.names || "nessun supporto"}}.';

export const ENCOUNTER_BLUEPRINTS = Object.freeze([
  {
    id: 'dune-patrol',
    name: 'Pattuglia Termomagnetica',
    category: 'skirmish',
    tags: ['patrol', 'mobile'],
    biomes: ['badlands', 'deserto_caldo'],
    summary: 'Pattuglia {{parameters.intensity.label}} tra le dune di {{biome.name}}',
    description:
      'Il comandante {{slots.leader.primary.display_name}} coordina {{slots.outrider.names || "nessun esploratore"}} con supporto {{slots.support.names || "limitato"}}.',
    parameters: [
      {
        id: 'intensity',
        type: 'enum',
        default: 'standard',
        label: 'Intensità tattica',
        values: [
          { value: 'low', label: 'cauta', summary: 'Riduce pattugliamenti di contatto.' },
          { value: 'standard', label: 'standard', summary: 'Comportamento di pattuglia regolare.' },
          { value: 'high', label: 'aggressiva', summary: 'Ricerca attiva di bersagli ad alto rischio.' },
        ],
      },
    ],
    slots: [
      {
        id: 'leader',
        title: 'Predatore alfa',
        quantity: 1,
        filters: {
          roles: ['predatore_apice_badlands', 'predatore_apice_deserto_caldo'],
          tags: ['predatore'],
        },
      },
      {
        id: 'outrider',
        title: 'Esploratori sinaptici',
        quantity: { min: 1, max: 2 },
        filters: {
          roles: ['predatore_specialista_badlands', 'predatore_specialista_deserto_caldo'],
          tags: ['ricognizione', 'trappola'],
        },
        variants: {
          intensity: {
            low: { quantity: { min: 1, max: 1 } },
            high: { quantity: { min: 2, max: 3 } },
          },
        },
      },
      {
        id: 'support',
        title: 'Supporto bio-ingegneristico',
        quantity: { min: 0, max: 2 },
        optional: true,
        filters: {
          roles: ['ingegnere_ecologico_badlands', 'ingegnere_ecologico_deserto_caldo'],
          tags: ['supporto', 'catalizzatore'],
        },
        variants: {
          intensity: {
            high: { quantity: { min: 1, max: 2 } },
          },
        },
      },
    ],
    dynamics: {
      threat: {
        base: 2.5,
        slotWeight: { default: 0.9, leader: 1.4 },
        parameterMultipliers: {
          intensity: { low: 0.85, standard: 1, high: 1.25 },
        },
      },
      pacing: { base: 'dinamica' },
    },
  },
  {
    id: 'glacier-ambush',
    name: 'Agguato dei Ponti di Ghiaccio',
    category: 'skirmish',
    tags: ['imboscata', 'furtiva'],
    biomes: ['cryosteppe'],
    summary: 'Emboscata {{parameters.trigger.label}} nella {{biome.name}}',
    description:
      'Le unità di presa {{slots.vanguard.names}} chiudono i flussi mentre {{slots.sapper.names || "nessun sabotatore"}} preparano il terreno.',
    parameters: [
      {
        id: 'trigger',
        type: 'enum',
        default: 'standard',
        label: 'Trigger',
        values: [
          { value: 'standard', label: 'a contatto' },
          { value: 'delayed', label: 'a ritardo' },
        ],
      },
    ],
    slots: [
      {
        id: 'vanguard',
        title: 'Linea di chiusura',
        quantity: { min: 2, max: 3 },
        filters: {
          roles: ['predatore_assalitore_cryosteppe', 'guardiano_cryosteppe'],
          tags: ['controllo'],
        },
      },
      {
        id: 'sapper',
        title: 'Sabotatori ambientali',
        quantity: { min: 0, max: 2 },
        optional: true,
        filters: {
          roles: ['ingegnere_ecologico_cryosteppe', 'supporto_cryosteppe'],
          tags: ['area_effect'],
        },
        variants: {
          trigger: {
            delayed: { quantity: { min: 1, max: 2 } },
          },
        },
      },
      {
        id: 'overwatch',
        title: 'Contenimento a distanza',
        quantity: { min: 1, max: 1 },
        filters: {
          roles: ['predatore_ranged_cryosteppe'],
          tags: ['precisione'],
        },
      },
    ],
    dynamics: {
      threat: {
        base: 2,
        slotWeight: { default: 0.8, overwatch: 1.3 },
        parameterMultipliers: {
          trigger: { delayed: 1.1, standard: 1 },
        },
      },
      pacing: { base: 'tesa' },
    },
  },
  {
    id: 'temperate-bloom',
    name: 'Sinfonia Micotica',
    category: 'story',
    tags: ['evento', 'ambientale'],
    biomes: ['foresta_temperata'],
    summary: 'Evento {{parameters.expression.label}} nella {{biome.name}}',
    description:
      'Le colonie {{slots.conductor.names}} orchestrano un bloom che attira {{slots.sentinel.names}} e può mutare in {{slots.emergent.names || "esiti imprevedibili"}}.',
    parameters: [
      {
        id: 'expression',
        type: 'enum',
        default: 'placida',
        label: 'Espressione del bloom',
        values: [
          { value: 'placida', label: 'placida', description: 'Integrazione simbiotica con il bosco.' },
          { value: 'sinergica', label: 'sinergica', description: 'Richiede manutenzione biotica costante.' },
        ],
      },
    ],
    slots: [
      {
        id: 'conductor',
        title: 'Colonie direttrici',
        quantity: { min: 1, max: 2 },
        filters: {
          roles: ['ingegnere_ecologico_foresta_temperata'],
          tags: ['micelio', 'rete'],
        },
      },
      {
        id: 'sentinel',
        title: 'Sentinelle',
        quantity: { min: 1, max: 2 },
        filters: {
          roles: ['guardiano_foresta_temperata', 'predatore_specialista_foresta_temperata'],
          tags: ['difesa'],
        },
      },
      {
        id: 'emergent',
        title: 'Forme emergenti',
        quantity: { min: 0, max: 1 },
        optional: true,
        filters: {
          roles: ['anomalia_ecologica_foresta_temperata'],
        },
        variants: {
          expression: {
            sinergica: { quantity: { min: 1, max: 2 } },
          },
        },
      },
    ],
    dynamics: {
      threat: {
        base: 1.2,
        slotWeight: { default: 0.6, sentinel: 0.9 },
        parameterMultipliers: {
          expression: { placida: 0.9, sinergica: 1.1 },
        },
      },
      pacing: { base: 'rituale' },
    },
  },
]);

export function listEncounterBlueprints() {
  return ENCOUNTER_BLUEPRINTS.slice();
}

export function getEncounterTemplate(templateId) {
  return ENCOUNTER_BLUEPRINTS.find((template) => template.id === templateId) || null;
}

export function getDefaultEncounterCopy(template) {
  if (!template) {
    return { summary: DEFAULT_SUMMARY, description: DEFAULT_DESCRIPTION };
  }
  return {
    summary: template.summary || DEFAULT_SUMMARY,
    description: template.description || DEFAULT_DESCRIPTION,
  };
}
