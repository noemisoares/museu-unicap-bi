interface RuntimeEnv {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  TERMINAL_ID?: string;
}

const runtimeEnv = (globalThis as { __ENV__?: RuntimeEnv }).__ENV__;

/**
 * Production environment configuration.
 *
 * Runtime values are injected via `public/env.js` generated at build time by
 * `scripts/inject-env.mjs` from `SUPABASE_URL` and `SUPABASE_ANON_KEY`
 * environment variables (Vercel or local `.env`).
 */
export const environment = {
  production: true,
  /** @deprecated — left for backward compatibility; new code uses Supabase client. */
  apiUrl: '/api/v1',
  /** Mock API simulator — MUST stay false in production. */
  useMockApi: false,
  /** Identity of the terminal running this instance. */
  terminalId: runtimeEnv?.TERMINAL_ID || 'Check-in Recepcao',
  /** Supabase project URL. */
  supabaseUrl: runtimeEnv?.SUPABASE_URL || '__SUPABASE_URL__',
  /** Supabase publishable (anon) key — safe for browser. */
  supabaseAnonKey: runtimeEnv?.SUPABASE_ANON_KEY || '__SUPABASE_ANON_KEY__',
};
