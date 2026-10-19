import {Routes} from '@angular/router';
import {authGuard} from './core/auth/auth.guard';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./components/login/login.component').then((m) => m.LoginComponent),
    },
    {
        path: '',
        canActivate: [authGuard],
        loadComponent: () => import('./components/main/main.component').then((m) => m.MainComponent),
        children: [
            {path: '', pathMatch: 'full', redirectTo: 'dashboard'},
            {
                path: 'dashboard',
                loadComponent: () =>
                    import('./components/dashboard/dashboard.component').then((m) => m.DashboardComponent),
            },
            {
                path: 'card-disputes',
                loadComponent: () =>
                    import('./components/card-disputes/card-disputes.component').then(
                        (m) => m.CardDisputesComponent,
                    ),
            },
        ],
    },
    {path: '**', redirectTo: 'dashboard'},
];
