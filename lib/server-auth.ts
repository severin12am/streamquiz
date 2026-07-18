// ============================================================
// WhoSmarter — Bearer-token auth helper for API routes (SERVER ONLY)
//
// Web hosts authenticate with a Supabase Auth JWT (Google sign-in):
//   Authorization: Bearer <access_token>
// Verifies the token against Supabase and returns the user, or null.
// ============================================================

import type { NextRequest } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export async function getUserFromRequest(
  req: NextRequest,
  admin: SupabaseClient,
): Promise<User | null> {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';
  if (!token) return null;

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}
