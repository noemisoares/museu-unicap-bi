import { Service, signal } from '@angular/core';
import { getSupabaseClient } from './supabase.client';
import type { AuthSession } from '../models/auth.models';

/**
 * Session state for the management portal, backed by Supabase Auth.
 *
 * Authentication flow:
 * 1. User enters email + password on /login.
 * 2. `signInWithPassword` authenticates against Supabase Auth.
 * 3. Server-side `core.is_admin()` verifies authorization via `core.admin_usuario`
 *    or non-user-editable `app_metadata.role` (never user_metadata).
 * 4. Real authorization is enforced by RLS policies in PostgreSQL.
 */
@Service()
export class AuthService {
  private readonly supabase = getSupabaseClient();
  private readonly sessionSignal = signal<AuthSession | null>(null);
  private readonly initializedPromise: Promise<void>;

  /** Read-only view of the current session. */
  readonly session = this.sessionSignal.asReadonly();

  constructor() {
    this.initializedPromise = this.recoverSession();

    this.supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        this.sessionSignal.set({
          name: session.user.user_metadata?.['name'] ?? session.user.email ?? 'Admin',
          email: session.user.email ?? '',
          role: session.user.app_metadata?.['role'] ?? 'gestao',
        });
      } else {
        this.sessionSignal.set(null);
      }
    });
  }

  /** Waits for the initial session recovery to complete (used by route guards). */
  async ensureSessionInitialized(): Promise<AuthSession | null> {
    await this.initializedPromise;
    return this.sessionSignal();
  }

  /**
   * Signs in via Supabase Auth with email/password and verifies admin authorization.
   */
  async login(request: { identifier: string; password: string }): Promise<AuthSession> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: request.identifier.trim(),
      password: request.password,
    });

    if (error) {
      throw new Error(
        error.message === 'Invalid login credentials'
          ? 'Credenciais inválidas. Verifique seu e-mail e senha.'
          : error.message,
      );
    }

    const { data: isAdmin, error: adminError } = await this.supabase.rpc('is_admin');
    if (adminError || isAdmin !== true) {
      await this.supabase.auth.signOut();
      this.sessionSignal.set(null);
      throw new Error(
        'Usuário autenticado não possui permissão de acesso ao Portal de Gestão.',
      );
    }

    const user = data.user;
    const session: AuthSession = {
      name: user.user_metadata?.['name'] ?? user.email ?? 'Admin',
      email: user.email ?? '',
      role: user.app_metadata?.['role'] ?? 'gestao',
    };

    this.sessionSignal.set(session);
    return session;
  }

  /** Signs out from Supabase Auth and clears the session signal. */
  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
    this.sessionSignal.set(null);
  }

  /** Recovers the session from Supabase's internal persistence. */
  private async recoverSession(): Promise<void> {
    try {
      const { data } = await this.supabase.auth.getSession();
      if (data.session?.user) {
        const { data: isAdmin } = await this.supabase.rpc('is_admin');
        if (isAdmin === true) {
          this.sessionSignal.set({
            name: data.session.user.user_metadata?.['name'] ?? data.session.user.email ?? 'Admin',
            email: data.session.user.email ?? '',
            role: data.session.user.app_metadata?.['role'] ?? 'gestao',
          });
        } else {
          await this.supabase.auth.signOut();
          this.sessionSignal.set(null);
        }
      }
    } catch {
      this.sessionSignal.set(null);
    }
  }
}
