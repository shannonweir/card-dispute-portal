import {CurrencyPipe, DatePipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, inject, input, output} from '@angular/core';
import {Dispute, TimelineEvent} from '../../../models/dispute.model';
import {Transaction} from '../../../models/transaction.model';
import {CustomerProfileService} from '../../../services/customer-profile.service';
import {
    disputeStatusLabel,
    transactionTypeIcon,
    transactionTypeLabel,
} from '../../../utils/transaction-display.util';

@Component({
    selector: 'app-dispute-details',
    imports: [CurrencyPipe, DatePipe],
    templateUrl: './dispute-details.component.html',
    styleUrl: './dispute-details.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisputeDetailsComponent {
    private readonly profile = inject(CustomerProfileService);
    readonly transaction = input<Transaction | null>(null);
    readonly dispute = input<Dispute | null>(null);
    readonly timeline = input<TimelineEvent[]>([]);
    readonly loading = input(false);
    readonly error = input('');
    readonly busy = input(false);
    readonly selectionCleared = output<void>();
    readonly disputeRequested = output<Transaction>();
    readonly documentsRequested = output<void>();
    readonly refreshRequested = output<void>();
    readonly historyRequested = output<void>();
    readonly statusLabel = disputeStatusLabel;
    readonly typeLabel = transactionTypeLabel;
    readonly typeIcon = transactionTypeIcon;
    readonly accountType = computed(() => {
        const type = this.profile
            .customer()
            ?.accounts.find((account) => account.id === this.transaction()?.accountId)?.type;

        return type
            ? {
                CURRENT: 'Current account',
                CREDIT_CARD: 'Credit card account',
                SAVINGS: 'Savings account',
            }[type]
            : 'Not available';
    });
    readonly transactionStatus = computed(() => {
        const status = this.transaction()?.status;

        return status ? {POSTED: 'Posted', PENDING: 'Pending', REVERSED: 'Reversed'}[status] : '';
    });
}
