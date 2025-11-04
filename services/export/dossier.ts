export interface DossierMetrics {
  biomeCount: number;
  speciesCount: number;
  seedCount: number;
  uniqueSpeciesCount?: number;
}

export interface ActivityEntry {
  [key: string]: unknown;
}

export interface DossierContext {
  slug: string;
  folder: string;
  filters?: Record<string, unknown> | null;
  filterSummary?: string | null;
  ecosystemLabel: string;
  metrics: DossierMetrics;
  payload: unknown;
  activityEntries: ActivityEntry[];
  biomes: unknown[];
  speciesBuckets: Record<string, unknown[]>;
  seeds: unknown[];
  pinnedEntries: unknown[];
  narrative?: Record<string, unknown> | null;
  insights?: unknown[];
  generatedAt?: Date | string;
  composer?: Record<string, unknown> | null;
}

export interface TemplateCache {
  get(): string | null | undefined;
  set(value: string | null): void;
}

export interface LoadTemplateOptions {
  fetchImpl?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  cache?: TemplateCache | null;
  signal?: AbortSignal;
}

export interface DossierHelpers {
  presetLabel?: string | null;
  roleLabels: Record<string, string>;
  titleCase: (value: string) => string;
  findBiomeLabelById?: (biomeId: string | null | undefined) => string | null;
}

export interface GeneratedFileDescriptor {
  id: string;
  name: string;
  mime: string;
  data: string | Blob;
  binary?: boolean;
}

export interface PresetFileConfig {
  id: string;
  builder: string;
  filename: ((slug: string) => string) | string;
  description?: string | ((context: DossierContext) => string);
}

export interface PresetDescriptor {
  files: PresetFileConfig[];
}

export interface DossierExportOptions extends DossierHelpers {
  template: string;
  slug: string;
  html2pdf?: unknown;
}

export interface PresetContentOptions extends DossierHelpers {
  templateLoader: () => Promise<string | null>;
  slug: string;
  html2pdf?: unknown;
  toYAML: (value: unknown) => string;
  activityLogToCsv: (entries: ActivityEntry[]) => string;
}

function ensureFetcher(
  fetchImpl?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
) {
  if (typeof fetchImpl === 'function') {
    return fetchImpl;
  }
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch.bind(globalThis);
  }
  throw new Error("fetch non disponibile nell'ambiente corrente");
}

export async function loadDossierTemplate(
  path: string,
  options: LoadTemplateOptions = {},
): Promise<string | null> {
  const { cache = null, fetchImpl, signal } = options;
  const cached = cache?.get?.();
  if (cached) {
    return cached;
  }
  const fetcher = (() => {
    try {
      return ensureFetcher(fetchImpl);
    } catch (error) {
      console.warn('fetch non disponibile per il caricamento del template dossier', error);
      return null;
    }
  })();
  if (!fetcher) {
    return null;
  }
  try {
    const response = await fetcher(path, { cache: 'no-cache', signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const text = await response.text();
    cache?.set?.(text);
    return text;
  } catch (error) {
    console.warn('Impossibile caricare il template del dossier', error);
    cache?.set?.(null);
    return null;
  }
}

function flattenSpeciesBuckets(buckets: Record<string, unknown[]> = {}): unknown[] {
  const seen = new Map<string, unknown>();
  Object.values(buckets)
    .filter((list): list is unknown[] => Array.isArray(list))
    .forEach((list) => {
      list.forEach((entry) => {
        if (!entry || typeof entry !== 'object') return;
        const key =
          (entry as Record<string, unknown>).id ||
          (entry as Record<string, unknown>).display_name ||
          (entry as Record<string, unknown>).displayName ||
          (entry as Record<string, unknown>).speciesId ||
          null;
        if (!key || seen.has(String(key))) return;
        seen.set(String(key), entry);
      });
    });
  return Array.from(seen.values());
}

function summariseSeedParty(seed: Record<string, unknown>): string {
  const party = Array.isArray(seed.party) ? seed.party : [];
  if (!party.length) {
    return 'Nessuna specie associata al seed con i filtri correnti.';
  }
  return party
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const value = entry as Record<string, unknown>;
      const parts = [String(value.display_name ?? value.id ?? 'Specie')];
      const meta: string[] = [];
      if (typeof value.role === 'string' && value.role.length) meta.push(value.role);
      if (typeof value.tier === 'number') meta.push(`T${value.tier}`);
      if (typeof value.count === 'number' && value.count > 1) meta.push(`x${value.count}`);
      if (meta.length) {
        parts.push(`(${meta.join(' · ')})`);
      }
      return parts.join(' ');
    })
    .filter(Boolean)
    .join('; ');
}

