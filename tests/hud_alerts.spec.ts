import assert from 'assert';
import {
  EmaUpdatePayload,
  HudAlert,
  registerRiskHudAlertSystem,
  RiskHudAlertFilter,
  RiskHudAlertLog,
} from '../tools/ts/hud_alerts';

interface StubTelemetryBus {
  listener?: (payload: EmaUpdatePayload) => void;
  emitted: Array<{ event: string; payload: unknown }>;
  on(event: string, listener: (payload: EmaUpdatePayload) => void): void;
  emit(event: string, payload: unknown): void;
}

const createTelemetryBus = (): StubTelemetryBus => ({
  emitted: [],
  on(event, listener) {
    if (event !== 'ema.update') {
      throw new Error(`Unexpected event ${event}`);
    }
    this.listener = listener;
  },
  emit(event, payload) {
    this.emitted.push({ event, payload });
  },
});

const basePayload: EmaUpdatePayload = {
  missionId: 'alpha-01',
  roster: ['echo', 'delta'],
  turn: 7,
  indices: {
    risk: {
      weighted_index: 0.63,
      time_low_hp_turns: 3,
    },
  },
};

const passingFilter: RiskHudAlertFilter = () => true;
const failingFilter: RiskHudAlertFilter = () => false;

describe('registerRiskHudAlertSystem — filters e mission tag', () => {
  it('ignora gli aggiornamenti quando un filtro restituisce false', () => {
    const telemetryBus = createTelemetryBus();
    const trends: Array<{ metric: string; payload: unknown }> = [];

    registerRiskHudAlertSystem({
      telemetryBus,
      hudLayer: {
        updateTrend(metric, payload) {
          trends.push({ metric, payload });
        },
      },
      commandBus: {},
      options: {
        filters: [passingFilter, failingFilter],
      },
    });

    assert.ok(telemetryBus.listener, 'il listener deve essere registrato');
    telemetryBus.listener?.({ ...basePayload, indices: undefined });

    assert.strictEqual(trends.length, 0, 'il trend non deve essere aggiornato');
    assert.strictEqual(telemetryBus.emitted.length, 0, 'non devono essere emessi eventi telemetrici');
  });

  it('propaga il missionTag e registra i log quando i filtri passano', () => {
    const telemetryBus = createTelemetryBus();
    const raisedAlerts: HudAlert[] = [];
    const clearedAlerts: string[] = [];
    const recorded: RiskHudAlertLog[] = [];
    const commandPayloads: unknown[] = [];

    registerRiskHudAlertSystem({
      telemetryBus,
      hudLayer: {
        updateTrend() {
          /* noop */
        },
        raiseAlert(alert) {
          raisedAlerts.push(alert);
        },
        clearAlert(id) {
          clearedAlerts.push(id);
        },
      },
      commandBus: {
        emit(_event, payload) {
          commandPayloads.push(payload);
        },
      },
      telemetryRecorder: {
        record(entry) {
          recorded.push(entry);
        },
      },
      options: {
        filters: [passingFilter],
        missionTags: { 'alpha-01': 'deep-watch' },
      },
    });

    assert.ok(telemetryBus.listener, 'il listener deve essere registrato');

    // primo evento: raise
    telemetryBus.listener?.(basePayload);
    assert.strictEqual(raisedAlerts.length, 1, 'deve essere generato un alert');
    assert.strictEqual(raisedAlerts[0].metadata?.missionTag, 'deep-watch');
    assert.strictEqual(recorded[0].missionTag, 'deep-watch');
    assert.strictEqual((commandPayloads[0] as { missionTag?: string }).missionTag, 'deep-watch');
    assert.strictEqual(
      (telemetryBus.emitted[0].payload as { missionTag?: string }).missionTag,
      'deep-watch',
    );

    // evento successivo: riduce l'indice e forza la chiusura
    telemetryBus.listener?.({
      ...basePayload,
      indices: {
        risk: {
          weighted_index: 0.55,
          time_low_hp_turns: 1,
        },
      },
    });

    telemetryBus.listener?.({
      ...basePayload,
      indices: {
        risk: {
          weighted_index: 0.54,
          time_low_hp_turns: 0,
        },
      },
    });

    assert.ok(clearedAlerts.includes(raisedAlerts[0].id), 'l\'alert deve essere cancellato');
    assert.strictEqual(recorded.some((log) => log.status === 'cleared' && log.missionTag === 'deep-watch'), true);
  });
});
