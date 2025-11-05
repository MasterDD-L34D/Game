let MongoClient = null;

function requireMongoClient() {
  if (MongoClient) {
    return MongoClient;
  }
  try {
    // eslint-disable-next-line global-require
    ({ MongoClient } = require('mongodb'));
    return MongoClient;
  } catch (error) {
    throw new Error(
      'Impossibile caricare il driver MongoDB: installare la dipendenza "mongodb" per abilitare il datastore',
    );
  }
}

let sharedClient = null;
let connectPromise = null;
let sharedConfig = null;

function resolveMongoConfig(overrides = {}) {
  const envUri =
    overrides.uri ||
    overrides.mongoUrl ||
    overrides.url ||
    (sharedConfig ? sharedConfig.uri : null) ||
    process.env.MONGO_URL ||
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    null;
  const envDbName =
    overrides.dbName ||
    overrides.database ||
    overrides.mongoDb ||
    (sharedConfig ? sharedConfig.dbName : null) ||
    process.env.MONGO_DB_NAME ||
    process.env.MONGO_DB ||
    null;
  const options = {
    ...(sharedConfig && sharedConfig.options ? sharedConfig.options : {}),
    ...(overrides.options || {}),
  };
  const poolSizeEnv = Number.parseInt(process.env.MONGO_MAX_POOL_SIZE || '', 10);
  if (!Number.isNaN(poolSizeEnv) && poolSizeEnv > 0 && options.maxPoolSize === undefined) {
    options.maxPoolSize = poolSizeEnv;
  }
  const uri = envUri || null;
  const dbName = envDbName || null;
  return {
    uri,
    dbName,
    options,
    enabled: Boolean(uri && dbName),
  };
}

async function connectMongo(overrides = {}) {
  if (overrides.client) {
    return overrides.client;
  }
  const config = resolveMongoConfig(overrides);
  if (!config.enabled) {
    throw new Error('Connessione MongoDB non configurata: impostare MONGO_URL e MONGO_DB_NAME');
  }
  if (sharedClient && !overrides.forceNew) {
    return sharedClient;
  }
  if (!connectPromise) {
    const mongoOptions = {
      maxPoolSize: 10,
      ...config.options,
    };
    const Driver = requireMongoClient();
    connectPromise = Driver.connect(config.uri, mongoOptions)
      .then((client) => {
        sharedClient = client;
        sharedConfig = { ...config };
        return client;
      })
      .finally(() => {
        connectPromise = null;
      });
  }
  return connectPromise;
}

async function getMongoDatabase(overrides = {}) {
  if (overrides.db) {
    return overrides.db;
  }
  const client = await connectMongo(overrides);
  const config = resolveMongoConfig(overrides);
  if (!config.dbName) {
    throw new Error('Nome database MongoDB non configurato');
  }
  return client.db(config.dbName);
}

async function closeMongo() {
  if (connectPromise) {
    try {
      await connectPromise;
    } catch (error) {
      // ignore connection errors during close
    }
    connectPromise = null;
  }
  if (sharedClient) {
    await sharedClient.close();
    sharedClient = null;
    sharedConfig = null;
  }
}

async function checkMongoHealth(overrides = {}) {
  try {
    const db = await getMongoDatabase(overrides);
    await db.command({ ping: 1 });
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

function getMongoConfig() {
  const config = resolveMongoConfig();
  return { uri: config.uri, dbName: config.dbName, enabled: config.enabled };
}

module.exports = {
  connectMongo,
  getMongoDatabase,
  closeMongo,
  checkMongoHealth,
  getMongoConfig,
  resolveMongoConfig,
};
