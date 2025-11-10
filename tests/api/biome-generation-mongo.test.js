const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const request = require('supertest');

const { createApp } = require('../../server/app');
const { closeMongo } = require('../../server/db/mongo');
const { createCatalogService } = require('../../server/services/catalog');

function createTraitDocument(id, label, extras = {}) {
  return {
    _id: id,
    labels: { it: label, en: label },
    descriptions: { it: `${label} description`, en: `${label} description` },
    reference: {
      label,
      tier: 3,
      families: ['supporto'],
      energy_profile: 'medio',
      usage: 'supporto',
      selective_drive: null,
      mutation: null,
      synergies: [],
      conflicts: [],
      environments: ['arid'],
      weakness: null,
      usage_tags: ['supporto'],
      species_affinity: [
        {
          species_id: `synthetic-${id}`,
          roles: ['apex'],
          weight: 1,
        },
      ],
      completion_flags: { has_usage_tags: true },
      ...extras.reference,
    },
    usage_tags: extras.usage_tags,
    species_affinity: extras.species_affinity,
    completion_flags: extras.completion_flags,
  };
}

async function seedMongo(db) {
  const traits = [
    createTraitDocument('ghiaccio_piezoelettrico', 'Ghiaccio Piezoelettrico'),
    createTraitDocument('criostasi_adattiva', 'Criostasi Adattiva', {
      reference: { usage_tags: ['criogenico'], environments: ['frozen'] },
    }),
    createTraitDocument('gusci_criovetro', 'Gusci Criovetro', {
      reference: { usage_tags: ['difensivo'], environments: ['frozen'] },
    }),
    createTraitDocument('antenne_wideband', 'Antenne Wideband', {
      reference: { usage_tags: ['supporto'], environments: ['arid'] },
    }),
  ];
  await db.collection('traits').insertMany(traits);

  await db.collection('biome_pools').insertOne({
    _id: 'mongo_test_pool',
    label: 'Bioma Mongo Test',
    summary: 'Pool creato per verificare la generazione via MongoDB',
    climate_tags: ['arid', 'storm'],
    size: { min: 3, max: 5 },
    hazard: {
      severity: 'high',
      description: 'Tempeste ferrose mirate dalle creste magnetiche.',
    },
    ecology: {
      biome_type: 'badlands',
      primary_resources: ['ferro_memoria'],
    },
    traits: {
      core: ['ghiaccio_piezoelettrico', 'criostasi_adattiva', 'gusci_criovetro'],
      support: ['antenne_wideband'],
    },
    role_templates: [
      {
        role: 'apex',
        label: 'Predatore Magnetico',
        summary: 'Concentra scariche elettromagnetiche sulle prede.',
        functional_tags: ['offensivo'],
        preferred_traits: ['ghiaccio_piezoelettrico', 'criostasi_adattiva'],
        tier: 4,
      },
      {
        role: 'keystone',
        label: 'Stabilizzatore di Creste',
        summary: 'Gestisce ponti conduttivi durante le tempeste.',
        functional_tags: ['supporto'],
        preferred_traits: ['antenne_wideband'],
        tier: 3,
      },
      {
        role: 'threat',
        label: 'Sciame Ferruginoso',
        summary: 'Causa corrosione accelerata sulle infrastrutture.',
        functional_tags: ['sabotaggio'],
        preferred_traits: ['gusci_criovetro'],
        tier: 3,
      },
    ],
  });
}

function restoreEnv(key, value) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

test('POST /api/v1/generation/biomes utilizza i dati MongoDB quando disponibili', async (t) => {
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  const databaseName = 'evo_generator_test';
  const client = new MongoClient(mongoUri);
  await client.connect();

  t.after(async () => {
    await closeMongo();
    await client.close();
    await mongoServer.stop();
  });

  const db = client.db(databaseName);
  await seedMongo(db);

  const catalogService = createCatalogService({
    useMongo: true,
    mongo: { uri: mongoUri, dbName: databaseName },
  });
  const readiness = await catalogService.ensureReady();
  assert.ok(readiness.poolCount > 0, 'il seed Mongo deve popolare almeno un biome pool');

  const previousMongoUrl = process.env.MONGO_URL;
  const previousMongoDb = process.env.MONGO_DB_NAME;
  process.env.MONGO_URL = mongoUri;
  process.env.MONGO_DB_NAME = databaseName;

  t.after(async () => {
    restoreEnv('MONGO_URL', previousMongoUrl);
    restoreEnv('MONGO_DB_NAME', previousMongoDb);
    await closeMongo();
    await client.close();
    await mongoServer.stop();
  });

  const { app } = createApp({
    dataRoot: path.resolve(__dirname, '..', '..', 'data'),
  });

  const response = await request(app)
    .post('/api/v1/generation/biomes')
    .send({
      count: 1,
      constraints: {
        requiredRoles: ['apex', 'keystone', 'threat'],
        hazard: 'high',
      },
      seed: 42,
    })
    .expect(200);

  const { biomes, meta } = response.body;
  assert.ok(Array.isArray(biomes), 'la risposta deve contenere un array di biomi');
  assert.equal(biomes.length, 1, 'deve essere generato un singolo bioma');
  const biome = biomes[0];
  assert.equal(
    biome?.hazard?.description,
    'Tempeste ferrose mirate dalle creste magnetiche.',
    'la descrizione hazard deve provenire dal dataset MongoDB',
  );
  assert.equal(meta?.poolCount, 1, 'il conteggio pool deve riflettere i documenti MongoDB');

  const traitIds = Array.isArray(biome?.traits?.ids) ? biome.traits.ids : [];
  assert.ok(
    traitIds.includes('ghiaccio_piezoelettrico'),
    'i tratti devono includere le entry seedate',
  );
  assert.ok(traitIds.includes('criostasi_adattiva'));
  assert.ok(Array.isArray(biome?.species), 'le specie generate devono essere presenti');
  assert.ok(biome.species.length >= 3, 'le specie devono coprire i ruoli principali');
  biome.species.forEach((species) => {
    assert.equal(species.synthetic, true);
    assert.ok(species.display_name);
  });
});

