import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

/**
 * Checks whether Supabase credentials have been injected into the environment.
 */
export function isSupabaseConfigured(): boolean {
  const url = environment.supabaseUrl;
  const key = environment.supabaseAnonKey;
  return Boolean(
    url &&
      url !== '__SUPABASE_URL__' &&
      key &&
      key !== '__SUPABASE_ANON_KEY__',
  );
}

/**
 * Centralized Supabase client singleton.
 *
 * Uses the publishable (anon) key — safe for the browser. Real security is
 * enforced by RLS policies and SECURITY DEFINER functions on the server.
 *
 * Only the `core` schema is exposed; the `pii` schema is never exposed
 * directly to the browser and is accessed solely via SECURITY DEFINER RPCs.
 */
let _client: SupabaseClient<any, 'core'> | null = null;

export function getSupabaseClient(): SupabaseClient<any, 'core'> {
  if (!_client) {
    const url = isSupabaseConfigured()
      ? environment.supabaseUrl
      : 'https://placeholder.supabase.co';
    const key = isSupabaseConfigured()
      ? environment.supabaseAnonKey
      : 'placeholder-anon-key';

    if (!isSupabaseConfigured()) {
      console.warn(
        '[Supabase] URL or anon key not configured. ' +
          'Set SUPABASE_URL and SUPABASE_ANON_KEY in .env (local) or Vercel environment variables.',
      );
    }

    _client = createClient(url, key, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      db: {
        schema: 'core',
      },
    });
  }
  return _client;
}