function formatSpotlightLine(entry: Record<string, unknown>): string | null {
  if (!entry) return null;
  const name = String(
    entry.displayName ?? entry.display_name ?? entry.speciesId ?? entry.id ?? '',
  ).trim();
  if (!name) return null;
  const biomeLabel = entry.biomeLabel ?? entry.biome_id ?? entry.biome ?? null;
  const tierLabel = typeof entry.tier === 'number' ? `T${entry.tier}` : null;
  const synthLabel = entry.synthetic ? 'Synth' : null;
  const tags = [biomeLabel, tierLabel, synthLabel].filter(Boolean).join(' · ');
  return tags ? `- ${name} (${tags})` : `- ${name}`;
}

function formatSpeciesFallbackLine(
  species: Record<string, unknown>,
  helpers: DossierHelpers,
): string | null {
  if (!species) return null;
  const name = String(species.display_name ?? species.id ?? 'Specie');
  const biomeCode = species.biome_id ?? species.biome ?? species.habitat_code ?? null;
  const biomeLabel = helpers.findBiomeLabelById?.(biomeCode as string | null) ?? biomeCode;
  const roleCode = species.role_trofico ?? species.role ?? null;
  const resolvedRole =
    typeof roleCode === 'string'
      ? (helpers.roleLabels[roleCode] ?? helpers.titleCase(roleCode.replace(/_/g, ' ')))
      : null;
  const tags = [biomeLabel, resolvedRole].filter(Boolean).join(' · ');
  return tags ? `- ${name} (${tags})` : `- ${name}`;
}

function formatSeedSummary(seed: Record<string, unknown>, helpers: DossierHelpers): string | null {
  if (!seed) return null;
  const label = String(seed.label ?? seed.id ?? 'Seed');
  const biomeCode = seed.biome_id ?? seed.biome ?? null;
  const biomeLabel = helpers.findBiomeLabelById?.(biomeCode as string | null) ?? biomeCode;
  const threat = typeof seed.threat_budget === 'number' ? `Budget T${seed.threat_budget}` : null;
  const synth = seed.synthetic ? 'Synth' : null;
  const segments = [label, biomeLabel, threat, synth].filter(Boolean).join(' · ');
  return segments ? `- ${segments}` : null;
}

