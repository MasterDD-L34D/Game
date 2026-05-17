import { describe, it } from 'node:test';
import assert from 'assert';
import type { Request, Response } from 'express';
import createLoadoutRecommendationRouter, {
  assignVariant,
  rankLoadouts,
  type LoadoutRecommendationRequest,
} from '../../src/services/loadoutRecommendation';

const makeContext = (
  overrides: Partial<LoadoutRecommendationRequest> = {},
): LoadoutRecommendationRequest => ({
  playerId: overrides.playerId,
  map: overrides.map ?? 'Fungal Labyrinth',
  skillRating: overrides.skillRating ?? 1700,
  sessionsPlayed: overrides.sessionsPlayed ?? 45,
  avgTimeAlive: overrides.avgTimeAlive ?? 205,
  objectiveRate: overrides.objectiveRate ?? 0.58,
  preferredPlaystyle: overrides.preferredPlaystyle ?? 'balanced',
  preferredWeapon: overrides.preferredWeapon ?? 'burst_rifle',
  preferredCompanion: overrides.preferredCompanion ?? 'medic_drone',
});

describe('Loadout recommendation experiment', () => {
  it("mantiene deterministico il bucket dell'esperimento per playerId", () => {
    const playerAFirst = assignVariant('player-123', 1800);
    const playerASecond = assignVariant('player-123', 1900);
    const playerB = assignVariant('player-456', 1800);

    assert.strictEqual(
      playerAFirst,
      playerASecond,
      'lo stesso player deve rimanere nello stesso bucket',
    );
    assert.ok(
      playerAFirst !== playerB,
      'due player differenti dovrebbero distribuirsi nei bucket (hash differente)',
    );
  });

  it('misura un lift medio per il variant personalizzato rispetto al baseline', () => {
    const samples = Array.from({ length: 120 }, (_, index) =>
      makeContext({
        playerId: `player-${index}`,
        map:
          index % 3 === 0 ? 'Fungal Labyrinth' : index % 3 === 1 ? 'Crimson Dunes' : 'Azure Ruins',
        skillRating: 1350 + (index % 10) * 70,
        sessionsPlayed: 18 + (index % 6) * 16,
        objectiveRate: 0.32 + (index % 7) * 0.08,
        avgTimeAlive: 140 + (index % 8) * 22,
        preferredPlaystyle:
          index % 4 === 0
            ? 'support'
            : index % 4 === 1
              ? 'aggressive'
              : index % 4 === 2
                ? 'balanced'
                : 'skirmisher',
        preferredWeapon:
          index % 3 === 0 ? 'burst_rifle' : index % 3 === 1 ? 'ion_blade' : 'plasma_bow',
        preferredCompanion:
          index % 3 === 0 ? 'medic_drone' : index % 3 === 1 ? 'scout_beetle' : 'shield_mender',
      }),
    );

    const aggregate = samples.reduce(
      (accumulator, context) => {
        const baselineTop = rankLoadouts(context, 'baseline', 1)[0];
        const personalizedTop = rankLoadouts(context, 'personalized', 1)[0];
        accumulator.baseline += baselineTop.expectedWinRate;
        accumulator.personalized += personalizedTop.expectedWinRate;
        return accumulator;
      },
      { baseline: 0, personalized: 0 },
    );

    const averageBaseline = aggregate.baseline / samples.length;
    const averagePersonalized = aggregate.personalized / samples.length;
    const absoluteLift = averagePersonalized - averageBaseline;

    assert.ok(
      absoluteLift > 0.015,
      `il lift medio atteso deve essere positivo (ottenuto ${absoluteLift.toFixed(4)})`,
    );
  });

  it('espone contributi esplicativi coerenti con le metriche inviate', () => {
    const context = makeContext({
      objectiveRate: 0.78,
      avgTimeAlive: 240,
      preferredPlaystyle: 'support',
      preferredWeapon: 'burst_rifle',
      preferredCompanion: 'medic_drone',
    });

    const personalized = rankLoadouts(context, 'personalized', 1)[0];
    const baseline = rankLoadouts(context, 'baseline', 1)[0];

    const objectiveContribution = personalized.contributions.find(
      (item) => item.feature === 'objectiveRate',
    );
    assert.ok(
      objectiveContribution,
      'la variante personalizzata deve descrivere la metrica obiettivi',
    );
    assert.strictEqual(objectiveContribution.direction, 'positive');

    const baselineObjective = baseline.contributions.find(
      (item) => item.feature === 'objectiveRate',
    );
    assert.ok(
      !baselineObjective,
      'la baseline non dovrebbe personalizzare sulla metrica obiettivi',
    );
  });

  describe('validazione input', () => {
    const expectedError =
      'Payload non valido per le raccomandazioni loadout: i campi numerici devono essere finiti e non negativi (objectiveRate compreso tra 0 e 1).';
    const playstyleError =
      'Stile di gioco non supportato: deve essere uno tra aggressive, balanced, support, skirmisher.';
    const mapError =
      'Mappa non supportata per le raccomandazioni: valori ammessi Fungal Labyrinth, Nebula Outpost, Azure Ruins, Crimson Dunes.';

    const executeRoute = (body: unknown) => {
      const router = createLoadoutRecommendationRouter();
      const response: { statusCode?: number; body?: unknown } & Partial<Response> = {
        status(code: number) {
          this.statusCode = code;
          return this as unknown as Response;
        },
        json(payload: unknown) {
          this.body = payload;
          return this as unknown as Response;
        },
      };

      const [postRoute] = (router as unknown as { stack: unknown[] }).stack.filter((layer) =>
        Boolean(
          (layer as { route?: { path?: string } }).route?.path === '/loadout/recommendations',
        ),
      );

      const postHandler = (
        postRoute as { route?: { stack?: { method?: string; handle?: unknown }[] } }
      ).route?.stack?.find((entry) => entry.method === 'post')?.handle as
        | ((request: Request, response: Response) => void)
        | undefined;

      assert.ok(postHandler, 'il router deve esporre il POST /loadout/recommendations');

      postHandler({ body } as unknown as Request, response as unknown as Response);

      return response;
    };

    it('rifiuta NaN e Infinity nei campi numerici', async () => {
      const basePayload = makeContext();

      const nanResponse = executeRoute({ ...basePayload, skillRating: Number.NaN });
      assert.strictEqual(nanResponse.statusCode, 400);
      assert.deepStrictEqual(nanResponse.body, { error: expectedError });

      const infinityResponse = executeRoute({
        ...basePayload,
        sessionsPlayed: Number.POSITIVE_INFINITY,
      });
      assert.strictEqual(infinityResponse.statusCode, 400);
      assert.deepStrictEqual(infinityResponse.body, { error: expectedError });
    });

    it('rifiuta valori negativi per le metriche numeriche', async () => {
      const basePayload = makeContext();
      const invalidPayload = { ...basePayload, avgTimeAlive: -10, objectiveRate: -0.2 };
      const response = executeRoute(invalidPayload);
      assert.strictEqual(response.statusCode, 400);
      assert.deepStrictEqual(response.body, { error: expectedError });
    });

    it('rifiuta playstyle non previsti', async () => {
      const basePayload = makeContext();
      const response = executeRoute({ ...basePayload, preferredPlaystyle: 'sniper' as never });

      assert.strictEqual(response.statusCode, 400);
      assert.deepStrictEqual(response.body, { error: playstyleError });
    });

    it('rifiuta mappe non supportate dai blueprint', async () => {
      const basePayload = makeContext();
      const response = executeRoute({ ...basePayload, map: 'Unknown Citadel' });

      assert.strictEqual(response.statusCode, 400);
      assert.deepStrictEqual(response.body, { error: mapError });
    });
  });
});
