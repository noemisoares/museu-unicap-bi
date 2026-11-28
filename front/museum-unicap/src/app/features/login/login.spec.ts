import { TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { provideRouter } from '@angular/router';
import { Component, signal } from '@angular/core';
import { vi } from 'vitest';
import { Login } from './login';
import { AuthService } from '../../core/services/auth.service';
import { AuthSession } from '../../core/models/auth.models';
import { setInputValue, settle, submitForm } from '../../testing/dom-helpers';

@Component({ template: '' })
class AdminDashboardStub {}

describe('Login', () => {
  let authServiceMock: {
    login: ReturnType<typeof vi.fn>;
    session: ReturnType<typeof signal<AuthSession | null>>;
  };
  let location: Location;

  const setup = async () => {
    const fixture = TestBed.createComponent(Login);
    await settle(fixture);
    return { fixture, element: fixture.nativeElement as HTMLElement };
  };

  beforeEach(async () => {
    authServiceMock = {
      login: vi.fn(),
      session: signal<AuthSession | null>(null),
    };
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([{ path: 'admin/dashboard', component: AdminDashboardStub }]),
        { provide: AuthService, useValue: authServiceMock },
      ],
    });
    location = TestBed.inject(Location);
  });

  it('should require credentials before submitting', async () => {
    const { fixture, element } = await setup();

    submitForm(element);
    await settle(fixture);

    expect(element.textContent).toContain('Informe seu e-mail institucional ou matrícula.');
    expect(authServiceMock.login).not.toHaveBeenCalled();
  });

  it('should navigate to the dashboard after a successful login', async () => {
    authServiceMock.login.mockResolvedValue({
      name: 'Curadoria & Mediação',
      email: 'curadoria.arte@unicap.br',
      role: 'gestao',
    });

    const { fixture, element } = await setup();

    setInputValue(element, 'identifier', 'curadoria.arte@unicap.br');
    setInputValue(element, 'password', 'unicap2026');
    submitForm(element);
    await settle(fixture);

    expect(authServiceMock.login).toHaveBeenCalledWith({
      identifier: 'curadoria.arte@unicap.br',
      password: 'unicap2026',
    });
    expect(location.path()).toBe('/admin/dashboard');
  });

  it('should show the server message and stay on the page after invalid credentials', async () => {
    authServiceMock.login.mockRejectedValue(new Error('Credenciais inválidas.'));

    const { fixture, element } = await setup();

    setInputValue(element, 'identifier', 'curadoria.arte@unicap.br');
    setInputValue(element, 'password', 'errada');
    submitForm(element);
    await settle(fixture);

    expect(element.textContent).toContain('Credenciais inválidas.');
    expect(location.path()).toBe('');
  });
});
