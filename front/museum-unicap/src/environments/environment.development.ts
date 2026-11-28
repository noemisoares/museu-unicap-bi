interface RuntimeEnv {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  TERMINAL_ID?: string;
}

const runtimeEnv = (globalThis as { __ENV__?: RuntimeEnv }).__ENV__;

/**
 * Development environment configuration.
 *
 * Create `front/museum-unicap/.env` (from `.env.example`) with your
 * `SUPABASE_URL` and `SUPABASE_ANON_KEY`. `npm start` automatically runs
 * `scripts/inject-env.mjs` to generate `public/env.js`.
 */
export const environment = {
  production: false,
  /** @deprecated — left for backward compatibility; new code uses Supabase client. */
  apiUrl: '/api/v1',
  /** Always false: real Supabase integration is used. */
  useMockApi: false,
  /** Terminal name used to identify this device in the database. */
  terminalId: runtimeEnv?.TERMINAL_ID || 'Check-in Recepcao',
  /** Supabase project URL. */
  supabaseUrl: runtimeEnv?.SUPABASE_URL || '__SUPABASE_URL__',
  /** Supabase publishable (anon) key. */
  supabaseAnonKey: runtimeEnv?.SUPABASE_ANON_KEY || '__SUPABASE_ANON_KEY__',
};
