import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService as Auth0Service } from '@auth0/auth0-angular';
import { firstValueFrom, isObservable, of } from 'rxjs';
import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';
import { environment } from '../../../environments/environment';

describe('Real Auth0 authentication', () => {
  const loginWithRedirect = vi.fn(() => of(undefined));
  const logout = vi.fn(() => of(undefined));

  beforeEach(() => {
    loginWithRedirect.mockClear();
    logout.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: Auth0Service,
          useValue: {
            user$: of(null),
            isAuthenticated$: of(false),
            error$: of(null),
            loginWithRedirect,
            logout,
          },
        },
      ],
    });
  });

  it('redirects login through Auth0 without posting credentials to a mock API', async () => {
    await firstValueFrom(TestBed.inject(AuthService).login('/card-disputes'));
    expect(loginWithRedirect).toHaveBeenCalledWith({ appState: { target: '/card-disputes' } });
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

  it('logs out through Auth0 with the configured return URL', () => {
    TestBed.inject(AuthService).logout();
    expect(logout).toHaveBeenCalledWith({
      logoutParams: { returnTo: environment.auth0.logoutRedirectUri },
    });
  });

  async function guardResult(authenticated: boolean) {
    TestBed.overrideProvider(AuthService, { useValue: { isAuthenticated$: of(authenticated) } });
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/card-disputes' } as RouterStateSnapshot),
    );
    if (!isObservable(result)) throw new Error('Expected an observable guard result');
    return firstValueFrom(result);
  }

  it('allows an authenticated customer to open the application', async () => {
    expect(await guardResult(true)).toBe(true);
  });

  it('redirects an unauthenticated customer to login while preserving the requested route', async () => {
    const result = await guardResult(false);
    expect(TestBed.inject(Router).serializeUrl(result as import('@angular/router').UrlTree)).toBe(
      '/login?returnUrl=%2Fcard-disputes',
    );
  });
});
