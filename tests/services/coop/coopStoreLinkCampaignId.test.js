// G2 #2746 — coopStore.linkSession must mirror campaignId onto the lobby room.
//
// Room.publishPhaseChange sends `campaign_id: this.campaignId ?? null`, but the
// coop flow never set room.campaignId: linkSession mirrored only sessionId. So
// every versioned phase_change carried campaign_id: null, and the Godot phone
// (which keys CampaignState on campaign_id) lost the link. Fix mirrors
// room.campaignId = campaignId in linkSession (run.id == campaign_id).
//
// Ref: MasterDD-L34D/Game#2746 voce G2.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { LobbyService } = require('../../../apps/backend/services/network/wsSession');
const { createCoopStore } = require('../../../apps/backend/services/coop/coopStore');

test('G2: linkSession mirrors campaignId onto the lobby room', () => {
  const lobby = new LobbyService();
  const coopStore = createCoopStore({ lobby });
  const room = lobby.createRoom({ hostName: 'TV' });

  const orch = coopStore.getOrCreate(room.code);
  orch.startRun({ scenarioStack: ['enc_tutorial_01'] });
  const campaignId = orch.run.id;

  // createRoom returns a client descriptor; the live Room (with sessionId/
  // campaignId/broadcast) is fetched via getRoom — same object linkSession mirrors onto.
  const liveRoom = lobby.getRoom(room.code);
  // Pre-condition: room has no campaignId yet.
  assert.ok(!liveRoom.campaignId, 'room.campaignId should be unset before linkSession');

  const linked = coopStore.linkSession(campaignId, 'sess_g2');
  assert.equal(linked, true, 'linkSession found the matching orch');
  assert.equal(liveRoom.sessionId, 'sess_g2', 'sessionId still mirrored (no regression)');
  assert.equal(liveRoom.campaignId, campaignId, 'campaignId mirrored onto the room');
});

test('G2: versioned phase_change carries the campaign_id after linkSession', () => {
  const lobby = new LobbyService();
  const coopStore = createCoopStore({ lobby });
  const room = lobby.createRoom({ hostName: 'TV' });

  const orch = coopStore.getOrCreate(room.code);
  orch.startRun({ scenarioStack: ['enc_tutorial_01'] });
  const campaignId = orch.run.id;
  coopStore.linkSession(campaignId, 'sess_g2b');

  // Capture the broadcast emitted by the versioned publisher on the live Room.
  const liveRoom = lobby.getRoom(room.code);
  const sent = [];
  liveRoom.broadcast = (msg) => sent.push(msg);
  liveRoom.publishPhaseChange('world_setup');

  const pc = sent.find((m) => m.type === 'phase_change');
  assert.ok(pc, 'phase_change broadcast emitted');
  assert.equal(pc.payload.campaign_id, campaignId, 'phase_change carries the campaign_id');
});
