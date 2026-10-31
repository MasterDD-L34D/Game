// PR-1 §22 coop-WS surface — Room.publishPhaseChange surfaces session_id +
// campaign_id in the VERSIONED phase_change event. This is the channel the
// Godot phone composer actually consumes (coop_ws_peer routes versioned
// events to `event_received`; plain version-less phase_change is dropped as
// unknown_type). Phone reads these ids on the debrief swap to fetch ALIENA
// telemetry + emergent tribes.
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { LobbyService } = require('../../../apps/backend/services/network/wsSession');

test('publishPhaseChange surfaces session_id + campaign_id in payload', () => {
  const lobby = new LobbyService();
  const created = lobby.createRoom({ hostName: 'TV', campaignId: 'camp_1' });
  const room = lobby.getRoom(created.code);
  room.sessionId = 'sess_7';

  const captured = [];
  room.broadcast = (msg) => captured.push(msg);

  room.publishPhaseChange('debrief');

  const evt = captured.find((m) => m.type === 'phase_change');
  assert.ok(evt, 'phase_change event broadcast');
  assert.equal(evt.payload.phase, 'debrief');
  assert.equal(evt.payload.session_id, 'sess_7');
  assert.equal(evt.payload.campaign_id, 'camp_1');
});
