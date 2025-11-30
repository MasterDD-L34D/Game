import type { Request, Response } from 'express';
import { Router } from 'express';

type LoadoutPlaystyle = 'aggressive' | 'balanced' | 'support' | 'skirmisher';
const SUPPORTED_PLAYSTYLES: readonly LoadoutPlaystyle[] = [
  'aggressive',
  'balanced',
  'support',
  'skirmisher',
];

type ImpactDirection = 'positive' | 'negative' | 'neutral';

export type ExperimentVariant = 'baseline' | 'personalized';

export interface LoadoutRecommendationRequest {
  readonly playerId?: string;
  readonly map: string;
  readonly skillRating: number;
  readonly sessionsPlayed: number;
  readonly avgTimeAlive: number;
  readonly objectiveRate: number;
  readonly preferredPlaystyle: LoadoutPlaystyle;
  readonly preferredWeapon?: string;
  readonly preferredCompanion?: string;
}

export interface FeatureContribution {
  readonly feature: string;
  readonly value: string | number;
  readonly weight: number;
  readonly contribution: number;
  readonly direction: ImpactDirection;
  readonly rationale: string;
}

export interface LoadoutRecommendationResult {
  readonly loadoutId: string;
  readonly label: string;
  readonly description: string;
  readonly expectedWinRate: number;
  readonly recommendedWeapon: string;
  readonly recommendedCompanion: string;
  readonly variant: ExperimentVariant;
  readonly contributions: FeatureContribution[];
}

interface LoadoutBlueprint {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly baseWinRate: number;
  readonly recommendedWeapon: string;
  readonly recommendedCompanion: string;
  readonly mapSynergy?: Record<string, number>;
  readonly playstyleSynergy?: Partial<Record<LoadoutPlaystyle, number>>;
  readonly weaponAffinity?: Record<string, number>;
  readonly companionAffinity?: Record<string, number>;
  readonly weights: {
    readonly skill: number;
    readonly sessions: number;
    readonly objective: number;
    readonly avgTimeAlive: number;
  };
  readonly targetObjectiveRate: number;
  readonly targetAvgTimeAlive: number;
}

const LOADOUT_BLUEPRINTS: LoadoutBlueprint[] = [
  {
    id: 'burst-medic-support',
    label: 'Burst Rifle + Medic Drone',
    description:
      'Loadout focalizzato sul controllo degli spazi stretti con supporto di cura costante. Ideale per squadre coordinate.',
    baseWinRate: 0.58,
    recommendedWeapon: 'burst_rifle',
    recommendedCompanion: 'medic_drone',
    mapSynergy: {
      'Fungal Labyrinth': 0.08,
      'Nebula Outpost': 0.05,
      'Azure Ruins': -0.02,
    },
    playstyleSynergy: {
      support: 0.07,
      balanced: 0.03,
    },
    weaponAffinity: {
      burst_rifle: 0.05,
      plasma_bow: -0.01,
    },
    companionAffinity: {
      medic_drone: 0.06,
      shield_mender: 0.02,
    },
    weights: {
      skill: 0.12,
      sessions: 0.06,
      objective: 0.22,
      avgTimeAlive: 0.18,
    },
    targetObjectiveRate: 0.62,
    targetAvgTimeAlive: 210,
  },
  {
    id: 'ion-blade-aggressor',
    label: 'Ion Blade + Shock Gauntlet',
    description:
      'Configurazione da assalto rapido: mobilità elevata e burst damage per forzare rotazioni veloci nelle mappe aperte.',
    baseWinRate: 0.54,
    recommendedWeapon: 'ion_blade',
    recommendedCompanion: 'scout_beetle',
    mapSynergy: {
      'Crimson Dunes': 0.07,
      'Azure Ruins': 0.04,
      'Fungal Labyrinth': -0.05,
    },
    playstyleSynergy: {
      aggressive: 0.08,
      skirmisher: 0.05,
    },
    weaponAffinity: {
      ion_blade: 0.06,
      scatter_shot: 0.02,
    },
    companionAffinity: {
      scout_beetle: 0.05,
      none: 0.02,
    },
    weights: {
      skill: 0.09,
      sessions: 0.04,
      objective: 0.12,
      avgTimeAlive: -0.15,
    },
    targetObjectiveRate: 0.48,
    targetAvgTimeAlive: 150,
  },
  {
    id: 'plasma-bow-recon',
    label: 'Plasma Bow + Shield Mender',
    description:
      'Approccio tattico: pressione a distanza con autosustain leggero per consolidare il vantaggio negli ingaggi prolungati.',
    baseWinRate: 0.56,
    recommendedWeapon: 'plasma_bow',
    recommendedCompanion: 'shield_mender',
    mapSynergy: {
      'Azure Ruins': 0.06,
      'Nebula Outpost': 0.03,
      'Crimson Dunes': -0.03,
    },
    playstyleSynergy: {
      balanced: 0.05,
      skirmisher: 0.04,
      support: 0.02,
    },
    weaponAffinity: {
      plasma_bow: 0.07,
      burst_rifle: 0.03,
    },
    companionAffinity: {
      shield_mender: 0.05,
      medic_drone: 0.01,
    },
    weights: {
      skill: 0.11,
      sessions: 0.05,
      objective: 0.18,
      avgTimeAlive: 0.09,
    },
    targetObjectiveRate: 0.55,
    targetAvgTimeAlive: 195,
  },
];