test('seed_evo_generator.seed_database popola il catalogo MongoDB e le API espongono i pool', async (t) => {
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  const databaseName = 'evo_seed_catalog_test';

  const pythonEnv = { ...process.env };
  const pythonCheck = spawnSync('python3', ['-c', 'import pymongo'], { env: pythonEnv });
  if (pythonCheck.status !== 0) {
    const pipInstall = spawnSync('python3', ['-m', 'pip', 'install', '--quiet', 'pymongo'], {
      env: pythonEnv,
    });
    if (pipInstall.status !== 0) {
      const stderr = pipInstall.stderr ? pipInstall.stderr.toString() : '';
      const stdout = pipInstall.stdout ? pipInstall.stdout.toString() : '';
      throw new Error(`Impossibile installare pymongo: ${stderr || stdout}`);
    }
  }

  const seedScriptPath = path.resolve(
    __dirname,
    '..',
    '..',
    'scripts',
    'db',
    'seed_evo_generator.py',
  );
  const seedResult = spawnSync(
    'python3',
    [seedScriptPath, '--mongo-url', mongoUri, '--database', databaseName],
    {
      cwd: path.resolve(__dirname, '..', '..'),
      env: pythonEnv,
    },
  );
  if (seedResult.status !== 0) {
    const stderr = seedResult.stderr ? seedResult.stderr.toString() : '';
    const stdout = seedResult.stdout ? seedResult.stdout.toString() : '';
    throw new Error(`Seed script fallito: ${stderr || stdout}`);
  }

  const client = new MongoClient(mongoUri);
  await client.connect();

  t.after(async () => {
    await closeMongo();
    await client.close();
    await mongoServer.stop();
  });

  const db = client.db(databaseName);
  const seededPoolsCount = await db.collection('biome_pools').countDocuments({});
  assert.ok(seededPoolsCount > 0, 'il seed deve popolare almeno un pool');
  const seededPool = await db.collection('biome_pools').findOne({ _id: 'cryosteppe_convergence' });
  assert.ok(seededPool, 'il pool cryosteppe_convergence deve essere presente');

  const catalogService = createCatalogService({
    useMongo: true,
    mongo: { uri: mongoUri, dbName: databaseName },
  });
  const readiness = await catalogService.ensureReady();
  assert.equal(readiness.source, 'mongo');
  assert.equal(readiness.poolCount, seededPoolsCount);
  assert.ok(readiness.traitCount > 0, 'il catalogo deve esporre tratti seedati');

  const { pools: servicePools } = await catalogService.loadBiomePools();
  assert.ok(Array.isArray(servicePools));
  assert.equal(servicePools.length, seededPoolsCount);
  const servicePool = servicePools.find((pool) => pool.id === 'cryosteppe_convergence');
  assert.ok(servicePool, 'il catalog service deve esporre il pool cryosteppe_convergence');
  assert.equal(servicePool.hazard?.severity, seededPool.hazard?.severity);
  assert.equal(servicePool.metadata?.schema_version, seededPool.metadata?.schema_version);

  const { app } = createApp({
    dataRoot: path.resolve(__dirname, '..', '..', 'data'),
    catalogService,
  });

  const apiCandidates = [
    { path: '/api/v1/catalog/pools', extract: (body) => body?.pools },
    { path: '/api/v1/catalog/biome-pools', extract: (body) => body?.pools },
    { path: '/api/v1/catalog/biomes', extract: (body) => body?.pools || body?.biomes },
    { path: '/api/catalog/pools', extract: (body) => body?.pools },
  ];

  let apiPools = null;
  let apiPathUsed = null;
  let lastResponse = null;
  for (const candidate of apiCandidates) {
    const response = await request(app).get(candidate.path);
    lastResponse = response;
    if (response.status !== 200) {
      continue;
    }
    const extracted = candidate.extract(response.body);
    if (Array.isArray(extracted) && extracted.length > 0) {
      apiPools = extracted;
      apiPathUsed = candidate.path;
      break;
    }
  }

  assert.ok(
    apiPools,
    `Nessun endpoint catalog disponibile (ultimo stato ${lastResponse ? lastResponse.status : 'n/d'})`,
  );

  const apiPool = apiPools.find((entry) => {
    const entryId = entry?.id || entry?._id;
    return entryId === 'cryosteppe_convergence';
  });
  assert.ok(apiPool, `Il pool cryosteppe_convergence non è stato esposto da ${apiPathUsed}`);

  const apiHazard = apiPool.hazard || (apiPool.details ? apiPool.details.hazard : null);
  const apiMetadata = apiPool.metadata || apiPool.meta || {};
  const apiSchemaVersion = apiMetadata.schema_version || apiMetadata.schemaVersion || null;
  assert.equal(apiHazard?.severity, seededPool.hazard?.severity);
  assert.equal(apiSchemaVersion, seededPool.metadata?.schema_version);

  // cleanup gestito da t.after sopra
});
