import {Injectable, inject} from '@angular/core';
import {Observable, defer, from, switchMap, tap} from 'rxjs';
import {Dispute, DisputeReason} from '../models/dispute.model';
import {DisputeService} from './dispute.service';

/** Retains one key for an unconfirmed submission, including across page reloads. */
@Injectable({providedIn: 'root'})
export class DisputeSubmissionService {
    private readonly disputes = inject(DisputeService);
    private readonly pending = new Map<string, string>();
    private readonly prefix = 'card-dispute.pending.';

    create(
        customerId: string,
        transactionId: string,
        reason: DisputeReason,
        details: string,
    ): Observable<Dispute> {
        const normalizedDetails = details.trim();

        return defer(() =>
            from(this.fingerprint(customerId, transactionId, reason, normalizedDetails)),
        ).pipe(
            switchMap((fingerprint) => {
                const key = this.keyFor(fingerprint);

                return this.disputes.createDispute(transactionId, reason, normalizedDetails, key).pipe(
                    // Creation is confirmed before any optional document upload starts.
                    tap(() => this.complete(fingerprint)),
                );
            }),
        );
    }

    private async fingerprint(
        customerId: string,
        transactionId: string,
        reason: DisputeReason,
        details: string,
    ): Promise<string> {
        // Persist a digest, never the customer's dispute narrative or access token.
        const payload = new TextEncoder().encode(
            JSON.stringify([customerId, transactionId, reason, details]),
        );
        const digest = await crypto.subtle.digest('SHA-256', payload);

        return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(
            '',
        );
    }

    private keyFor(fingerprint: string): string {
        const cached = this.pending.get(fingerprint);

        if (cached) return cached;

        let stored: string | null = null;

        try {
            stored = sessionStorage.getItem(this.prefix + fingerprint);
        } catch {
            /* In-memory retries still work if storage is unavailable. */
        }

        const key =
            stored &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(stored)
                ? stored
                : crypto.randomUUID();

        this.pending.set(fingerprint, key);
        try {
            sessionStorage.setItem(this.prefix + fingerprint, key);
        } catch {
            /* Retain the in-memory key. */
        }

        return key;
    }

    private complete(fingerprint: string): void {
        this.pending.delete(fingerprint);
        try {
            sessionStorage.removeItem(this.prefix + fingerprint);
        } catch {
            /* Response is already confirmed. */
        }
    }
}
