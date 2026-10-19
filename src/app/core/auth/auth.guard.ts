import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {map, take} from 'rxjs';
import {AuthService} from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    return auth.isAuthenticated$.pipe(
        take(1),
        map(
            (authenticated) =>
                authenticated ||
                router.createUrlTree(['/login'], {queryParams: {returnUrl: state.url}}),
        ),
    );
};