export function generateDossierDocument(
  context: DossierContext,
  helpers: DossierHelpers & { template: string },
): Document {
  const parser = new DOMParser();
  const doc = parser.parseFromString(helpers.template, 'text/html');
  const setSlotText = (slot: string, value: string | null | undefined) => {
    const target = doc.querySelector(`[data-slot="${slot}"]`);
    if (target) {
      target.textContent = value ?? '';
    }
  };

  const generatedAt = context.generatedAt
    ? context.generatedAt instanceof Date
      ? context.generatedAt
      : new Date(context.generatedAt)
    : new Date();

  const locale = 'it-IT';
  const generatedLabel = generatedAt.toLocaleString(locale, { hour12: false });

  setSlotText('title', `${context.ecosystemLabel} · Dossier`);
  setSlotText('heading', context.ecosystemLabel);
  setSlotText(
    'badge',
    helpers.presetLabel ? `Preset · ${helpers.presetLabel}` : 'Ecosystem dossier',
  );
  setSlotText('meta', `Generato il ${generatedLabel}`);

  const summaryParts = [
    `${context.metrics.biomeCount} biomi`,
    `${context.metrics.speciesCount} specie`,
    `${context.metrics.seedCount} seed`,
  ];
  if (context.metrics.uniqueSpeciesCount) {
    summaryParts.push(`${context.metrics.uniqueSpeciesCount} specie uniche`);
  }
  if (context.filterSummary) {
    summaryParts.push(`Filtri: ${context.filterSummary}`);
  }
  setSlotText('summary', summaryParts.join(' · '));

  const activityContainer = doc.querySelector('[data-slot="activity"]');
  if (activityContainer) {
    activityContainer.innerHTML = '';
    context.activityEntries.slice(0, 12).forEach((entry) => {
      const item = doc.createElement('li');
      item.className = 'dossier__list-item';
      const text = String(entry.summary ?? entry.message ?? '').trim();
      item.textContent = text || 'Evento attività';
      activityContainer.appendChild(item);
    });
  }

  const biomeContainer = doc.querySelector('[data-slot="biomes"]');
  if (biomeContainer) {
    biomeContainer.innerHTML = '';
    context.biomes.slice(0, 6).forEach((biome) => {
      const record = biome as Record<string, unknown>;
      const item = doc.createElement('li');
      item.className = 'dossier__list-item';
      const heading = doc.createElement('h3');
      const headingParts = [record.label ?? record.id ?? 'Bioma'];
      const hazard = record.hazard as Record<string, unknown> | undefined;
      if (hazard?.severity) {
        headingParts.push(`Pericolo ${helpers.titleCase(String(hazard.severity))}`);
      }
      heading.textContent = headingParts.filter(Boolean).join(' · ');
      const summary = doc.createElement('p');
      const speciesCount = Array.isArray(record.species) ? record.species.length : 0;
      summary.textContent = `Specie disponibili: ${speciesCount}.`;
      item.append(heading, summary);
      biomeContainer.appendChild(item);
    });
  }

  const speciesContainer = doc.querySelector('[data-slot="species"]');
  if (speciesContainer) {
    speciesContainer.innerHTML = '';
    flattenSpeciesBuckets(context.speciesBuckets)
      .slice(0, 12)
      .forEach((entry) => {
        const record = entry as Record<string, unknown>;
        const item = doc.createElement('li');
        item.className = 'dossier__list-item';
        const heading = doc.createElement('h3');
        heading.textContent = String(record.display_name ?? record.id ?? 'Specie');
        const meta = doc.createElement('p');
        const metaParts: string[] = [];
        if (record.role_trofico) {
          const role = String(record.role_trofico);
          metaParts.push(helpers.roleLabels[role] ?? helpers.titleCase(role.replace(/_/g, ' ')));
        }
        if (record.balance?.threat_tier) {
          metaParts.push(String(record.balance.threat_tier));
        }
        if (Array.isArray(record.biomes) && record.biomes.length) {
          metaParts.push(`Biomi: ${record.biomes.join(', ')}`);
        }
        meta.textContent = metaParts.length ? metaParts.join(' · ') : 'Dati sintetici';
        item.append(heading, meta);

        const tags = Array.isArray(record.functional_tags)
          ? record.functional_tags.slice(0, 8)
          : [];
        if (tags.length) {
          const chipList = doc.createElement('div');
          chipList.className = 'dossier__chips';
          tags.forEach((tag) => {
            const chip = doc.createElement('span');
            chip.className = 'dossier__chip';
            chip.textContent = String(tag);
            chipList.appendChild(chip);
          });
          item.appendChild(chipList);
        }

        speciesContainer.appendChild(item);
      });
  }

  const seedsContainer = doc.querySelector('[data-slot="seeds"]');
  if (seedsContainer) {
    seedsContainer.innerHTML = '';
    context.seeds.slice(0, 10).forEach((seedEntry) => {
      const record = seedEntry as Record<string, unknown>;
      const item = doc.createElement('li');
      item.className = 'dossier__list-item';
      const heading = doc.createElement('h3');
      const headingParts = [record.biome_id ?? record.biome ?? record.id ?? 'Seed'];
      if (record.label) headingParts.push(String(record.label));
      heading.textContent = headingParts.join(' · ');
      const meta = doc.createElement('p');
      meta.textContent = `Budget minaccia: T${record.threat_budget ?? '?'}`;
      const composition = doc.createElement('p');
      composition.textContent = summariseSeedParty(record);
      item.append(heading, meta, composition);
      seedsContainer.appendChild(item);
    });
  }

  return doc;
}

