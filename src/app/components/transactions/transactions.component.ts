import {CurrencyPipe, DatePipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, inject, input, output} from '@angular/core';
import {CustomerProfileService} from '../../services/customer-profile.service';
import {Page} from '../../models/api.model';
import {Transaction, TransactionType} from '../../models/transaction.model';
import {
    disputeStatusLabel,
    TRANSACTION_TYPES,
    transactionTypeIcon,
    transactionTypeLabel,
} from '../../utils/transaction-display.util';

@Component({
    selector: 'app-transactions',
    imports: [CurrencyPipe, DatePipe],
    templateUrl: './transactions.component.html',
    styleUrl: './transactions.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsComponent {
    readonly context = inject(CustomerProfileService);
    readonly transactionPage = input.required<Page<Transaction>>();
    readonly query = input('');
    readonly typeFilter = input<TransactionType | ''>('');
    readonly selectedTransactionId = input<string | null>(null);
    readonly loading = input(false);

    readonly transactionSelected = output<Transaction>();
    readonly disputeRequested = output<Transaction>();
    readonly searchChanged = output<string>();
    readonly typeChanged = output<TransactionType | ''>();
    readonly pageChanged = output<number>();

    readonly transactionTypes = TRANSACTION_TYPES;
    readonly Math = Math;
    readonly typeLabel = transactionTypeLabel;
    readonly typeIcon = transactionTypeIcon;

    visiblePages(): number[] {
        const total = this.transactionPage().totalPages;
        const current = this.transactionPage().page;
        const start = Math.max(0, Math.min(current - 2, total - 5));

        return Array.from({length: Math.min(5, total)}, (_, index) => start + index);
    }

    requestAction(transaction: Transaction): void {
        if (transaction.disputeId) this.transactionSelected.emit(transaction);
        else this.disputeRequested.emit(transaction);
    }
}
