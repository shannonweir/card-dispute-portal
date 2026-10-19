import {computed, inject, Injectable, signal} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Subject, finalize} from 'rxjs';
import {apiErrorMessage} from '../utils/api-error.util';
import {API_BASE_URL} from './api.config';
import type {components} from '../generated/api-types';

export type CustomerProfile = components['schemas']['CustomerProfile'];

@Injectable({providedIn: 'root'})
export class CustomerProfileService {
    private readonly http = inject(HttpClient);
    readonly customer = signal<CustomerProfile | null>(null);
    readonly accountId = signal<string | null>(null);
    readonly loading = signal(false);
    readonly error = signal('');
    readonly changed = new Subject<void>();
    readonly selectedAccount = computed(
        () => this.customer()?.accounts.find((a) => a.id === this.accountId()) ?? null,
    );

    load(): void {
        this.changed.next();
        this.customer.set(null);
        this.accountId.set(null);
        this.loading.set(true);
        this.error.set('');
        this.http
            .get<CustomerProfile>(`${API_BASE_URL}/customer`)
            .pipe(finalize(() => this.loading.set(false)))
            .subscribe({
                next: (customer) => this.customer.set(customer),
                error: (response) =>
                    this.error.set(apiErrorMessage(response, 'We could not load your customer profile.')),
            });
    }

    selectAccount(id: string): void {
        const accountId = id || null;

        if (accountId === this.accountId())
            return;

        if (accountId && !this.customer()?.accounts.some((a) => a.id === accountId))
            return;
        this.accountId.set(accountId);
        this.changed.next();
    }

    accountLabel(id?: string): string {
        const account = this.customer()?.accounts.find((a) => a.id === id);

        return account ? `${account.displayName} · ${account.maskedNumber}` : 'Account';
    }
}
