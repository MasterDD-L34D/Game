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
  on?(event: string, listener: (payload: unknown) => void): void;
  addListener?(event: string, listener: (payload: unknown) => void): void;
  off?(event: string, listener: (payload: unknown) => void): void;
  removeListener?(event: string, listener: (payload: unknown) => void): void;
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

export type RiskHudAlertStatus = 'raised' | 'cleared' | 'filtered' | 'acknowledged';

export interface RiskHudAlertLog {
  alertId: string;
  status: RiskHudAlertStatus;
  missionId?: string;
  missionTag?: string;
  turn?: number;
  weightedIndex?: number;
  timeLowHpTurns?: number | null;
  roster?: string[];
  timestamp?: string;
  ackRecipient?: string;
  ackRecipients?: string[];
  ackCount?: number;
  lastAckTimestamp?: string;
  filterName?: string;
  filterCount?: number;
}

export interface RiskHudAlertOptions {
  threshold?: number;
  clearThreshold?: number;
  consecutiveBelowThreshold?: number;
  telemetryEventName?: string;
  filters?: RiskHudAlertFilter[];
  missionTags?: Record<string, string>;
  missionTagger?: MissionTagResolver;
}

interface RiskHudAlertState {
  active: boolean;
  belowCount: number;
}

export type RiskHudAlertFilter = (payload: EmaUpdatePayload) => boolean;

export type MissionTagResolver = (payload: EmaUpdatePayload) => string | undefined;