const SUPPORTED_MAPS = LOADOUT_BLUEPRINTS.reduce<Set<string>>((accumulator, blueprint) => {
  Object.keys(blueprint.mapSynergy ?? {}).forEach((map) => accumulator.add(map));
  return accumulator;
}, new Set<string>());

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const directionFor = (value: number): ImpactDirection => {
  if (value > 0.0001) return 'positive';
  if (value < -0.0001) return 'negative';
  return 'neutral';
};

const hashString = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0; // forza 32 bit
  }
  return Math.abs(hash);
};

export function assignVariant(playerId?: string, skillRating?: number): ExperimentVariant {
  if (playerId) {
    const hash = hashString(playerId);
    return hash % 100 < 50 ? 'baseline' : 'personalized';
  }
  if (typeof skillRating === 'number' && !Number.isNaN(skillRating)) {
    return skillRating >= 1800 ? 'personalized' : 'baseline';
  }
  return 'baseline';
}

const toNormalizedDelta = (value: number, target: number, scale: number): number => {
  return (value - target) / scale;
};

const BASE_CONTRIBUTION: FeatureContribution = {
  feature: 'base_win_rate',
  value: 'aggregate',
  weight: 0,
  contribution: 0,
  direction: 'neutral',
  rationale: 'Punto di partenza ottenuto dalla media storica delle prestazioni del loadout.',
};

const createContribution = (
  feature: string,
  value: string | number,
  contribution: number,
  rationale: string,
): FeatureContribution => ({
  feature,
  value,
  weight: Math.abs(contribution),
  contribution,
  direction: directionFor(contribution),
  rationale,
});

const evaluateBlueprint = (
  blueprint: LoadoutBlueprint,
  context: LoadoutRecommendationRequest,
  variant: ExperimentVariant,
): { expectedWinRate: number; contributions: FeatureContribution[] } => {
  const personalizationFactor = variant === 'personalized' ? 1 : 0.45;
  const baseContribution = {
    ...BASE_CONTRIBUTION,
    weight: blueprint.baseWinRate,
    contribution: blueprint.baseWinRate - 0.5,
    direction: directionFor(blueprint.baseWinRate - 0.5),
  } satisfies FeatureContribution;

  const contributions: FeatureContribution[] = [baseContribution];

  let score = blueprint.baseWinRate;

  const mapImpact = blueprint.mapSynergy?.[context.map];
  if (typeof mapImpact === 'number') {
    score += mapImpact;
    contributions.push(
      createContribution(
        'map',
        context.map,
        mapImpact,
        `Sinergia storica tra ${context.map} e il loadout ${blueprint.label}.`,
      ),
    );
  }

  const playstyleImpact = blueprint.playstyleSynergy?.[context.preferredPlaystyle] ?? 0;
  if (playstyleImpact !== 0) {
    const scaled = playstyleImpact * personalizationFactor;
    score += scaled;
    contributions.push(
      createContribution(
        'playstyle',
        context.preferredPlaystyle,
        scaled,
        `Allineamento con lo stile di gioco ${context.preferredPlaystyle}.`,
      ),
    );
  }

  const weaponImpact = context.preferredWeapon
    ? (blueprint.weaponAffinity?.[context.preferredWeapon] ?? 0) * personalizationFactor
    : 0;
  if (weaponImpact !== 0) {
    score += weaponImpact;
    contributions.push(
      createContribution(
        'preferredWeapon',
        context.preferredWeapon as string,
        weaponImpact,
        'Affinità positiva/negativa tra arma preferita e loadout suggerito.',
      ),
    );
  }

  const companionImpact = context.preferredCompanion
    ? (blueprint.companionAffinity?.[context.preferredCompanion] ?? 0) * personalizationFactor
    : 0;
  if (companionImpact !== 0) {
    score += companionImpact;
    contributions.push(
      createContribution(
        'preferredCompanion',
        context.preferredCompanion as string,
        companionImpact,
        'Compatibilità con il companion selezionato più frequentemente dal giocatore.',
      ),
    );
  }

  const skillNormalized = toNormalizedDelta(context.skillRating, 1500, 600);
  const skillContribution =
    skillNormalized * blueprint.weights.skill * (variant === 'personalized' ? 1 : 0.5);
  if (skillContribution !== 0) {
    score += skillContribution;
    contributions.push(
      createContribution(
        'skillRating',
        context.skillRating,
        skillContribution,
        'Adattamento alla curva di difficoltà rispetto al rating attuale.',
      ),
    );
  }

  const sessionNormalized = toNormalizedDelta(context.sessionsPlayed, 40, 60);
  const sessionContribution =
    sessionNormalized * blueprint.weights.sessions * personalizationFactor;
  if (sessionContribution !== 0) {
    score += sessionContribution;
    contributions.push(
      createContribution(
        'sessionsPlayed',
        context.sessionsPlayed,
        sessionContribution,
        'Esperienza accumulata con il loadout e archetipi simili.',
      ),
    );
  }

  const objectiveNormalized = toNormalizedDelta(
    context.objectiveRate,
    blueprint.targetObjectiveRate,
    0.25,
  );
  const objectiveContribution =
    objectiveNormalized * blueprint.weights.objective * (variant === 'personalized' ? 1 : 0);
  if (objectiveContribution !== 0) {
    score += objectiveContribution;
    contributions.push(
      createContribution(
        'objectiveRate',
        Number(context.objectiveRate.toFixed(2)),
        objectiveContribution,
        'Performance su obiettivi dinamici confrontata con la media ideale del loadout.',
      ),
    );
  }

  const survivalNormalized = toNormalizedDelta(
    context.avgTimeAlive,
    blueprint.targetAvgTimeAlive,
    180,
  );
  const survivalContribution =
    survivalNormalized * blueprint.weights.avgTimeAlive * (variant === 'personalized' ? 1 : 0.25);
  if (survivalContribution !== 0) {
    score += survivalContribution;
    contributions.push(
      createContribution(
        'avgTimeAlive',
        Number(context.avgTimeAlive.toFixed(1)),
        survivalContribution,
        'Resilienza media confrontata con il profilo ideale del loadout.',
      ),
    );
  }

  const expectedWinRate = clamp(score, 0.35, 0.86);

  return {
    expectedWinRate,
    contributions,
  };
};

