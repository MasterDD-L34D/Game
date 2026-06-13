-- 2026-05-13 TKT-D2-C Godot v2 CampaignState cross-stack sync.
-- Master-dd verdict B+C 2026-05-12 (Wave 2026-05-12 #241 B-side shipped
-- Godot v2 JSON local persistence; C-side mirror server-side persistence
-- gated on master-dd workspace cleanup, executed 2026-05-13).
--
-- Mirrors Godot v2 `scripts/session/campaign_state.gd` Resource fields
-- shipped in PR #241 (D2-B) + #226 (M15 promotion) + #227 (M14-B Conviction)
-- + #228 (P2 Brigandine Seasonal). Provides server-side ground truth for
-- cross-encounter persistence so multi-device + co-op sessions can hydrate
-- consistent state across clients.
--
-- Schema mirror Godot Resource shape:
--   Godot field           Postgres column          Type
--   ----------------------------------------------------
--   campaign_id           campaign_id              TEXT
--   wounds_by_unit        wounds_by_unit           JSONB
--   status_locks          status_locks             JSONB
--   last_encounter_id     last_encounter_id        TEXT
--   promotion_tiers       promotion_tiers          JSONB
--   conviction_axes       conviction_axes          JSONB
--   seasonal_state        seasonal_state           JSONB
--
-- JSONB columns chosen over normalized rows: write-through adapter pattern
-- (Godot v2 saves full Resource per JSON file → backend persists snapshot
-- atomically), low query volume (load once per encounter boot), shape
-- evolves with Godot v2 Resource changes (additive @export fields
-- backward-compat without schema migration churn).
--
-- Backward-compat: dedicated table (no ALTER on existing models). Existing
-- Campaign / PartyRoster paths unchanged. Godot v2 client populates via
-- new REST endpoints POST/GET /api/campaign/godot-v2/state (routes follow
-- in this PR).

CREATE TABLE "godot_v2_campaign_states" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "wounds_by_unit" JSONB NOT NULL DEFAULT '{}',
    "status_locks" JSONB NOT NULL DEFAULT '{}',
    "last_encounter_id" TEXT NOT NULL DEFAULT '',
    "promotion_tiers" JSONB NOT NULL DEFAULT '{}',
    "conviction_axes" JSONB NOT NULL DEFAULT '{}',
    "seasonal_state" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "godot_v2_campaign_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "godot_v2_campaign_states_campaign_id_key"
    ON "godot_v2_campaign_states"("campaign_id");