export interface HudAlertAckPayload {
  alertId: string;
  missionId?: string;
  missionTag?: string;
  turn?: number;
  recipient?: string;
  weightedIndex?: number;
  timeLowHpTurns?: number | null;
  roster?: string[];
  timestamp?: string;
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

function resolveMissionTag(
  payload: EmaUpdatePayload,
  missionTags?: Record<string, string>,
  missionTagger?: MissionTagResolver,
): string | undefined {
  const missionId = payload?.missionId;
  if (missionId && missionTags && missionTags[missionId]) {
    return missionTags[missionId];
  }

  if (missionTagger) {
    const resolved = missionTagger(payload);
    if (resolved) {
      return resolved;
    }
  }

  return undefined;
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

function detachCommandListener(bus: CommandBusLike, listener: (payload: unknown) => void) {
  if (typeof bus.off === 'function') {
    bus.off('hud.alert.ack', listener);
    return;
  }

  if (typeof bus.removeListener === 'function') {
    bus.removeListener('hud.alert.ack', listener);
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
  const filters = Array.isArray(options?.filters)
    ? options.filters.filter((candidate): candidate is RiskHudAlertFilter => typeof candidate === 'function')
    : [];

  const states = new Map<string, RiskHudAlertState>();
  const filterCounts = new Map<string, number>();
  type AckMetrics = {
    count: number;
    recipients: Set<string>;
    lastTimestamp?: string;
    missionId?: string;
    missionTag?: string;
    roster?: string[];
    weightedIndex?: number;
    timeLowHpTurns?: number | null;
  };
  const ackMetrics = new Map<string, AckMetrics>();

  const ackListener = (rawPayload: unknown) => {
    if (!rawPayload || typeof rawPayload !== 'object') {
      return;
    }

    const payload = rawPayload as HudAlertAckPayload;
    if (!payload.alertId) {
      return;
    }

    const current = ackMetrics.get(payload.alertId) ?? {
      count: 0,
      recipients: new Set<string>(),
      missionId: payload.missionId,
      missionTag: payload.missionTag,
      roster: payload.roster,
      weightedIndex: payload.weightedIndex,
      timeLowHpTurns: payload.timeLowHpTurns ?? null,
    };

    current.count += 1;
    if (payload.recipient) {
      current.recipients.add(payload.recipient);
    }

    current.missionId = payload.missionId ?? current.missionId;
    current.missionTag = payload.missionTag ?? current.missionTag;
    current.roster = payload.roster ?? current.roster;
    current.weightedIndex = payload.weightedIndex ?? current.weightedIndex;
    current.timeLowHpTurns =
      typeof payload.timeLowHpTurns === 'number' ? payload.timeLowHpTurns : current.timeLowHpTurns ?? null;

    const timestamp = payload.timestamp ?? toIsoTimestamp();
    current.lastTimestamp = timestamp;

    ackMetrics.set(payload.alertId, current);

    if (telemetryRecorder) {
      telemetryRecorder.record({
        alertId: payload.alertId,
        status: 'acknowledged',
        missionId: current.missionId,
        missionTag: current.missionTag,
        turn: payload.turn,
        weightedIndex: current.weightedIndex,
        timeLowHpTurns: current.timeLowHpTurns ?? null,
        roster: current.roster,
        timestamp,
        ackRecipient: payload.recipient,
        ackRecipients: Array.from(current.recipients),
        ackCount: current.count,
        lastAckTimestamp: current.lastTimestamp,
      });
    }
  };

  if (typeof commandBus.on === 'function') {
    commandBus.on('hud.alert.ack', ackListener);
  } else if (typeof commandBus.addListener === 'function') {
    commandBus.addListener('hud.alert.ack', ackListener);
  }

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
    const timeLowHpTurns = getTimeLowHpTurns(payload);
    const missionTag = resolveMissionTag(payload, options?.missionTags, options?.missionTagger);

    for (const filter of filters) {
      let passes = true;
      try {
        passes = filter(payload) !== false;
      } catch (error) {
        passes = false;
      }

      if (!passes) {
        const nameCandidate = (filter as { displayName?: string }).displayName;
        const filterName = nameCandidate ?? filter.name ?? 'anonymous';
        const currentCount = (filterCounts.get(filterName) ?? 0) + 1;
        filterCounts.set(filterName, currentCount);

        if (telemetryRecorder) {
          telemetryRecorder.record({
            alertId,
            status: 'filtered',
            missionId: payload.missionId,
            missionTag,
            turn: payload.turn,
            weightedIndex: weightedIndex ?? undefined,
            timeLowHpTurns,
            roster: payload.roster,
            timestamp: toIsoTimestamp(),
            filterName,
            filterCount: currentCount,
          });
        }

        return;
      }
    }

    if (weightedIndex === null) {
      state.belowCount = 0;
      return;
    }

    if (!state.active && weightedIndex >= threshold) {
      state.active = true;
      state.belowCount = 0;
      ackMetrics.set(alertId, {
        count: 0,
        recipients: new Set<string>(),
        missionId: payload.missionId,
        missionTag,
        roster: payload.roster,
        weightedIndex,
        timeLowHpTurns,
      });
      const alert: HudAlert = {
        id: alertId,
        severity: 'warning',
        message: 'Risk EMA oltre soglia 0.60',
        metadata: {
          missionId: payload.missionId,
          missionTag,
          turn: payload.turn,
          weightedIndex,
          timeLowHpTurns,
        },
      };

      hudLayer.raiseAlert?.(alert);

      if (typeof commandBus.emit === 'function') {
        commandBus.emit('pi.balance.alerts', {
          missionId: payload.missionId,
          roster: payload.roster,
          indices: payload.indices,
          turn: payload.turn,
          weightedIndex,
          missionTag,
        });
      }

      if (telemetryRecorder) {
        telemetryRecorder.record({
          alertId: alert.id,
          status: 'raised',
          missionId: payload.missionId,
          missionTag,
          turn: payload.turn,
          weightedIndex,
          timeLowHpTurns,
          roster: payload.roster,
          timestamp: toIsoTimestamp(),
          ackCount: 0,
          ackRecipients: [],
        });
      }

      if (typeof telemetryBus.emit === 'function') {
        telemetryBus.emit(telemetryEventName, {
          missionId: payload.missionId,
          turn: payload.turn,
          alert,
          missionTag,
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
          const ackInfo = ackMetrics.get(alertId);
          telemetryRecorder.record({
            alertId,
            status: 'cleared',
            missionId: payload.missionId,
            missionTag,
            turn: payload.turn,
            weightedIndex,
            timeLowHpTurns,
            roster: payload.roster,
            timestamp: toIsoTimestamp(),
            ackCount: ackInfo?.count,
            ackRecipients: ackInfo ? Array.from(ackInfo.recipients) : undefined,
            lastAckTimestamp: ackInfo?.lastTimestamp,
          });
        }
      }
    }
  };

  telemetryBus.on('ema.update', listener);

  return () => {
    detachListener(telemetryBus, listener);
    detachCommandListener(commandBus, ackListener);
  };
}