export function rankLoadouts(
  context: LoadoutRecommendationRequest,
  variant: ExperimentVariant,
  limit = 3,
): LoadoutRecommendationResult[] {
  const scored = LOADOUT_BLUEPRINTS.map((blueprint) => {
    const evaluation = evaluateBlueprint(blueprint, context, variant);
    return {
      loadoutId: blueprint.id,
      label: blueprint.label,
      description: blueprint.description,
      expectedWinRate: Number(evaluation.expectedWinRate.toFixed(3)),
      recommendedWeapon: blueprint.recommendedWeapon,
      recommendedCompanion: blueprint.recommendedCompanion,
      variant,
      contributions: evaluation.contributions,
    } satisfies LoadoutRecommendationResult;
  });

  return scored
    .sort((left, right) => right.expectedWinRate - left.expectedWinRate)
    .slice(0, limit)
    .map((entry) => ({
      ...entry,
      contributions: entry.contributions
        .slice()
        .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
        .slice(0, 6),
    }));
}

export interface LoadoutRecommendationResponse {
  readonly variant: ExperimentVariant;
  readonly recommendations: LoadoutRecommendationResult[];
}

const validateRequest = (
  payload: Partial<LoadoutRecommendationRequest>,
): { value: LoadoutRecommendationRequest } | { error: string } => {
  const isFiniteNumber = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value);

  if (
    !(
      typeof payload === 'object' &&
      payload !== null &&
      typeof payload.map === 'string' &&
      isFiniteNumber(payload.skillRating) &&
      payload.skillRating >= 0 &&
      isFiniteNumber(payload.sessionsPlayed) &&
      payload.sessionsPlayed >= 0 &&
      isFiniteNumber(payload.avgTimeAlive) &&
      payload.avgTimeAlive >= 0 &&
      isFiniteNumber(payload.objectiveRate) &&
      payload.objectiveRate >= 0 &&
      payload.objectiveRate <= 1 &&
      typeof payload.preferredPlaystyle === 'string'
    )
  ) {
    return {
      error:
        'Payload non valido per le raccomandazioni loadout: i campi numerici devono essere finiti e non negativi (objectiveRate compreso tra 0 e 1).',
    };
  }

  if (!SUPPORTED_PLAYSTYLES.includes(payload.preferredPlaystyle)) {
    return {
      error: `Stile di gioco non supportato: deve essere uno tra ${SUPPORTED_PLAYSTYLES.join(', ')}.`,
    };
  }

  if (!SUPPORTED_MAPS.has(payload.map)) {
    return {
      error: `Mappa non supportata per le raccomandazioni: valori ammessi ${Array.from(SUPPORTED_MAPS).join(', ')}.`,
    };
  }

  return { value: payload };
};

export function createLoadoutRecommendationRouter(): Router {
  const router = Router();

  router.post('/loadout/recommendations', (request: Request, response: Response) => {
    const validation = validateRequest(request.body);
    if (validation.error) {
      response.status(400).json({ error: validation.error });
      return;
    }

    const context = validation.value;
    const variant = assignVariant(context.playerId, context.skillRating);
    const recommendations = rankLoadouts(context, variant, 3);

    const payload: LoadoutRecommendationResponse = {
      variant,
      recommendations,
    };

    response.json(payload);
  });

  return router;
}

export default createLoadoutRecommendationRouter;
