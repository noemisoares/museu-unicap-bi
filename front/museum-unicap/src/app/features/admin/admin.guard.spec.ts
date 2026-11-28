import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { adminGuard } from './admin.guard';
import { AuthService } from '../../core/services/auth.service';
import { AuthSession } from '../../core/models/auth.models';

describe('adminGuard', () => {
  let mockSession: ReturnType<typeof signal<AuthSession | null>>;

  const runGuard = () =>
    TestBed.runInInjectionContext(() =>
      adminGuard({} as never, { url: '/admin/dashboard' } as never),
    );

  beforeEach(() => {
    mockSession = signal<AuthSession | null>(null);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            session: mockSession.asReadonly(),
            ensureSessionInitialized: async () => mockSession(),
          },
        },
      ],
    });
  });

  it('should redirect anonymous users to the login screen', async () => {
    const result = await runGuard();
    const urlTree = result as { toString(): string };
    expect(urlTree.toString()).toContain('/login');
  });

  it('should allow access for an authenticated admin session', async () => {
    mockSession.set({ name: 'Gestão', email: 'gestao@unicap.br', role: 'gestao' });
    const result = await runGuard();
    expect(result).toBe(true);
  });

  it('should block access again after logout', async () => {
    mockSession.set({ name: 'Gestão', email: 'gestao@unicap.br', role: 'gestao' });
    mockSession.set(null);

    const result = await runGuard();
    expect((result as { toString(): string }).toString()).toContain('/login');
  });
});
