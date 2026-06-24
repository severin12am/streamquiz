// ============================================================
// WhoSmarter — Supabase ADMIN client (SERVER ONLY)
//
// Uses the SERVICE ROLE key, which BYPASSES Row Level Security.
// This is how the server creates game rows after RLS forbids anon
// INSERTs on `games` (see supabase/migration-v11-rls-hardening.sql).
//
// ⚠️ NEVER import this from a client component and NEVER expose the
//    service role key to the browser. It has full DB access.
//
// SET UP:
//   In .env.local (and your host's env vars), add:
//     SUPABASE_SERVICE_ROLE_KEY=<service_role key from Supabase → API>
// ============================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

let admin: SupabaseClient | null = null;

/**
 * Returns the service-role Supabase client, or throws a clear error if it
 * isn't configured. Lazily created so a missing key doesn't crash import.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Server Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and ' +
        'SUPABASE_SERVICE_ROLE_KEY in your environment.',
    );
  }
  if (!admin) {
    admin = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}

export const isAdminConfigured = Boolean(url && serviceRoleKey);
