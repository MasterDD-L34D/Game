'use strict';
// Shared canonical role_class map for the badlands recruit pool. SINGLE source so both
// mbti-policy (temperament ordering of the pool) and meta-band-aggregator (roster
// composition metric) agree on which species fills which ecological role. Mirrors the role
// tags in greedy-policy's RECRUIT_SPECIES_POOL comments.
const SPECIES_ROLE = {
  'dune-stalker': 'APEX',
  'nano-rust-bloom': 'HAZARD',
  'ferrocolonia-magnetotattica': 'PREDATOR',
  'sand-burrower': 'PREY',
  'rust-scavenger': 'SUPPORT',
};

// role_class for a species id; UNKNOWN for anything outside the canonical pool (never throws).
function roleOf(speciesId) {
  return SPECIES_ROLE[speciesId] || 'UNKNOWN';
}

module.exports = { SPECIES_ROLE, roleOf };
