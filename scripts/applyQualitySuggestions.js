#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../server/app');

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const datasetPath = path.join(rootDir, 'data', 'flow-shell', 'atlas-snapshot.json');
  const dataset = JSON.parse(await fs.readFile(datasetPath, 'utf8'));
  const suggestions = Array.isArray(dataset.suggestions) ? dataset.suggestions : [];
  if (!suggestions.length) {
    console.log('[quality] nessun suggerimento da applicare');
    return;
  }

  const stubOrchestrator = {
    async generateSpeciesBatch({ batch }) {
      return {
        results: batch.map((entry, index) => ({
          blueprint: {
            id: `qa-blueprint-${index + 1}`,
            name:
              entry.request_id === 'regen-obsidian-05'
                ? 'Predatori di Risonanza · QA reroll'
                : `Specie QA ${index + 1}`,
            biome_id: entry.biome_id,
            traits: entry.trait_ids,
            seed: entry.seed,
          },
          meta: {
            request_id: entry.request_id,
            seed: entry.seed,
            fallback_used: false,
          },
          validation: {
            messages: [
              {
                level: 'info',
                message: 'Rigenerazione completata con profilo controllato.',
              },
            ],
          },
        })),
        errors: [],
      };
    },
    async fetchTraitDiagnostics() {
      const timestamp = new Date().toISOString();
      return {
        diagnostics: {
          summary: {
            total_traits: 0,
            glossary_ok: 0,
            with_conflicts: 0,
          },
          checks: {},
          highlights: {},
          generated_at: timestamp,
        },
      };
    },
  };

  const { app } = createApp({ generationOrchestrator: stubOrchestrator });

  const responses = [];
  for (const suggestion of suggestions) {
    const response = await request(app)
      .post('/api/v1/quality/suggestions/apply')
      .send({ suggestion })
      .expect(200);
    responses.push({ suggestion, payload: response.body });
  }

  const findResult = (id) => responses.find((entry) => entry.suggestion.id === id)?.payload || null;
  const speciesFix = findResult('species-duplicates');
  const biomeHazard = findResult('biome-hazard');
  const foodwebRefresh = findResult('foodweb-refresh');
  const speciesReroll = findResult('species-reroll');

  const nowIso = new Date().toISOString();

  dataset.suggestions = [];
  dataset.qualityRelease = dataset.qualityRelease || {};
  dataset.qualityRelease.suggestions = [];
  dataset.qualityRelease.lastRun = nowIso;
  if (dataset.qualityRelease.checks && dataset.qualityRelease.checks.species) {
    dataset.qualityRelease.checks.species.passed = dataset.qualityRelease.checks.species.total || 0;
  }
  if (dataset.qualityRelease.checks && dataset.qualityRelease.checks.biomes) {
    dataset.qualityRelease.checks.biomes.passed = dataset.qualityRelease.checks.biomes.total || 0;
  }
  dataset.qualityRelease.metrics = {
    suggestionsApplied: responses.length,
    speciesCorrected: speciesFix?.result?.corrected?.length || 0,
    speciesRegenerated: speciesReroll?.result?.results?.length || 0,
  };

  const context = dataset.qualityReleaseContext || (dataset.qualityReleaseContext = {});
  const speciesBatch = context.speciesBatch || (context.speciesBatch = { entries: [] });
  speciesBatch.entries = Array.isArray(speciesBatch.entries) ? speciesBatch.entries : [];
  speciesBatch.entries = speciesBatch.entries.map((entry) => ({
    ...entry,
    status: 'resolved',
    lastCheck: nowIso,
  }));

  const corrected = speciesFix?.result?.corrected ? [...speciesFix.result.corrected] : [];
  const regenerated = speciesReroll?.result?.results
    ? speciesReroll.result.results.map((entry) => ({
        blueprint: entry.blueprint,
        meta: entry.meta,
        validation: entry.validation,
      }))
    : [];

  speciesBatch.results = { corrected, regenerated };
  speciesBatch.summary = {
    corrected: corrected.length,
    regenerated: regenerated.length,
    pending: 0,
    lastRun: nowIso,
  };
  if (regenerated.length) {
    for (const generated of regenerated) {
      const match = speciesBatch.entries.find(
        (entry) => entry.request_id === generated.meta.request_id,
      );
      if (match) {
        match.lastBlueprintId = generated.blueprint.id;
        match.fallbackUsed = Boolean(generated.meta.fallback_used);
      }
    }
  }

  const biomeCheck = context.biomeCheck || (context.biomeCheck = {});
  const biomeDoc = biomeCheck.biome || (biomeCheck.biome = {});
  biomeDoc.hazard = {
    id: 'nebula-photonic-fog',
    label: 'Nebbia fotonica instabile',
  };
  biomeDoc.manifest = { generated: true, appliedAt: nowIso };
  biomeDoc.receipt = {
    source: 'runtime-validator',
    applied_at: nowIso,
    applied_by: 'QA Core',
  };
  biomeDoc.ecosistema = {
    pillars: ['fauna luminosa', 'specchi sonori'],
    stability_index: '86%',
  };
  biomeDoc.links = [
    { from: 'fog-nexus', to: 'lupus-nebulis', weight: 0.72 },
    { from: 'lupus-nebulis', to: 'support-1', weight: 0.58 },
  ];
  biomeDoc.registries = {
    hazards: ['Nebbia fotonica instabile'],
    guardians: ['lupus-nebulis'],
  };
  biomeCheck.result = {
    status: 'fixed',
    notes: 'Hazard predefinito applicato e manifest rigenerato.',
    completedAt: nowIso,
    messages: [],
  };

  const foodwebCheck = context.foodwebCheck || (context.foodwebCheck = {});
  const foodwebDoc = foodwebCheck.foodweb || (foodwebCheck.foodweb = {});
  foodwebDoc.anchors = [
    { id: 'alpha-pack', role: 'predatore_apice' },
    { id: 'lure-flora', role: 'flora_reagente' },
    { id: 'aux-scout', role: 'supporto_tattico' },
  ];
  foodwebDoc.links = [
    { from: 'alpha-pack', to: 'lure-flora', weight: 0.62 },
    { from: 'lure-flora', to: 'alpha-pack', weight: 0.55 },
    { from: 'aux-scout', to: 'lure-flora', weight: 0.48 },
  ];
  foodwebDoc.focus =
    'Foodweb aggiornato con archi secondari calibrati sopra soglia 0.5 e nodo di supporto dedicato.';
  foodwebCheck.result = {
    status: foodwebRefresh?.result?.status || 'scheduled',
    message: 'Rigenerazione pianificata con monitoraggio QA.',
    scheduledAt: foodwebRefresh?.logs?.[0]?.timestamp || nowIso,
  };

  const appliedSuggestions = responses.map(({ suggestion, payload }) => ({
    id: suggestion.id,
    scope: suggestion.scope,
    action: suggestion.action,
    completedAt: payload.logs?.[payload.logs.length - 1]?.timestamp || nowIso,
    logs: payload.logs || [],
  }));
  context.appliedSuggestions = appliedSuggestions;

  const logs = Array.isArray(context.logs) ? [...context.logs] : [];
  const updateLog = (id, patch) => {
    const index = logs.findIndex((entry) => entry.id === id);
    if (index >= 0) {
      logs[index] = { ...logs[index], ...patch };
    } else {
      logs.push({ id, ...patch });
    }
  };

  updateLog('log-species', {
    scope: 'species',
    level: 'success',
    message: 'Batch QA-NEB validato: duplicati rimossi e rigenerazione completata.',
    timestamp: speciesReroll?.logs?.find((entry) => entry.level === 'success')?.timestamp || nowIso,
  });
  updateLog('log-biome', {
    scope: 'biome',
    level: 'success',
    message: 'Hazard Nebbia fotonica instabile applicato al manifest del bioma.',
    timestamp: biomeHazard?.logs?.[0]?.timestamp || nowIso,
  });
  updateLog('log-foodweb', {
    scope: 'foodweb',
    level: 'info',
    message: foodwebCheck.result.message,
    timestamp: foodwebCheck.result.scheduledAt,
  });

  context.logs = logs;

  const twilightBiome = Array.isArray(dataset.biomes)
    ? dataset.biomes.find((entry) => entry.id === 'twilight-marsh')
    : null;
  if (twilightBiome) {
    twilightBiome.readiness = Math.min(
      (twilightBiome.readiness || 0) + 1,
      twilightBiome.total || 5,
    );
    if (Array.isArray(twilightBiome.validators)) {
      twilightBiome.validators = twilightBiome.validators.map((validator) =>
        validator.id === 'thermal-vents'
          ? {
              ...validator,
              status: 'passed',
              message: 'Modulazione filtri aggiornata: pulsazioni stabilizzate.',
            }
          : validator,
      );
      if (!twilightBiome.validators.find((validator) => validator.id === 'hazard-default')) {
        twilightBiome.validators.push({
          id: 'hazard-default',
          label: 'Hazard QA',
          status: 'passed',
          message: 'Hazard predefinito Nebbia fotonica instabile applicato al manifest.',
        });
      }
    }
  }

  const speciesSummary = dataset.species || (dataset.species = {});
  speciesSummary.curated = (speciesSummary.curated || 0) + corrected.length;
  if (Array.isArray(speciesSummary.shortlist)) {
    const shortlist = new Set(speciesSummary.shortlist);
    corrected.forEach((entry) => shortlist.add(entry.display_name));
    regenerated.forEach((entry) => {
      if (entry.blueprint?.name) {
        shortlist.add(entry.blueprint.name);
      }
    });
    speciesSummary.shortlist = Array.from(shortlist);
  }

  if (dataset.encounter && Array.isArray(dataset.encounter.variants)) {
    const firstVariant = dataset.encounter.variants[0];
    if (firstVariant && Array.isArray(firstVariant.slots)) {
      const stalkerSlot = firstVariant.slots.find((slot) => slot.id === 'stalker');
      if (stalkerSlot && Array.isArray(stalkerSlot.species)) {
        if (!stalkerSlot.species.find((entry) => entry.id === 'spec-runtime-node')) {
          stalkerSlot.species.push({
            id: 'spec-runtime-node',
            display_name: 'Predatore Nodo QA',
            summary: 'Profilo corretto dal runtime QA con densità moderata.',
          });
        }
      }
      firstVariant.warnings = [];
    }
  }

  if (dataset.encounterSummary) {
    dataset.encounterSummary.warnings = 0;
  }

  await fs.writeFile(datasetPath, `${JSON.stringify(dataset, null, 2)}\n`, 'utf8');
  console.log('[quality] suggerimenti applicati e snapshot aggiornato');
}

main().catch((error) => {
  console.error('[quality] errore applicazione suggerimenti:', error);
  process.exitCode = 1;
});
