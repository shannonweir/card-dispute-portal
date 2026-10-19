import {HttpErrorResponse, HttpInterceptorFn} from '@angular/common/http';
import {inject} from '@angular/core';
import {catchError, throwError} from 'rxjs';
import {environment} from '../../../environments/environment';
import {AuthService} from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
    const auth = inject(AuthService);
    const apiBaseUrl = environment.apiBaseUrl.replace(/\/$/, '');
    const targetsApi = request.url === apiBaseUrl || request.url.startsWith(`${apiBaseUrl}/`);
    const token = environment.mockAuthEnabled && targetsApi ? auth.token() : null;
    const authenticatedRequest = token
        ? request.clone({setHeaders: {Authorization: `Bearer ${token}`}})
        : request;

    return next(authenticatedRequest).pipe(
        catchError((error: HttpErrorResponse) => {
            if (
                error.status === 401 &&
                targetsApi &&
                !environment.mockAuthEnabled &&
                !environment.mockApiEnabled
            )
                auth.logout();

            return throwError(() => error);
        }),
    );
};
