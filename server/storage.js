const path = require('node:path');
const fs = require('node:fs');
const Datastore = require('nedb-promises');

function normaliseTags(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((tag) => String(tag).trim()).filter(Boolean);
  }
  if (typeof input === 'string') {
    return input
      .split(/\s|,/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
}

function timestamp() {
  return new Date().toISOString();
}

class IdeaRepository {
  constructor(databasePath = path.resolve(__dirname, '..', 'data', 'idea_engine.db')) {
    this.databasePath = databasePath;
    const directory = path.dirname(this.databasePath);
    fs.mkdirSync(directory, { recursive: true });
    this.db = Datastore.create({ filename: this.databasePath, autoload: false });
    this.sequence = 0;
    this.ready = this.db.load().then(() => this.#initialiseSequence());
  }

  async #initialiseSequence() {
    const docs = await this.db.find({}).sort({ id: -1 }).limit(1);
    if (Array.isArray(docs) && docs.length > 0 && typeof docs[0].id === 'number') {
      this.sequence = docs[0].id;
    } else {
      this.sequence = 0;
    }
  }

  #docToIdea(doc) {
    if (!doc) return null;
    return {
      id: doc.id,
      title: doc.title,
      summary: doc.summary || '',
      category: doc.category,
      tags: Array.isArray(doc.tags) ? doc.tags : [],
      module: doc.module || '',
      entities: doc.entities || '',
      priority: doc.priority || '',
      actions_next: doc.actions_next || '',
      link_drive: doc.link_drive || '',
      github: doc.github || '',
      note: doc.note || '',
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    };
  }

  async list() {
    await this.ready;
    const docs = await this.db.find({}).sort({ created_at: -1, id: -1 });
    return docs.map((doc) => this.#docToIdea(doc));
  }

  async getById(id) {
    await this.ready;
    if (!Number.isFinite(id)) return null;
    const doc = await this.db.findOne({ id });
    return this.#docToIdea(doc);
  }

  async create(payload) {
    await this.ready;
    const data = {
      title: String(payload.title || '').trim(),
      summary: String(payload.summary || '').trim(),
      category: String(payload.category || '').trim(),
      tags: normaliseTags(payload.tags),
      module: String(payload.module || '').trim(),
      entities: String(payload.entities || '').trim(),
      priority: String(payload.priority || '').trim() || 'P2',
      actions_next: String(payload.actions_next || '').trim(),
      link_drive: String(payload.link_drive || '').trim(),
      github: String(payload.github || '').trim(),
      note: String(payload.note || '').trim(),
    };

    if (!data.title) {
      throw new Error('Titolo richiesto');
    }
    if (!data.category) {
      throw new Error('Categoria richiesta');
    }

    this.sequence += 1;
    const now = timestamp();
    const doc = {
      ...data,
      id: this.sequence,
      created_at: now,
      updated_at: now,
    };
    await this.db.insert(doc);
    return this.#docToIdea(doc);
  }
}

module.exports = {
  IdeaRepository,
  normaliseTags,
};
