'use strict';

// SPEC-F export contract (spec :97-116) -- non-JSON render formats.
//
// The /skiv/share route already builds the signed whitelist `card`
// (sanitizeWhitelist + server-recomputed companion_card_signature). These are
// PURE projections of that card for the `card` and `qr` export formats: the
// backend returns data, the client renders the visual card / QR pixels (mirrors
// the creatureDossier #2856 data-not-pixels pattern). Zero-dep -- no image lib.
//
// Both derive ONLY from the already-sanitized card, so no PII can leak here.

/**
 * format=card: labeled display projection of the signed whitelist card.
 * Heavy arrays are summarized (crossbreed_history -> count, voice_diary -> bool)
 * so a share-card renderer has a stable, privacy-lean field set.
 */
function toDisplayCard(card) {
  if (!card || typeof card !== 'object') {
    throw new TypeError('toDisplayCard: card object required');
  }
  return {
    format: 'card',
    lineage_id: card.lineage_id ?? null,
    species_id: card.species_id ?? null,
    biome_id: card.biome_id ?? null,
    progression: card.progression ?? null,
    mbti_axes: card.mbti_axes ?? null,
    aspect: card.aspect ?? null,
    mutations: Array.isArray(card.mutations) ? card.mutations : [],
    crossbreed_count: Array.isArray(card.crossbreed_history) ? card.crossbreed_history.length : 0,
    has_diary: Array.isArray(card.voice_diary_portable) && card.voice_diary_portable.length > 0,
    companion_card_signature: card.companion_card_signature ?? null,
    generated_at: card.generated_at ?? null,
  };
}

/**
 * format=qr: base64url-encoded signed card JSON. The client renders the QR;
 * scanning + base64url-decoding yields the importable signed card verbatim
 * (signature intact -> re-verifiable at import). Zero-dep encoding.
 */
function toQrPayload(card) {
  if (!card || typeof card !== 'object') {
    throw new TypeError('toQrPayload: card object required');
  }
  const json = JSON.stringify(card);
  return {
    format: 'qr',
    encoding: 'base64url+json',
    payload: Buffer.from(json, 'utf8').toString('base64url'),
    byte_len: Buffer.byteLength(json, 'utf8'),
    share_url: card.share_url ?? null,
  };
}

module.exports = { toDisplayCard, toQrPayload };
