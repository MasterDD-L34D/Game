// M11 Phase A — Lobby REST routes.
// ADR-2026-04-20.
//
// Endpoints:
//   POST /api/lobby/create  — create room, return code + host token
//   POST /api/lobby/join    — join by code + name, return player token
//   POST /api/lobby/rejoin  — validate stored token + return room snapshot
//   POST /api/lobby/close   — close room (host only)
//   GET  /api/lobby/state   — inspect room snapshot (?code=ABCD)
//   GET  /api/lobby/list    — list open rooms (admin/debug)
//
// Auth: host operations require host_token returned from /create.
// Player operations return a player_token used on WS connect.
//
// WebSocket URL shape (Phase A separate server):
//   ws://host:3341/ws?code=ABCD&player_id=p_xxx&token=YYY

'use strict';

const express = require('express');

function createLobbyRouter({ lobby } = {}) {
  if (!lobby) throw new Error('createLobbyRouter: lobby service required');
  const router = express.Router();

  router.post('/lobby/create', (req, res) => {
    const {
      host_name: hostName,
      campaign_id: campaignId = null,
      max_players: maxPlayers,
    } = req.body || {};
    if (!hostName || typeof hostName !== 'string') {
      return res.status(400).json({ error: 'host_name richiesto (string)' });
    }
    try {
      const result = lobby.createRoom({
        hostName,
        campaignId: campaignId || null,
        maxPlayers: Number.isFinite(Number(maxPlayers)) ? Number(maxPlayers) : undefined,
      });
      return res.status(201).json(result);
    } catch (err) {
      return res.status(500).json({ error: err.message || 'errore creazione room' });
    }
  });

  router.post('/lobby/join', (req, res) => {
    const { code, player_name: playerName } = req.body || {};
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'code richiesto (string)' });
    }
    if (!playerName || typeof playerName !== 'string') {
      return res.status(400).json({ error: 'player_name richiesto (string)' });
    }
    try {
      const result = lobby.joinRoom({ code, playerName });
      return res.status(201).json(result);
    } catch (err) {
      const code = err.message;
      if (code === 'room_not_found') return res.status(404).json({ error: code });
      if (code === 'room_closed' || code === 'room_full') {
        return res.status(409).json({ error: code });
      }
      return res.status(400).json({ error: code });
    }
  });

  // B-NEW-4 fix 2026-05-08 — rejoin path. Phone close-tab / cross-device
  // resume needs a way to validate the stored localStorage session before
  // attempting WS reconnect. Pre-fix: no REST probe → frontend redirected
  // to game shell, WS attempt failed silently, user saw lobby home with
  // no rejoin CTA (dead-end UX). Now: client calls /lobby/rejoin first,
  // gets explicit 404 / 401 / 410 to clear stale session, or 200 + room
  // snapshot to safely resume WS.
  router.post('/lobby/rejoin', (req, res) => {
    const { code, player_id: playerId, player_token: playerToken } = req.body || {};
    if (!code || !playerId || !playerToken) {
      return res.status(400).json({ error: 'code + player_id + player_token richiesti' });
    }
    const room = lobby.getRoom(code);
    if (!room) {
      // B-NEW-4-bis: distinguish "never existed" from "recently closed".
      // closeRoom drops the room from the live registry but retains the
      // code in `_recentlyClosed` for RECENTLY_CLOSED_TTL_MS, so the
      // returning phone gets 410 (session ended) instead of 404 (typo).
      if (lobby.wasRecentlyClosed?.(code)) {
        return res.status(410).json({ error: 'room_closed' });
      }
      return res.status(404).json({ error: 'room_not_found' });
    }
    if (room.closed) return res.status(410).json({ error: 'room_closed' });
    const player = room.authenticate?.(playerId, playerToken);
    if (!player) return res.status(401).json({ error: 'auth_failed' });
    return res.json({
      code: room.code,
      player_id: playerId,
      role: player.role,
      room: room.snapshot(),
    });
  });

  router.post('/lobby/close', (req, res) => {
    const { code, host_token: hostToken } = req.body || {};
    if (!code || !hostToken) {
      return res.status(400).json({ error: 'code + host_token richiesti' });
    }
    try {
      const result = lobby.closeRoom({ code, hostToken });
      return res.json(result);
    } catch (err) {
      const msg = err.message;
      if (msg === 'room_not_found') return res.status(404).json({ error: msg });
      if (msg === 'host_auth_failed') return res.status(403).json({ error: msg });
      return res.status(400).json({ error: msg });
    }
  });

  router.get('/lobby/state', (req, res) => {
    const code = String(req.query.code || '');
    if (!code) return res.status(400).json({ error: 'code query param richiesto' });
    const room = lobby.getRoom(code);
    if (!room) return res.status(404).json({ error: 'room_not_found' });
    return res.json({ room: room.snapshot() });
  });

  router.get('/lobby/list', (req, res) => {
    const rooms = lobby.listRooms();
    return res.json({ rooms, count: rooms.length });
  });

  return router;
}

module.exports = { createLobbyRouter };
