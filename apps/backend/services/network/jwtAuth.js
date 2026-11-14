// Sprint R.1 — JWT auth helper for co-op WS multiplayer.
//
// HS256 sign/verify. Server-side sole authority: client only decodes
// payload for diagnostic refresh hints, never verifies signature.
//
// Claims schema (canonical):
//   { player_id, room_code, role, iat, exp }
//
// AUTH_SECRET resolution:
//   1. process.env.AUTH_SECRET (production)
//   2. dev fallback (dev-only random per-process). Logs warn once.
//
// TTL default: 24h. Override via AUTH_JWT_TTL_SECONDS env or sign() opts.

'use strict';

const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

const DEFAULT_TTL_SECONDS = 24 * 60 * 60; // 24h
const ALGORITHM = 'HS256';

let _devSecretLogged = false;
let _devSecret = null;

function _resolveSecret() {
  const fromEnv = process.env.AUTH_SECRET;
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  if (!_devSecret) {
    _devSecret = `dev-only-${crypto.randomBytes(24).toString('hex')}`;
    if (!_devSecretLogged) {
      // eslint-disable-next-line no-console
      console.warn(
        '[jwtAuth] AUTH_SECRET missing or too short (<16 chars); using dev fallback. NOT FOR PRODUCTION.',
      );
      _devSecretLogged = true;
    }
  }
  return _devSecret;
}

function _resolveTtl(ttlSeconds) {
  if (Number.isFinite(ttlSeconds) && ttlSeconds > 0) return ttlSeconds;
  const fromEnv = Number(process.env.AUTH_JWT_TTL_SECONDS);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return DEFAULT_TTL_SECONDS;
}

/**
 * Sign a JWT bearing co-op session claims.
 *
 * @param {object} claims - { player_id, room_code, role }
 * @param {object} [opts] - { ttlSeconds, secret }
 * @returns {string} JWT (HS256)
 */
function signPlayerToken(claims, opts = {}) {
  if (!claims || typeof claims !== 'object') {
    throw new Error('jwt_claims_required');
  }
  const { player_id, room_code, role } = claims;
  if (!player_id || typeof player_id !== 'string') {
    throw new Error('jwt_player_id_required');
  }
  if (!room_code || typeof room_code !== 'string') {
    throw new Error('jwt_room_code_required');
  }
  if (!role || typeof role !== 'string') {
    throw new Error('jwt_role_required');
  }
  const secret = opts.secret || _resolveSecret();
  const ttlSeconds = _resolveTtl(opts.ttlSeconds);
  return jwt.sign({ player_id, room_code, role }, secret, {
    algorithm: ALGORITHM,
    expiresIn: ttlSeconds,
  });
}

/**
 * Verify a JWT and return the decoded claims.
 *
 * Throws:
 *   - 'auth_expired' on expired token
 *   - 'auth_failed' on any other invalid token (bad signature, malformed, missing claim)
 *
 * @param {string} token
 * @param {object} [opts] - { secret }
 * @returns {object} decoded claims { player_id, room_code, role, iat, exp }
 */
function verifyPlayerToken(token, opts = {}) {
  if (!token || typeof token !== 'string') {
    const err = new Error('auth_failed');
    err.code = 'auth_failed';
    throw err;
  }
  const secret = opts.secret || _resolveSecret();
  let decoded;
  try {
    decoded = jwt.verify(token, secret, { algorithms: [ALGORITHM] });
  } catch (e) {
    const err = new Error(e.name === 'TokenExpiredError' ? 'auth_expired' : 'auth_failed');
    err.code = e.name === 'TokenExpiredError' ? 'auth_expired' : 'auth_failed';
    err.cause = e;
    throw err;
  }
  if (
    !decoded ||
    typeof decoded !== 'object' ||
    !decoded.player_id ||
    !decoded.room_code ||
    !decoded.role
  ) {
    const err = new Error('auth_failed');
    err.code = 'auth_failed';
    throw err;
  }
  return decoded;
}

module.exports = {
  signPlayerToken,
  verifyPlayerToken,
  DEFAULT_TTL_SECONDS,
  ALGORITHM,
};
