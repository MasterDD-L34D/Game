'use strict';

// SPEC-F export contract (spec :97-116, ADR-2026-04-27 :94,:110,:174-181) --
// non-JSON render formats for GET /skiv/share.
//
// The route builds the signed whitelist `card` (sanitizeWhitelist + recomputed
// companion_card_signature). These are PURE projections of that card; the backend
// returns data, the client renders the visual card / QR pixels (mirrors the
// creatureDossier #2856 data-not-pixels pattern). Zero-dep -- no image lib.
//
// QR per the ratified ADR (:110 "QR code PNG che incapsula share_url", :174-181
// scan -> URL -> fetch -> verify -> import): the QR encodes the PUBLIC share_url,
// NOT the inline card. `shareUrl` is materialized by the route (stored value or
// request-derived absolute URL) and is NOT part of the signed card, so the json
// format's signature is unaffected.

/**
 * format=card: labeled display projection of the signed whitelist card.
 * Heavy arrays are summarized (crossbreed_history -> count, voice_diary -> bool)
 * so a share-card renderer has a stable, privacy-lean field set.
 */
function toDisplayCard(card, shareUrl = null) {
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
    share_url: shareUrl ?? card.share_url ?? null,
    companion_card_signature: card.companion_card_signature ?? null,
    generated_at: card.generated_at ?? null,
  };
}

/**
 * format=qr: the client renders a QR that encodes the PUBLIC share_url (ADR
 * :110,:174-181). A generic scanner opens the URL, which serves the fetchable
 * signed card (?format=json) for signature-verified import. Zero-dep (the URL is
 * the payload; PNG rendering is a client concern).
 */
function toQrPayload(card, shareUrl = null) {
  if (!card || typeof card !== 'object') {
    throw new TypeError('toQrPayload: card object required');
  }
  return {
    format: 'qr',
    encodes: 'share_url',
    share_url: shareUrl ?? card.share_url ?? null,
    lineage_id: card.lineage_id ?? null,
  };
}

module.exports = { toDisplayCard, toQrPayload };
