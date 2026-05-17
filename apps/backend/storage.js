const { prisma } = require('./db/prisma');

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

function normaliseList(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof input === 'string') {
    return input
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

class IdeaRepository {
  constructor(options = {}) {
    this.prisma = options.prisma || prisma;
  }

  #mapFeedback(entry) {
    return {
      id: entry.id,
      message: entry.message,
      contact: entry.contact || '',
      created_at: entry.createdAt ? entry.createdAt.toISOString() : null,
    };
  }

  #mapIdea(record) {
    if (!record) return null;
    const feedback = Array.isArray(record.feedback)
      ? record.feedback.map((item) => this.#mapFeedback(item))
      : [];
    return {
      id: record.id,
      title: record.title,
      summary: record.summary || '',
      category: record.category,
      tags: Array.isArray(record.tags) ? record.tags : [],
      biomes: Array.isArray(record.biomes) ? record.biomes : [],
      ecosystems: Array.isArray(record.ecosystems) ? record.ecosystems : [],
      species: Array.isArray(record.species) ? record.species : [],
      traits: Array.isArray(record.traits) ? record.traits : [],
      game_functions: Array.isArray(record.gameFunctions) ? record.gameFunctions : [],
      priority: record.priority || '',
      actions_next: record.actionsNext || '',
      link_drive: record.linkDrive || '',
      github: record.github || '',
      note: record.note || '',
      allowSlugOverride: Boolean(record.allowSlugOverride),
      feedback,
      created_at: record.createdAt ? record.createdAt.toISOString() : null,
      updated_at: record.updatedAt ? record.updatedAt.toISOString() : null,
    };
  }

  async list() {
    const ideas = await this.prisma.idea.findMany({
      include: { feedback: { orderBy: { createdAt: 'asc' } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return ideas.map((record) => this.#mapIdea(record));
  }

  async getById(id) {
    if (!Number.isFinite(id)) return null;
    const record = await this.prisma.idea.findUnique({
      where: { id },
      include: { feedback: { orderBy: { createdAt: 'asc' } } },
    });
    return this.#mapIdea(record);
  }

  async create(payload) {
    const data = {
      title: String(payload.title || '').trim(),
      summary: String(payload.summary || '').trim(),
      category: String(payload.category || '').trim(),
      tags: normaliseTags(payload.tags),
      biomes: normaliseList(payload.biomes),
      ecosystems: normaliseList(payload.ecosystems),
      species: normaliseList(payload.species),
      traits: normaliseList(payload.traits),
      gameFunctions: normaliseList(payload.game_functions || payload.gameFunctions),
      priority: String(payload.priority || '').trim() || 'P2',
      actionsNext: String(payload.actions_next || payload.actionsNext || '').trim(),
      linkDrive: String(payload.link_drive || payload.linkDrive || '').trim(),
      github: String(payload.github || '').trim(),
      note: String(payload.note || '').trim(),
      allowSlugOverride: Boolean(payload.allowSlugOverride),
    };

    if (!data.title) {
      throw new Error('Titolo richiesto');
    }
    if (!data.category) {
      throw new Error('Categoria richiesta');
    }

    const record = await this.prisma.idea.create({
      data,
      include: { feedback: true },
    });
    return this.#mapIdea(record);
  }

  async addFeedback(id, payload) {
    if (!Number.isFinite(id)) {
      throw new Error('ID non valido');
    }
    const message = String(payload && payload.message ? payload.message : '').trim();
    const contact = String(payload && payload.contact ? payload.contact : '').trim();
    if (!message) {
      throw new Error('Messaggio feedback richiesto');
    }
    const existing = await this.prisma.idea.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Idea non trovata');
    }
    const updated = await this.prisma.idea.update({
      where: { id },
      data: {
        feedback: {
          create: {
            message,
            contact,
          },
        },
      },
      include: { feedback: { orderBy: { createdAt: 'asc' } } },
    });
    return this.#mapIdea(updated);
  }
}

module.exports = {
  IdeaRepository,
  normaliseTags,
  normaliseList,
};
