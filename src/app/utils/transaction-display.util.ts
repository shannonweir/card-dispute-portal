import {DisputeStatus} from '../models/dispute.model';
import {TransactionType} from '../models/transaction.model';

export const TRANSACTION_TYPES: Array<{ value: TransactionType | ''; label: string }> = [
    {value: '', label: 'All transaction types'},
    {value: 'GROCERIES', label: 'Groceries'},
    {value: 'TRANSPORT', label: 'Transport'},
    {value: 'ENTERTAINMENT', label: 'Entertainment'},
    {value: 'FUEL', label: 'Fuel'},
    {value: 'SHOPPING', label: 'Shopping'},
    {value: 'DINING', label: 'Food & dining'},
    {value: 'TRAVEL', label: 'Travel'},
    {value: 'OTHER', label: 'Other'},
];

export function disputeStatusLabel(status: DisputeStatus): string {
    const labels: Record<DisputeStatus, string> = {
        SUBMITTED: 'Dispute submitted',
        UNDER_REVIEW: 'In progress',
        INFORMATION_REQUESTED: 'Information requested',
        INVESTIGATING: 'In progress',
        RESOLVED: 'Resolved',
        REJECTED: 'Rejected',
        CLOSED: 'Closed',
    };

    return labels[status];
}

export function transactionTypeLabel(type: TransactionType): string {
    return TRANSACTION_TYPES.find((option) => option.value === type)?.label ?? type;
}

export function transactionTypeIcon(type: TransactionType): string {
    const icons: Record<TransactionType, string> = {
        GROCERIES: '🛒',
        TRANSPORT: '🚕',
        ENTERTAINMENT: '♫',
        FUEL: '⛽',
        SHOPPING: '▣',
        DINING: '♜',
        TRAVEL: '▰',
        OTHER: '✦',
    };

    return icons[type];
}
