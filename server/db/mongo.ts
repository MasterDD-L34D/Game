export interface MongoConnectionOptions {
  uri?: string;
  mongoUrl?: string;
  url?: string;
  dbName?: string;
  database?: string;
  mongoDb?: string;
  options?: Record<string, unknown>;
  client?: unknown;
  db?: unknown;
  forceNew?: boolean;
}

interface MongoConfig {
  uri: string | null;
  dbName: string | null;
  options: Record<string, unknown>;
  enabled: boolean;
}

const implementation = require('./mongo.js') as {
  connectMongo: (overrides?: MongoConnectionOptions) => Promise<any>;
  getMongoDatabase: (overrides?: MongoConnectionOptions) => Promise<any>;
  closeMongo: () => Promise<void>;
  checkMongoHealth: (
    overrides?: MongoConnectionOptions,
  ) => Promise<{ ok: boolean; error?: unknown }>;
  getMongoConfig: () => { uri: string | null; dbName: string | null; enabled: boolean };
  resolveMongoConfig: (overrides?: MongoConnectionOptions) => MongoConfig;
};

export const connectMongo = implementation.connectMongo;
export const getMongoDatabase = implementation.getMongoDatabase;
export const closeMongo = implementation.closeMongo;
export const checkMongoHealth = implementation.checkMongoHealth;
export const getMongoConfig = implementation.getMongoConfig;
export const resolveMongoConfig = implementation.resolveMongoConfig;
