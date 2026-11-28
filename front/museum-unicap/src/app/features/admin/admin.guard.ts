import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/**
 * UX-only route guard for the management area.
 *
 * Waits for Supabase session recovery on page reload before redirecting
 * anonymous users to `/login`. Real authorization is enforced by RLS in PostgreSQL.
 */
export const adminGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const session = await authService.ensureSessionInitialized();
  if (session !== null) {
    return true;
  }
  return router.createUrlTree(['/login']);
};
