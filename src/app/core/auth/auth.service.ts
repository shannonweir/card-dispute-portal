import {HttpClient} from '@angular/common/http';
import {computed, inject, Injectable, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {Router} from '@angular/router';
import {AuthService as Auth0Service} from '@auth0/auth0-angular';
import {Observable, of, tap} from 'rxjs';
import {environment} from '../../../environments/environment';
import {Authentication} from '../../models/authentication.model';

interface Session {
    accessToken: string;
    expiresAt: string;
    customerEmail: string;
}

const SESSION_KEY = 'card-dispute-session';

@Injectable({providedIn: 'root'})
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);
    private readonly auth0 = inject(Auth0Service);
    private readonly session = signal<Session | null>(
        environment.mockAuthEnabled ? this.restoreSession() : null,
    );
    private readonly auth0User = toSignal(this.auth0.user$, {initialValue: null});
    private readonly auth0Authenticated = toSignal(this.auth0.isAuthenticated$, {
        initialValue: false,
    });

    readonly mockMode = environment.mockAuthEnabled;
    readonly authenticationError$ = this.auth0.error$;
    readonly currentUser = computed(() =>
        this.mockMode
            ? (this.session()?.customerEmail ?? null)
            : (this.auth0User()?.name ?? this.auth0User()?.email ?? this.auth0User()?.sub ?? null),
    );
    readonly token = computed(() => (this.mockMode ? (this.session()?.accessToken ?? null) : null));
    readonly isAuthenticated = computed(() =>
        this.mockMode ? this.hasValidMockSession() : this.auth0Authenticated(),
    );

    get isAuthenticated$(): Observable<boolean> {
        return this.mockMode ? of(this.hasValidMockSession()) : this.auth0.isAuthenticated$;
    }

    login(returnUrl = '/dashboard'): Observable<void> {
        return this.auth0.loginWithRedirect({appState: {target: returnUrl}});
    }

    loginWithMockCredentials(email: string, password: string): Observable<Authentication> {
        return this.http
            .post<Authentication>(`${environment.apiBaseUrl}/auth/login`, {email, password})
            .pipe(
                tap((authentication) => {
                    const session: Session = {
                        accessToken: authentication.accessToken,
                        expiresAt: new Date(Date.now() + authentication.expiresIn * 1000).toISOString(),
                        customerEmail: email,
                    };

                    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
                    this.session.set(session);
                }),
            );
    }

    logout(): void {
        if (this.mockMode) {
            sessionStorage.removeItem(SESSION_KEY);
            this.session.set(null);
            void this.router.navigate(['/login']);

            return;
        }
        this.auth0
            .logout({logoutParams: {returnTo: environment.auth0.logoutRedirectUri}})
            .subscribe();
    }

    private hasValidMockSession(): boolean {
        const expiresAt = this.session()?.expiresAt;

        return !!expiresAt && new Date(expiresAt).getTime() > Date.now();
    }

    private restoreSession(): Session | null {
        try {
            const raw = sessionStorage.getItem(SESSION_KEY);

            if (!raw) return null;

            const session = JSON.parse(raw) as Session;

            if (new Date(session.expiresAt).getTime() <= Date.now()) {
                sessionStorage.removeItem(SESSION_KEY);

                return null;
            }

            return session;
        } catch {
            sessionStorage.removeItem(SESSION_KEY);

            return null;
        }
    }
}
