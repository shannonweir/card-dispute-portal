import {inject} from '@angular/core';
import {HttpInterceptorFn} from '@angular/common/http';
import {takeUntil} from 'rxjs';
import {API_BASE_URL} from '../../services/api.config';
import {CustomerProfileService} from '../../services/customer-profile.service';

export const accountFilterInterceptor: HttpInterceptorFn = (request, next) => {
    if (
        !request.url.startsWith(`${API_BASE_URL}/`) ||
        request.url.split('?')[0] === `${API_BASE_URL}/customer`
    )
        return next(request);

    const profile = inject(CustomerProfileService);
    const accountId = profile.accountId();
    const collections = [
        `${API_BASE_URL}/transactions`,
        `${API_BASE_URL}/disputes`,
        `${API_BASE_URL}/disputes/summary`,
    ];
    const filtered =
        accountId && request.method === 'GET' && collections.includes(request.url.split('?')[0])
            ? request.clone({setParams: {accountId}})
            : request;

    return next(filtered).pipe(takeUntil(profile.changed));
};