export async function generateDossierHtml(
  context: DossierContext,
  helpers: DossierHelpers & { templateLoader: () => Promise<string | null> },
): Promise<string | null> {
  const template = await helpers.templateLoader();
  if (!template) {
    return null;
  }
  const doc = generateDossierDocument(context, { ...helpers, template });
  return `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
}

export async function generateDossierPdfBlob(
  context: DossierContext,
  options: DossierExportOptions & { templateLoader: () => Promise<string | null> },
): Promise<Blob> {
  if (typeof window === 'undefined' || !options.html2pdf) {
    throw new Error('html2pdf non disponibile');
  }
  const template = await options.templateLoader();
  if (!template) {
    throw new Error('Template dossier non disponibile');
  }
  const html = await generateDossierHtml(context, {
    presetLabel: options.presetLabel,
    roleLabels: options.roleLabels,
    titleCase: options.titleCase,
    findBiomeLabelById: options.findBiomeLabelById,
    templateLoader: async () => template,
  });
  if (!html) {
    throw new Error('Impossibile generare il dossier HTML');
  }
  const worker = (options.html2pdf as typeof window.html2pdf)().set({
    margin: 10,
    filename: `${options.slug}-dossier.pdf`,
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  });
  const blob = await worker.from(html).outputPdf('blob');
  return blob;
}

export function buildPressKitMarkdown(context: DossierContext, helpers: DossierHelpers): string {
  const metrics = context.metrics || {
    biomeCount: 0,
    speciesCount: 0,
    uniqueSpeciesCount: 0,
    seedCount: 0,
  };
  const generatedAt =
    context.generatedAt instanceof Date
      ? context.generatedAt
      : new Date(context.generatedAt ?? Date.now());

  const lines: string[] = [];
  lines.push(`# ${context.ecosystemLabel} — Demo pubblico`);
  lines.push('');
  lines.push(
    `Generato il ${generatedAt.toLocaleString('it-IT', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })} con ${metrics.biomeCount} biomi, ${metrics.speciesCount} specie (${metrics.uniqueSpeciesCount ?? 0} uniche) e ${metrics.seedCount} seed narrativi.`,
  );
  if (context.filterSummary) {
    lines.push(`Filtri attivi: ${context.filterSummary}.`);
  }
  lines.push('');

  lines.push('## Metriche chiave');
  lines.push('');
  lines.push(`- Biomi selezionati: ${metrics.biomeCount}`);
  lines.push(
    `- Specie totali: ${metrics.speciesCount} (${metrics.uniqueSpeciesCount ?? 0} uniche)`,
  );
  lines.push(`- Seed narrativi: ${metrics.seedCount}`);
  const highlightBiome =
    Array.isArray(context.biomes) && context.biomes.length ? context.biomes[0] : null;
  if (highlightBiome) {
    const label =
      (highlightBiome as Record<string, unknown>).label ??
      (highlightBiome as Record<string, unknown>).id ??
      'Bioma';
    lines.push(`- Bioma in evidenza: ${label}`);
  }
  lines.push('');

  const pinnedLines = Array.isArray(context.pinnedEntries)
    ? (context.pinnedEntries as Record<string, unknown>[])
        .map((entry) => formatSpotlightLine(entry))
        .filter(Boolean)
        .slice(0, 3)
    : [];
  let spotlightLines = pinnedLines;
  if (!spotlightLines.length) {
    spotlightLines = flattenSpeciesBuckets(context.speciesBuckets)
      .map((species) => formatSpeciesFallbackLine(species as Record<string, unknown>, helpers))
      .filter(Boolean)
      .slice(0, 3);
  }
  if (spotlightLines.length) {
    lines.push('## Specie spotlight');
    lines.push('');
    spotlightLines.forEach((line) => lines.push(line as string));
    lines.push('');
  }

  const seedLines = Array.isArray(context.seeds)
    ? (context.seeds as Record<string, unknown>[])
        .map((seed) => formatSeedSummary(seed, helpers))
        .filter(Boolean)
        .slice(0, 4)
    : [];
  if (seedLines.length) {
    lines.push('## Seed narrativi in evidenza');
    lines.push('');
    seedLines.forEach((line) => lines.push(line as string));
    lines.push('');
  }

  const recommendations = Array.isArray(context.insights) ? context.insights : [];
  if (recommendations.length) {
    lines.push('## Insight operativi');
    lines.push('');
    recommendations.slice(0, 4).forEach((rec) => {
      if (!rec || typeof rec !== 'object') return;
      const record = rec as Record<string, unknown>;
      if (!record.message) return;
      const tone = record.tone ? String(record.tone).toUpperCase() : null;
      const prefix = tone ? `[${tone}] ` : '';
      lines.push(`- ${prefix}${record.message}`);
    });
    lines.push('');
  }

  if (context.narrative && typeof context.narrative === 'object') {
    const narrative = context.narrative as Record<string, unknown>;
    if (narrative.narrativeHook) {
      lines.push('## Hook narrativo');
      lines.push('');
      lines.push(String(narrative.narrativeHook));
      lines.push('');
    }
  }

  lines.push('## Call to action');
  lines.push('');
  lines.push('- Condividi il dossier HTML con Marketing/Comms per asset visivi aggiornati.');
  lines.push('- Usa il manifesto YAML per predisporre il deploy statico o la CDN demo.');
  lines.push('- Integra il press kit nelle note di rilascio e nella newsletter della demo.');
  lines.push('');

  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}

