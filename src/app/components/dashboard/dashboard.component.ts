import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {DestroyRef} from '@angular/core';
import {CurrencyPipe, DatePipe} from '@angular/common';
import {HttpErrorResponse} from '@angular/common/http';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    signal,
    untracked,
} from '@angular/core';
import {RouterLink} from '@angular/router';
import {finalize, forkJoin} from 'rxjs';
import {CustomerProfileService} from '../../services/customer-profile.service';
import {apiErrorMessage} from '../../utils/api-error.util';
import {Dispute, DisputeSummary} from '../../models/dispute.model';
import {Transaction} from '../../models/transaction.model';
import {DisputeService} from '../../services/dispute.service';
import {TransactionService} from '../../services/transaction.service';
import {
    disputeStatusLabel,
    transactionTypeIcon,
    transactionTypeLabel,
} from '../../utils/transaction-display.util';
import {HeaderComponent} from '../header/header.component';

const EMPTY_SUMMARY: DisputeSummary = {
    totalTransactions: 0,
    disputesSubmitted: 0,
    inProgress: 0,
    resolved: 0,
    rejected: 0,
};

@Component({
    selector: 'app-dashboard',
    imports: [CurrencyPipe, DatePipe, RouterLink, HeaderComponent],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
    private readonly destroyRef = inject(DestroyRef);
    private readonly disputeService = inject(DisputeService);
    private readonly transactionService = inject(TransactionService);

    readonly summary = signal(EMPTY_SUMMARY);
    readonly transactions = signal<Transaction[]>([]);
    readonly disputes = signal<Dispute[]>([]);
    readonly loading = signal(true);
    readonly error = signal('');
    readonly attentionDisputes = computed(() =>
        this.disputes().filter((dispute) => dispute.status === 'INFORMATION_REQUESTED'),
    );

    readonly statusLabel = disputeStatusLabel;
    readonly typeIcon = transactionTypeIcon;
    readonly typeLabel = transactionTypeLabel;

    readonly context = inject(CustomerProfileService);

    constructor() {
        effect(() => {
            const customer = this.context.customer();
            const accountId = this.context.accountId();

            if (customer && accountId)
                untracked(() => {
                    this.summary.set(EMPTY_SUMMARY);
                    this.transactions.set([]);
                    this.disputes.set([]);
                    this.loadOverview();
                });
        });
    }

    loadOverview(): void {
        this.loading.set(true);
        this.error.set('');
        forkJoin({
            summary: this.disputeService.getDisputeSummary(),
            transactions: this.transactionService.getTransactions({page: 0, size: 5}),
            disputes: this.disputeService.getDisputes(0, 5),
        })
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loading.set(false)),
            )
            .subscribe({
                next: (result) => {
                    this.summary.set(result.summary);
                    this.transactions.set(result.transactions.content);
                    this.disputes.set(result.disputes.content);
                },
                error: (response: HttpErrorResponse) => {
                    this.error.set(apiErrorMessage(response, 'We could not load your dashboard.'));
                },
            });
    }
}
