import {ApplicationConfig, provideBrowserGlobalErrorListeners} from '@angular/core';
import {provideHttpClient, withInterceptors} from '@angular/common/http';
import {provideRouter, withComponentInputBinding} from '@angular/router';
import {authHttpInterceptorFn, provideAuth0} from '@auth0/auth0-angular';
import {routes} from './app.routes';
import {authInterceptor} from './core/auth/auth.interceptor';
import {
    MOCK_API_ENABLED,
    MOCK_AUTH_ENABLED,
    mockApiInterceptor,
} from './core/http/mock-api.interceptor';
import {accountFilterInterceptor} from './core/http/account-filter.interceptor';
import {environment} from '../environments/environment';

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideAuth0({
            domain: environment.auth0.domain,
            clientId: environment.auth0.clientId,
            authorizationParams: {
                audience: environment.auth0.audience,
                redirect_uri: environment.auth0.redirectUri,
            },
            httpInterceptor: {
                allowedList: environment.mockAuthEnabled
                    ? []
                    : [
                        {
                            uri: `${environment.apiBaseUrl}/*`,
                            tokenOptions: {
                                authorizationParams: {audience: environment.auth0.audience},
                            },
                        },
                    ],
            },
        }),
        {provide: MOCK_API_ENABLED, useValue: environment.mockApiEnabled},
        {provide: MOCK_AUTH_ENABLED, useValue: environment.mockAuthEnabled},
        provideHttpClient(
            withInterceptors([
                authInterceptor,
                accountFilterInterceptor,
                authHttpInterceptorFn,
                mockApiInterceptor,
            ]),
        ),
        provideRouter(routes, withComponentInputBinding()),
    ],
};