export async function generatePresetFileContents(
  preset: PresetDescriptor,
  context: DossierContext,
  options: PresetContentOptions,
): Promise<{ files: GeneratedFileDescriptor[]; context: DossierContext }> {
  const files: GeneratedFileDescriptor[] = [];
  let cachedTemplate: string | null | undefined;
  let cachedHtml: string | null | undefined;
  let cachedPdf: Blob | null | undefined;

  const ensureTemplate = async () => {
    if (cachedTemplate !== undefined) return cachedTemplate;
    cachedTemplate = await options.templateLoader();
    return cachedTemplate;
  };

  const ensureHtml = async () => {
    if (cachedHtml !== undefined) return cachedHtml;
    const template = await ensureTemplate();
    if (!template) {
      cachedHtml = null;
      return cachedHtml;
    }
    cachedHtml = await generateDossierHtml(context, {
      presetLabel: options.presetLabel,
      roleLabels: options.roleLabels,
      titleCase: options.titleCase,
      findBiomeLabelById: options.findBiomeLabelById,
      templateLoader: async () => template,
    });
    return cachedHtml;
  };

  const ensurePdf = async () => {
    if (cachedPdf !== undefined) return cachedPdf;
    if (!options.html2pdf) {
      cachedPdf = null;
      return cachedPdf;
    }
    const template = await ensureTemplate();
    if (!template) {
      cachedPdf = null;
      return cachedPdf;
    }
    cachedPdf = await generateDossierPdfBlob(context, {
      presetLabel: options.presetLabel,
      roleLabels: options.roleLabels,
      titleCase: options.titleCase,
      findBiomeLabelById: options.findBiomeLabelById,
      template,
      templateLoader: async () => template,
      slug: options.slug,
      html2pdf: options.html2pdf,
    });
    return cachedPdf;
  };

  for (const file of preset.files) {
    const filename =
      typeof file.filename === 'function' ? file.filename(context.slug) : file.filename;
    try {
      switch (file.builder) {
        case 'ecosystem-json':
          files.push({
            id: file.id,
            name: filename,
            mime: 'application/json',
            data: JSON.stringify(context.payload, null, 2),
          });
          break;
        case 'ecosystem-yaml':
          files.push({
            id: file.id,
            name: filename,
            mime: 'text/yaml',
            data: options.toYAML(context.payload),
          });
          break;
        case 'activity-json':
          files.push({
            id: file.id,
            name: filename,
            mime: 'application/json',
            data: JSON.stringify(context.activityEntries, null, 2),
          });
          break;
        case 'activity-csv':
          files.push({
            id: file.id,
            name: filename,
            mime: 'text/csv',
            data: options.activityLogToCsv(context.activityEntries),
          });
          break;
        case 'dossier-html': {
          const html = await ensureHtml();
          if (html) {
            files.push({
              id: file.id,
              name: filename,
              mime: 'text/html',
              data: html,
            });
          }
          break;
        }
        case 'dossier-pdf': {
          const blob = await ensurePdf();
          if (blob) {
            files.push({
              id: file.id,
              name: filename,
              mime: 'application/pdf',
              data: blob,
              binary: true,
            });
          }
          break;
        }
        case 'press-kit-md': {
          const markdown = buildPressKitMarkdown(context, options);
          files.push({
            id: file.id,
            name: filename,
            mime: 'text/markdown',
            data: markdown,
          });
          break;
        }
        default:
          break;
      }
    } catch (error) {
      console.warn(`Impossibile generare il file ${filename}`, error);
    }
  }

  return { files, context };
}
