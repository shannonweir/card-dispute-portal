import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {finalize, take} from 'rxjs';
import {AuthService} from '../../core/auth/auth.service';
import {HttpErrorResponse} from '@angular/common/http';
import {apiErrorMessage} from '../../utils/api-error.util';

@Component({
    selector: 'app-login',
    imports: [ReactiveFormsModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
    private readonly fb = inject(FormBuilder);
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    readonly loading = signal(false);
    readonly error = signal('');
    readonly showPassword = signal(false);
    readonly form = this.fb.nonNullable.group({
        email: ['alex@example.com', [Validators.required, Validators.email]],
        password: ['Welcome123!', [Validators.required, Validators.minLength(8)]],
    });
    readonly mockMode = this.auth.mockMode;

    constructor() {
        if (!this.mockMode) {
            this.auth.authenticationError$.pipe(take(1)).subscribe((error) => {
                this.error.set(error.message || 'Auth0 could not complete secure sign-in.');
            });
        }
        this.auth.isAuthenticated$.pipe(take(1)).subscribe((authenticated) => {
            if (authenticated)
                void this.router.navigate(['/dashboard']);
        });
    }

    submit(): void {
        if (this.loading()) return;

        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';

        if (!this.mockMode) {
            this.error.set('');
            this.loading.set(true);
            this.auth
                .login(returnUrl)
                .pipe(finalize(() => this.loading.set(false)))
                .subscribe({
                    error: () => this.error.set('We could not start secure sign-in. Please try again.'),
                });

            return;
        }

        if (this.form.invalid) {
            this.form.markAllAsTouched();

            return;
        }
        this.error.set('');
        this.loading.set(true);

        const {email, password} = this.form.getRawValue();

        this.auth
            .loginWithMockCredentials(email, password)
            .pipe(finalize(() => this.loading.set(false)))
            .subscribe({
                next: () => void this.router.navigateByUrl(returnUrl),
                error: (response: HttpErrorResponse) => {
                    this.error.set(apiErrorMessage(response, 'We could not sign you in. Please try again.'));
                },
            });
    }
}
