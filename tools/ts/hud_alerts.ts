export interface RiskIndices {
  weighted_index?: number | null;
  time_low_hp_turns?: number | null;
}

export interface RiskPayload {
  risk?: RiskIndices | null;
  [key: string]: unknown;
}

export interface EmaUpdatePayload {
  missionId?: string;
  roster?: string[];
  turn?: number;
  indices?: RiskPayload & { [key: string]: unknown };
  ema?: unknown;
  [key: string]: unknown;
}

export interface HudAlert {
  id: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  metadata?: Record<string, unknown>;
}

export interface HudLayerLike {
  updateTrend?(metric: string, payload: unknown): void;
  raiseAlert?(alert: HudAlert): void;
  clearAlert?(id: string): void;
}

export interface CommandBusLike {
  emit?(event: string, payload: unknown): void;
}

export interface TelemetryBusLike {
  on(event: string, listener: (payload: EmaUpdatePayload) => void): void;
  off?(event: string, listener: (payload: EmaUpdatePayload) => void): void;
  removeListener?(event: string, listener: (payload: EmaUpdatePayload) => void): void;
  emit?(event: string, payload: unknown): unknown;
}

export interface TelemetryRecorder {
  record(event: RiskHudAlertLog): void;
}

export type RiskHudAlertStatus = 'raised' | 'cleared';

export interface RiskHudAlertLog {
  alertId: string;
  status: RiskHudAlertStatus;
  missionId?: string;
  turn?: number;
  weightedIndex?: number;
  timeLowHpTurns?: number | null;
  roster?: string[];
  timestamp?: string;
}

export interface RiskHudAlertOptions {
  threshold?: number;
  clearThreshold?: number;
  consecutiveBelowThreshold?: number;
  telemetryEventName?: string;
}

interface RiskHudAlertState {
  active: boolean;
  belowCount: number;
}

function resolveStreamKey(payload: EmaUpdatePayload): string {
  if (payload?.missionId) {
    return `mission:${payload.missionId}`;
  }

  if (Array.isArray(payload?.roster) && payload.roster.length > 0) {
    return `roster:${payload.roster.join('|')}`;
  }

  return 'global';
}

function resolveAlertId(payload: EmaUpdatePayload, streamKey: string): string {
  if (payload?.missionId) {
    return `risk-high:${payload.missionId}`;
  }

  if (streamKey !== 'global') {
    return `risk-high:${streamKey.replace(/^(mission|roster):/, '')}`;
  }

  return 'risk-high';
}

function getWeightedIndex(payload: EmaUpdatePayload): number | null {
  const weighted = payload?.indices && typeof payload.indices === 'object'
    ? (payload.indices as RiskPayload)?.risk?.weighted_index
    : undefined;
  if (typeof weighted !== 'number') {
    return null;
  }
  return weighted;
}

function getTimeLowHpTurns(payload: EmaUpdatePayload): number | null {
  const value = payload?.indices && typeof payload.indices === 'object'
    ? (payload.indices as RiskPayload)?.risk?.time_low_hp_turns
    : undefined;
  if (typeof value !== 'number') {
    return null;
  }
  return value;
}

function toIsoTimestamp(): string {
  return new Date().toISOString();
}

function detachListener(bus: TelemetryBusLike, listener: (payload: EmaUpdatePayload) => void) {
  if (typeof bus.off === 'function') {
    bus.off('ema.update', listener);
    return;
  }
  if (typeof bus.removeListener === 'function') {
    bus.removeListener('ema.update', listener);
  }
}

export interface RegisterRiskHudAlertDeps {
  telemetryBus: TelemetryBusLike;
  hudLayer: HudLayerLike;
  commandBus: CommandBusLike;
  telemetryRecorder?: TelemetryRecorder;
  options?: RiskHudAlertOptions;
}

export function registerRiskHudAlertSystem({
  telemetryBus,
  hudLayer,
  commandBus,
  telemetryRecorder,
  options,
}: RegisterRiskHudAlertDeps): () => void {
  const threshold = options?.threshold ?? 0.6;
  const clearThreshold = options?.clearThreshold ?? 0.58;
  const consecutiveBelow = Math.max(1, Math.floor(options?.consecutiveBelowThreshold ?? 2));
  const telemetryEventName = options?.telemetryEventName ?? 'hud.alert.risk-high';

  const states = new Map<string, RiskHudAlertState>();

  const listener = (payload: EmaUpdatePayload) => {
    hudLayer.updateTrend?.('risk', payload.indices?.risk ?? null);

    const streamKey = resolveStreamKey(payload);
    let state = states.get(streamKey);
    if (!state) {
      state = { active: false, belowCount: 0 };
      states.set(streamKey, state);
    }

    const alertId = resolveAlertId(payload, streamKey);

    const weightedIndex = getWeightedIndex(payload);
    if (weightedIndex === null) {
      state.belowCount = 0;
      return;
    }

    if (!state.active && weightedIndex >= threshold) {
      state.active = true;
      state.belowCount = 0;
      const alert: HudAlert = {
        id: alertId,
        severity: 'warning',
        message: 'Risk EMA oltre soglia 0.60',
        metadata: {
          missionId: payload.missionId,
          turn: payload.turn,
          weightedIndex,
          timeLowHpTurns: getTimeLowHpTurns(payload),
        },
      };

      hudLayer.raiseAlert?.(alert);

      if (typeof commandBus.emit === 'function') {
        commandBus.emit('pi.balance.alert', {
          missionId: payload.missionId,
          roster: payload.roster,
          indices: payload.indices,
          turn: payload.turn,
          weightedIndex,
        });
      }

      if (telemetryRecorder) {
        telemetryRecorder.record({
          alertId: alert.id,
          status: 'raised',
          missionId: payload.missionId,
          turn: payload.turn,
          weightedIndex,
          timeLowHpTurns: getTimeLowHpTurns(payload),
          roster: payload.roster,
          timestamp: toIsoTimestamp(),
        });
      }

      if (typeof telemetryBus.emit === 'function') {
        telemetryBus.emit(telemetryEventName, {
          missionId: payload.missionId,
          turn: payload.turn,
          alert: alert,
        });
      }
      return;
    }

    if (state.active) {
      if (weightedIndex <= clearThreshold) {
        state.belowCount += 1;
      } else {
        state.belowCount = 0;
      }

      if (state.belowCount >= consecutiveBelow) {
        state.active = false;
        state.belowCount = 0;

        hudLayer.clearAlert?.(alertId);

        if (telemetryRecorder) {
          telemetryRecorder.record({
            alertId,
            status: 'cleared',
            missionId: payload.missionId,
            turn: payload.turn,
            weightedIndex,
            timeLowHpTurns: getTimeLowHpTurns(payload),
            roster: payload.roster,
            timestamp: toIsoTimestamp(),
          });
        }
      }
    }
  };

  telemetryBus.on('ema.update', listener);

  return () => detachListener(telemetryBus, listener);
}
