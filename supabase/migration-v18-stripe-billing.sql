-- ============================================================
-- WhoSmarter — Migration v18: web subscriptions (Stripe)
-- ============================================================
-- Run this ONCE in your Supabase SQL Editor.
-- Safe to run multiple times (IF NOT EXISTS / OR REPLACE).
--
-- WHAT THIS ADDS:
--
--   creator_quota (formalized):
--     Already used by lib/creator-quota.ts (iOS quota, keyed by the
--     RevenueCat app user id) but was never committed as a migration.
--     Web users now share the same table with keys 'web:{auth.users.id}'.
--
--   web_subscriptions (new):
--     One row per web user (Supabase auth uid) holding their Stripe
--     customer/subscription ids and the resolved tier. Written ONLY by
--     the server (Stripe webhook + checkout API) via the service role.
--
-- RLS: both tables deny ALL access to anon/authenticated. Only the
-- service-role server code may read/write them.
-- ============================================================

-- -------------------------------------------------------
-- creator_quota — authoritative create-quiz counters
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS creator_quota (
  quota_key    TEXT PRIMARY KEY,          -- RevenueCat app user id (iOS) or 'web:{uid}' (web)
  free_used    INTEGER NOT NULL DEFAULT 0, -- lifetime free creates consumed
  monthly_used INTEGER NOT NULL DEFAULT 0, -- creates consumed in month_key
  month_key    TEXT NOT NULL,              -- 'YYYY-MM' the monthly counter applies to
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE creator_quota ENABLE ROW LEVEL SECURITY;
-- No policies → anon/authenticated are denied everything; only the
-- service role (bypasses RLS) can touch quota rows.

COMMENT ON TABLE creator_quota IS
  'Server-side quiz-creation counters. Keys: RevenueCat app user id (iOS) or web:{auth uid} (web). Service role only.';

-- -------------------------------------------------------
-- web_subscriptions — Stripe subscription state per web user
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS web_subscriptions (
  user_id                UUID PRIMARY KEY,   -- Supabase auth.users.id (Google host account)
  stripe_customer_id     TEXT UNIQUE,
  stripe_subscription_id TEXT,
  tier                   TEXT NOT NULL DEFAULT 'free'
                           CHECK (tier IN ('free', 'basic', 'premium')),
  status                 TEXT NOT NULL DEFAULT 'none', -- Stripe subscription status (active/trialing/past_due/canceled/…)
  current_period_end     TIMESTAMPTZ,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE web_subscriptions ENABLE ROW LEVEL SECURITY;
-- No policies → service role only. Clients read their tier through
-- GET /api/billing/status, never directly from the table.

-- Webhook events arrive keyed by Stripe customer id.
CREATE INDEX IF NOT EXISTS web_subscriptions_customer_idx
  ON web_subscriptions (stripe_customer_id);

COMMENT ON TABLE web_subscriptions IS
  'Stripe subscription state for web hosts (Supabase auth uid). Written only by /api/billing/* and /api/stripe/webhook via service role.';
