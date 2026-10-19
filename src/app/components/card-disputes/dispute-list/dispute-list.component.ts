import {DatePipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';
import {Page} from '../../../models/api.model';
import {Dispute, DisputeStatus} from '../../../models/dispute.model';
import {disputeStatusLabel} from '../../../utils/transaction-display.util';

@Component({
    selector: 'app-dispute-list',
    imports: [DatePipe],
    templateUrl: './dispute-list.component.html',
    styleUrl: './dispute-list.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisputeListComponent {
    readonly page = input.required<Page<Dispute>>();
    readonly status = input<DisputeStatus | ''>('');
    readonly selectedId = input<string | null>(null);
    readonly loading = input(false);
    readonly statusChanged = output<DisputeStatus | ''>();
    readonly pageChanged = output<number>();
    readonly disputeSelected = output<Dispute>();
    readonly statuses: DisputeStatus[] = [
        'SUBMITTED',
        'UNDER_REVIEW',
        'INFORMATION_REQUESTED',
        'INVESTIGATING',
        'RESOLVED',
        'REJECTED',
        'CLOSED',
    ];
    readonly statusLabel = disputeStatusLabel;
    readonly Math = Math;
}
