import personalityModule from './personality_module.v1.json';
import compat from './compat_map.json';

type ThemeEntry = (typeof personalityModule)['dataset']['themes'][number];
type HookEntry = (typeof personalityModule)['mechanics_registry']['hooks'][number];
type TriggeredEffectEntry = NonNullable<HookEntry['triggered_effects']>[number];
type StatOp = (typeof personalityModule)['mechanics_registry']['conventions']['stat_ops'][number];

type CompatStats = keyof typeof compat.stats;
type CompatEvents = keyof typeof compat.events;

export interface TelemetryRequirement {
  metric: string;
  threshold?: number | null;
  window?: string | null;
}

export interface PreferenceBlock {
  include: string[];
  exclude: string[];
}

export interface HookTrigger {
  events: string[];
  raw?: any;
}

export interface HookEffect {
  stat: string;
  op: StatOp;
  value: number;
  duration?: string;
}

export interface HookEffectBinding {
  hookId: string;
  effectId: string;
  trigger: HookTrigger;
  effects: HookEffect[];
  limitPerEncounter?: number;
  limitPerTurn?: number;
  status?: string;
  description?: string;
}

export interface EnneaThemeBinding {
  themeId: string;
  hookIds: string[];
  enneatype: number;
  datasetKey: string;
  name: string;
  summary: string;
  notes: string[];
  telemetry: TelemetryRequirement[];
  matingPreferences: PreferenceBlock;
  biomeTags: PreferenceBlock;
  stats: string[];
  events: string[];
  synergies: {
    triads?: string[];
    hornevian?: string[];
    harmonic?: string[];
  };
  effects: HookEffectBinding[];
}

const datasetThemes = personalityModule.dataset.themes as ThemeEntry[];
const hooks = personalityModule.mechanics_registry.hooks as HookEntry[];

const hooksByTheme = new Map<string, HookEntry[]>();
for (const hook of hooks) {
  const themeId = (hook as any).theme_id as string | undefined;
  if (!themeId) continue;
  if (!hooksByTheme.has(themeId)) {
    hooksByTheme.set(themeId, []);
  }
  hooksByTheme.get(themeId)!.push(hook);
}

function arrayify<T = string>(value: any): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as T[];
  return [value as T];
}

function resolveCompatStat(stat: string): string {
  const stats = compat.stats as Record<string, { aliases?: string[] }>;
  if (stats[stat as CompatStats]) return stat;
  for (const [canon, data] of Object.entries(stats)) {
    if (data.aliases?.includes(stat)) return canon;
  }
  return stat;
}

function resolveCompatEvent(eventId: string): string {
  const events = compat.events as Record<string, { aliases?: string[] }>;
  if (events[eventId as CompatEvents]) return eventId;
  for (const [canon, data] of Object.entries(events)) {
    if (data.aliases?.includes(eventId)) return canon;
  }
  return eventId;
}

function collectTelemetry(theme: ThemeEntry): TelemetryRequirement[] {
  return arrayify(theme.requirements?.telemetry).map((item: any) => ({
    metric: item.metric,
    threshold: Object.prototype.hasOwnProperty.call(item, 'threshold') ? Number(item.threshold) : null,
    window: item.window ?? null,
  }));
}

function collectPreference(block: any): PreferenceBlock {
  return {
    include: arrayify(block?.include),
    exclude: arrayify(block?.exclude),
  };
}

function extractEvents(trigger: any): string[] {
  const values: string[] = [];
  if (!trigger) return values;
  if (typeof trigger.event === 'string') {
    values.push(resolveCompatEvent(trigger.event));
  }
  if (Array.isArray(trigger.events)) {
    trigger.events.forEach((evt: string) => values.push(resolveCompatEvent(evt)));
  }
  return Array.from(new Set(values));
}

function normaliseEffects(effects: any[]): HookEffect[] {
  return (effects || []).map((eff) => ({
    stat: resolveCompatStat(eff.stat),
    op: eff.op as StatOp,
    value: Number(eff.value),
    duration: eff.duration,
  }));
}

function mergeCompatBlock(compatBlock: any, stats: Set<string>, events: Set<string>) {
  if (!compatBlock) return;

  const compatStats = compatBlock.stats;
  if (Array.isArray(compatStats)) {
    compatStats.map((stat: string) => resolveCompatStat(stat)).forEach((stat) => stats.add(stat));
  } else if (compatStats && typeof compatStats === 'object') {
    Object.keys(compatStats)
      .map((stat) => resolveCompatStat(stat))
      .forEach((stat) => stats.add(stat));
  }

  arrayify<string>(compatBlock.events)
    .map(resolveCompatEvent)
    .forEach((evt) => events.add(evt));
}

function mergeCompatMetadata(source: any, stats: Set<string>, events: Set<string>) {
  if (!source) return;

  const metaStats = arrayify<string>(source.stats).map(resolveCompatStat);
  metaStats.forEach((stat) => stats.add(stat));

  mergeCompatBlock(source.compatibility, stats, events);
}

