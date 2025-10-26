import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';

import { registerRiskHudAlertSystem } from '../hud_alerts.js';

test('risk HUD alert triggers once above threshold and notifies PI team', () => {
  const telemetryBus = new EventEmitter();
  const commandBus = new EventEmitter();
  const raisedAlerts: any[] = [];
  const notified: any[] = [];
  const recorded: any[] = [];
  const telemetryEvents: any[] = [];

  const hudLayer = {
    raiseAlert: (alert: any) => raisedAlerts.push(alert),
    clearAlert: () => {
      /* noop */
    },
    updateTrend: () => {
      /* noop */
    },
  };

  commandBus.on('pi.balance.alerts', (payload) => {
    notified.push(payload);
  });

  telemetryBus.on('hud.alert.risk-high', (payload) => telemetryEvents.push(payload));

  registerRiskHudAlertSystem({
    telemetryBus,
    hudLayer,
    commandBus,
    telemetryRecorder: {
      record: (entry) => recorded.push(entry),
    },
  });

  telemetryBus.emit('ema.update', {
    missionId: 'skydock_siege',
    roster: ['Sentinel', 'Vesper'],
    turn: 11,
    indices: {
      risk: {
        weighted_index: 0.62,
        time_low_hp_turns: 7,
      },
    },
  });

  telemetryBus.emit('ema.update', {
    missionId: 'skydock_siege',
    roster: ['Sentinel', 'Vesper'],
    turn: 12,
    indices: {
      risk: {
        weighted_index: 0.65,
        time_low_hp_turns: 8,
      },
    },
  });

  assert.equal(raisedAlerts.length, 1);
  assert.equal(raisedAlerts[0].id, 'risk-high:skydock_siege');
  assert.equal(notified.length, 1);
  assert.equal(notified[0].weightedIndex, 0.62);
  assert.equal(recorded.length, 1);
  assert.equal(recorded[0].status, 'raised');
  assert.equal(telemetryEvents.length, 1);
  assert.equal(telemetryEvents[0].alert.id, 'risk-high:skydock_siege');
});

test('risk HUD alert clears after two ticks below the clear threshold', () => {
  const telemetryBus = new EventEmitter();
  const commandBus = new EventEmitter();
  const clearCalls: string[] = [];

  const hudLayer = {
    raiseAlert: () => {
      /* noop */
    },
    clearAlert: (id: string) => clearCalls.push(id),
    updateTrend: () => {
      /* noop */
    },
  };

  const recorded: any[] = [];

  registerRiskHudAlertSystem({
    telemetryBus,
    hudLayer,
    commandBus,
    telemetryRecorder: {
      record: (entry) => recorded.push(entry),
    },
  });

  telemetryBus.emit('ema.update', {
    missionId: 'skydock_siege',
    turn: 15,
    indices: {
      risk: {
        weighted_index: 0.64,
        time_low_hp_turns: 6,
      },
    },
  });

  telemetryBus.emit('ema.update', {
    missionId: 'skydock_siege',
    turn: 16,
    indices: {
      risk: {
        weighted_index: 0.57,
        time_low_hp_turns: 5,
      },
    },
  });

  telemetryBus.emit('ema.update', {
    missionId: 'skydock_siege',
    turn: 17,
    indices: {
      risk: {
        weighted_index: 0.56,
        time_low_hp_turns: 4,
      },
    },
  });

  assert.equal(clearCalls.length, 1);
  assert.equal(clearCalls[0], 'risk-high:skydock_siege');
  assert.equal(recorded.length, 2);
  assert.equal(recorded[0].status, 'raised');
  assert.equal(recorded[1].status, 'cleared');
});

test('risk HUD alert maintains separate state per mission', () => {
  const telemetryBus = new EventEmitter();
  const commandBus = new EventEmitter();
  const raisedAlerts: string[] = [];
  const clearedAlerts: string[] = [];

  const hudLayer = {
    raiseAlert: (alert: any) => raisedAlerts.push(alert.id),
    clearAlert: (id: string) => clearedAlerts.push(id),
    updateTrend: () => {
      /* noop */
    },
  };

  registerRiskHudAlertSystem({ telemetryBus, hudLayer, commandBus });

  telemetryBus.emit('ema.update', {
    missionId: 'mission-alpha',
    turn: 5,
    indices: {
      risk: {
        weighted_index: 0.63,
      },
    },
  });

  telemetryBus.emit('ema.update', {
    missionId: 'mission-beta',
    turn: 6,
    indices: {
      risk: {
        weighted_index: 0.64,
      },
    },
  });

  telemetryBus.emit('ema.update', {
    missionId: 'mission-alpha',
    turn: 7,
    indices: {
      risk: {
        weighted_index: 0.57,
      },
    },
  });

  telemetryBus.emit('ema.update', {
    missionId: 'mission-alpha',
    turn: 8,
    indices: {
      risk: {
        weighted_index: 0.56,
      },
    },
  });

  assert.deepEqual(raisedAlerts, ['risk-high:mission-alpha', 'risk-high:mission-beta']);
  assert.deepEqual(clearedAlerts, ['risk-high:mission-alpha']);
});
