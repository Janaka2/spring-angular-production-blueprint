import { TestBed } from '@angular/core/testing';
import { Router, RouterStateSnapshot, ActivatedRouteSnapshot, UrlTree } from '@angular/router';
import { signal } from '@angular/core';
import { authGuard, roleGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('auth guards', () => {
  const login = vi.fn();
  const auth = { isLoggedIn: signal(false), login, hasRole: vi.fn((r: string) => r === 'USER') };
  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/assets/42' } as RouterStateSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: auth }] });
    login.mockClear();
  });

  it('starts the login flow with the target URL when not logged in', () => {
    auth.isLoggedIn.set(false);
    const result = TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(result).toBe(false);
    expect(login).toHaveBeenCalledWith('/assets/42');
  });

  it('lets a logged-in user through', () => {
    auth.isLoggedIn.set(true);
    expect(TestBed.runInInjectionContext(() => authGuard(route, state))).toBe(true);
  });

  it('redirects to /forbidden when the role is missing', () => {
    const result = TestBed.runInInjectionContext(() => roleGuard('ADMIN')(route, state));
    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/forbidden');
    expect(TestBed.runInInjectionContext(() => roleGuard('USER')(route, state))).toBe(true);
  });
});
