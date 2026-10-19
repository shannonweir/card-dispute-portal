import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {RouterLink} from '@angular/router';
import {DisputeSummary} from '../../models/dispute.model';

@Component({
    selector: 'app-header',
    imports: [RouterLink],
    templateUrl: './header.component.html',
    styleUrl: './header.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
    readonly summary = input.required<DisputeSummary>();
    readonly title = input('Card Dispute Portal');
    readonly description = input(
        'View your card transactions and submit disputes for any unauthorised or incorrect transactions.',
    );
    readonly eyebrow = input('');
    readonly actionLabel = input('');
    readonly actionLink = input('/card-disputes');
    readonly showNotification = input(true);
    readonly loading = input(false);
}
