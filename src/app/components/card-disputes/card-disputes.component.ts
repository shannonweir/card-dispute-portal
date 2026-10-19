import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {HeaderComponent} from '../header/header.component';
import {TransactionsComponent} from '../transactions/transactions.component';
import {CreateDisputeComponent} from './create-dispute/create-dispute.component';
import {DisputeDetailsComponent} from './dispute-details/dispute-details.component';
import {DisputeListComponent} from './dispute-list/dispute-list.component';
import {DisputeDocumentsComponent} from './dispute-documents/dispute-documents.component';
import {CardDisputesFacade} from './card-disputes.facade';

@Component({
    selector: 'app-card-disputes',
    imports: [
        HeaderComponent,
        TransactionsComponent,
        DisputeDetailsComponent,
        CreateDisputeComponent,
        DisputeListComponent,
        DisputeDocumentsComponent,
    ],
    providers: [CardDisputesFacade],
    templateUrl: './card-disputes.component.html',
    styleUrl: './card-disputes.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardDisputesComponent {
    readonly facade = inject(CardDisputesFacade);
}
