'use strict';

const generationSnapshotSchema = require('./schemas/generationSnapshot.schema.json');
const speciesSchema = require('./schemas/species.schema.json');
const telemetrySchema = require('./schemas/telemetry.schema.json');
const speciesBiomesSchema = require('./schemas/speciesBiomes.schema.json');
const combatSchema = require('./schemas/combat.schema.json');
const traitMechanicsSchema = require('./schemas/traitMechanics.schema.json');
const glossarySchema = require('./schemas/glossary.schema.json');

module.exports = {
  generationSnapshotSchema,
  speciesSchema,
  telemetrySchema,
  speciesBiomesSchema,
  combatSchema,
  traitMechanicsSchema,
  glossarySchema,
};
