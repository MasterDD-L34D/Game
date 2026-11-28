'use strict';

const generationSnapshotSchema = require('./schemas/generationSnapshot.schema.json');
const speciesSchema = require('./schemas/species.schema.json');
const telemetrySchema = require('./schemas/telemetry.schema.json');
const speciesBiomesSchema = require('./schemas/speciesBiomes.schema.json');
const combatSchema = require('./schemas/combat.schema.json');
const traitMechanicsSchema = require('./schemas/traitMechanics.schema.json');
const glossarySchema = require('./schemas/glossary.schema.json');
const narrativeSchema = require('./schemas/narrative.schema.json');
const replaySchema = require('./schemas/replay.schema.json');
const triSorgenteSchema = require('./schemas/tri-sorgente.schema.json');
const skivCompanionSchema = require('./schemas/skiv_companion.schema.json');
const lineageRitualSchema = require('./schemas/lineage_ritual.schema.json');
const mutationTriggerSchema = require('./schemas/mutation_trigger.schema.json');

module.exports = {
  generationSnapshotSchema,
  speciesSchema,
  telemetrySchema,
  speciesBiomesSchema,
  combatSchema,
  traitMechanicsSchema,
  glossarySchema,
  narrativeSchema,
  replaySchema,
  triSorgenteSchema,
  skivCompanionSchema,
  lineageRitualSchema,
  mutationTriggerSchema,
};