function mergeTriggerMapMetadata(links: any, stats: Set<string>, events: Set<string>) {
  const triggerMap = links?.trigger_map;
  if (!triggerMap || typeof triggerMap !== 'object') return;

  for (const entry of Object.values(triggerMap)) {
    if (!entry || typeof entry !== 'object') continue;

    const entryStats = arrayify<string>((entry as any).stats).map(resolveCompatStat);
    entryStats.forEach((stat) => stats.add(stat));

    const entryEvents = arrayify<string>((entry as any).events).map(resolveCompatEvent);
    entryEvents.forEach((evt) => events.add(evt));

    mergeCompatBlock((entry as any).compatibility, stats, events);
  }
}

function buildHookEffects(themeHooks: HookEntry[]): { bindings: HookEffectBinding[]; stats: Set<string>; events: Set<string> } {
  const bindings: HookEffectBinding[] = [];
  const stats = new Set<string>();
  const events = new Set<string>();

  for (const hook of themeHooks) {
    const hookId = hook.id as string;
    const trigger = (hook as any).trigger;
    const triggerEvents = extractEvents(trigger);
    const baseEffects = normaliseEffects((hook as any).effects || []);
    baseEffects.forEach((eff) => stats.add(eff.stat));
    triggerEvents.forEach((evt) => events.add(evt));

    if (baseEffects.length) {
      bindings.push({
        hookId,
        effectId: 'primary',
        trigger: { events: triggerEvents, raw: trigger },
        effects: baseEffects,
        limitPerEncounter: (hook as any).limit_per_encounter,
        limitPerTurn: (hook as any).limit_per_turn,
        status: (hook as any).status,
      });
    }

    mergeCompatMetadata(hook, stats, events);

    const triggered = arrayify<TriggeredEffectEntry>((hook as any).triggered_effects);
    for (const entry of triggered) {
      const entryEvents = extractEvents(entry.trigger);
      const entryEffects = normaliseEffects(entry.effects || []);
      entryEffects.forEach((eff) => stats.add(eff.stat));
      entryEvents.forEach((evt) => events.add(evt));
      bindings.push({
        hookId,
        effectId: entry.effect_id as string,
        trigger: { events: entryEvents, raw: entry.trigger },
        effects: entryEffects,
        limitPerEncounter: (entry as any).limit_per_encounter,
        limitPerTurn: (entry as any).limit_per_turn,
        status: (entry as any).status,
        description: (entry as any).description,
      });

      mergeCompatMetadata(entry, stats, events);
    }

    const linkStats = arrayify<string>((hook as any).links?.compat_stats).map(resolveCompatStat);
    linkStats.forEach((stat) => stats.add(stat));

    const linkEvents = arrayify<string>((hook as any).links?.compat_events).map(resolveCompatEvent);
    linkEvents.forEach((evt) => events.add(evt));

    mergeTriggerMapMetadata((hook as any).links, stats, events);
  }

  return { bindings, stats, events };
}

function buildThemeBinding(theme: ThemeEntry): EnneaThemeBinding {
  const themeHooks = hooksByTheme.get(theme.id) ?? [];
  const { bindings, stats, events } = buildHookEffects(themeHooks);

  return {
    themeId: theme.id,
    hookIds: themeHooks.map((hook) => hook.id as string),
    enneatype: theme.type_id ?? 0,
    datasetKey: `themes.${theme.id}`,
    name: theme.name ?? '',
    summary: theme.summary ?? '',
    notes: arrayify(theme.notes),
    telemetry: collectTelemetry(theme),
    matingPreferences: collectPreference(theme.requirements?.mating_preferences),
    biomeTags: collectPreference(theme.requirements?.biome_tags),
    stats: Array.from(stats).sort(),
    events: Array.from(events).sort(),
    synergies: {
      triads: arrayify(theme.hooks?.triads),
      hornevian: arrayify(theme.hooks?.hornevian),
      harmonic: arrayify(theme.hooks?.harmonics),
    },
    effects: bindings,
  };
}

export const ENNEA_THEME_BINDINGS: EnneaThemeBinding[] = datasetThemes.map(buildThemeBinding);

export function findHookByTheme(themeId: string): EnneaThemeBinding | undefined {
  return ENNEA_THEME_BINDINGS.find((binding) => binding.themeId === themeId);
}

export function findHookByDatasetKey(datasetKey: string): EnneaThemeBinding | undefined {
  return ENNEA_THEME_BINDINGS.find((binding) => binding.datasetKey === datasetKey);
}

export function listTelemetryMetrics(): string[] {
  const metrics = new Set<string>();
  ENNEA_THEME_BINDINGS.forEach((binding) => {
    binding.telemetry.forEach((item) => metrics.add(item.metric));
  });
  return Array.from(metrics).sort();
}

export function listCompatStats(): string[] {
  const stats = new Set<string>();
  ENNEA_THEME_BINDINGS.forEach((binding) => binding.stats.forEach((stat) => stats.add(stat)));
  return Array.from(stats).sort();
}

export function listCompatEvents(): string[] {
  const events = new Set<string>();
  ENNEA_THEME_BINDINGS.forEach((binding) => binding.events.forEach((evt) => events.add(evt)));
  return Array.from(events).sort();
}
