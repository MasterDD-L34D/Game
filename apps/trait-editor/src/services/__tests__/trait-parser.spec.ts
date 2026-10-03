import { describe, expect, it } from 'vitest';

import { parseTraitPayload, parseTraitIndexDocument } from '../trait-parser';
import type { TraitIndexDocument } from '../../types/trait';

describe('trait parser', () => {
  it('parses trait index documents preserving nested structures', () => {
    const document: TraitIndexDocument = {
      schema_version: '2.0',
      trait_glossary: 'path/to/glossary.json',
      traits: {
        alpha: {
          id: 'alpha',
          label: 'Alpha',
          tier: 'T1',
          famiglia_tipologia: 'Sentinel',
          slot_profile: { core: 'Defender', complementare: 'Sensor' },
          slot: ['defence'],
          usage_tags: ['hold'],
          completion_flags: {
            has_biome: true,
            has_data_origin: true,
            has_species_link: false,
            has_usage_tags: true,
          },
          data_origin: 'unit_test',
          debolezza: 'Requires stabilised perimeter.',
          mutazione_indotta: 'Reinforces perimeter sensing lattice.',
          requisiti_ambientali: [
            {
              capacita_richieste: ['stability'],
              condizioni: { biome_class: 'canyon', extra: 'value' },
              fonte: 'test',
              meta: { expansion: 'qa', tier: 'T1', custom: 'keep' },
            },
          ],
          sinergie: ['Shield Pulse'],
          sinergie_pi: {
            co_occorrenze: ['core-sync'],
            combo_totale: 1,
            forme: ['triad'],
            tabelle_random: ['table-1'],
          },
          species_affinity: [
            {
              roles: ['guardian'],
              species_id: 'sentinel-01',
              weight: 0.42,
            },
          ],
          spinta_selettiva: 'Hold position at all costs.',
          uso_funzione: 'Lock down the area and project shielding.',
          fattore_mantenimento_energetico: 'Moderato',
          conflitti: ['beta'],
          biome_tags: ['canyon'],
        },
      },
    };

    const traits = parseTraitIndexDocument(document);
    expect(traits).toHaveLength(1);
    const [trait] = traits;
    expect(trait.id).toBe('alpha');
    expect(trait.name).toBe('Alpha');
    expect(trait.signatureMoves).toEqual(['Shield Pulse']);
    expect(trait.entry.requisiti_ambientali[0].condizioni).toHaveProperty('extra', 'value');
    expect(trait.entry.requisiti_ambientali[0].meta).toHaveProperty('custom', 'keep');
    expect(trait.entry.sinergie_pi.combo_totale).toBe(1);
  });

  it('parses array payloads into traits', () => {
    const payload = [
      {
        id: 'legacy-1',
        label: 'Legacy Entry',
        famiglia_tipologia: 'Archivist',
        slot_profile: { core: 'Archivio', complementare: 'Supporto' },
        slot: [],
        usage_tags: [],
        completion_flags: {},
        data_origin: 'legacy',
        debolezza: '',
        mutazione_indotta: '',
        requisiti_ambientali: [],
        sinergie: [],
        sinergie_pi: {},
        species_affinity: [],
        spinta_selettiva: '',
        uso_funzione: 'Legacy description',
        fattore_mantenimento_energetico: '',
        conflitti: [],
      },
    ];

    const traits = parseTraitPayload(payload);
    expect(traits).toHaveLength(1);
    expect(traits[0].id).toBe('legacy-1');
    expect(traits[0].description).toBe('Legacy description');
  });

  it('throws on unsupported payloads', () => {
    expect(() => parseTraitPayload({})).toThrowError();
  });
});
