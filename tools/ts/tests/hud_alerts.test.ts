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
  assert.equal(recorded.length, 2);
  assert.deepEqual(
    recorded.map((entry) => entry.status),
    ['raised', 'overlay.displayed'],
  );
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
  assert.equal(recorded.length, 4);
  assert.deepEqual(
    recorded.map((entry) => entry.status),
    ['raised', 'overlay.displayed', 'cleared', 'overlay.dismissed'],
  );
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

test('risk HUD alert tracks acknowledgement events and exposes them in telemetry', () => {
  const telemetryBus = new EventEmitter();
  const commandBus = new EventEmitter();
  const recorded: any[] = [];

  const hudLayer = {
    raiseAlert: () => {
      /* noop */
    },
    clearAlert: () => {
      /* noop */
    },
    updateTrend: () => {
      /* noop */
    },
  };

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
        weighted_index: 0.65,
        time_low_hp_turns: 6,
      },
    },
  });

  commandBus.emit('hud.alert.ack', {
    alertId: 'risk-high:skydock_siege',
    missionId: 'skydock_siege',
    recipient: 'pi.balance.alerts',
  });

  telemetryBus.emit('ema.update', {
    missionId: 'skydock_siege',
    turn: 12,
    indices: {
      risk: {
        weighted_index: 0.57,
        time_low_hp_turns: 5,
      },
    },
  });

  telemetryBus.emit('ema.update', {
    missionId: 'skydock_siege',
    turn: 13,
    indices: {
      risk: {
        weighted_index: 0.55,
        time_low_hp_turns: 4,
      },
    },
  });

  const statuses = recorded.map((entry) => entry.status);
  assert.deepEqual(statuses, ['raised', 'overlay.displayed', 'acknowledged', 'cleared', 'overlay.dismissed']);

  const ackEntry = recorded.find((entry) => entry.status === 'acknowledged');
  assert.equal(ackEntry?.ackRecipient, 'pi.balance.alerts');
  assert.equal(ackEntry?.ackCount, 1);

  const cleared = recorded.find((entry) => entry.status === 'cleared');
  assert.equal(cleared?.ackCount, 1);
  assert.deepEqual(cleared?.ackRecipients, ['pi.balance.alerts']);
});

test('risk HUD alert records filter drops with counters for QA visibility', () => {
  const telemetryBus = new EventEmitter();
  const commandBus = new EventEmitter();
  const recorded: any[] = [];
  let rejectFirst = true;

  const hudLayer = {
    raiseAlert: () => {
      /* noop */
    },
    clearAlert: () => {
      /* noop */
    },
    updateTrend: () => {
      /* noop */
    },
  };

  registerRiskHudAlertSystem({
    telemetryBus,
    hudLayer,
    commandBus,
    telemetryRecorder: {
      record: (entry) => recorded.push(entry),
    },
    options: {
      filters: [
        function blockFirst() {
          if (rejectFirst) {
            rejectFirst = false;
            return false;
          }

          return true;
        },
      ],
    },
  });

  telemetryBus.emit('ema.update', {
    missionId: 'mission-alpha',
    turn: 3,
    indices: {
      risk: {
        weighted_index: 0.64,
        time_low_hp_turns: 3,
      },
    },
  });

  telemetryBus.emit('ema.update', {
    missionId: 'mission-alpha',
    turn: 4,
    indices: {
      risk: {
        weighted_index: 0.66,
        time_low_hp_turns: 4,
      },
    },
  });

  const filteredEntry = recorded.find((entry) => entry.status === 'filtered');
  assert.ok(filteredEntry, 'Un evento filtrato deve essere registrato');
  assert.equal(filteredEntry.filterCount, 1);
  assert.equal(filteredEntry.filterName, 'blockFirst');

  const raisedEntry = recorded.find((entry) => entry.status === 'raised');
  assert.ok(raisedEntry, "L'evento successivo deve superare i filtri");
});
