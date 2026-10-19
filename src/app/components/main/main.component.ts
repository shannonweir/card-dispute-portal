import {ChangeDetectionStrategy, Component, inject, OnInit} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {SidebarComponent} from '../sidebar/sidebar.component';
import {CustomerProfileService} from '../../services/customer-profile.service';

@Component({
    selector: 'app-main',
    imports: [RouterOutlet, SidebarComponent],
    templateUrl: './main.component.html',
    styleUrl: './main.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainComponent implements OnInit {
    readonly accountTypeLabels = {
        CURRENT: 'Current account',
        CREDIT_CARD: 'Credit card',
        SAVINGS: 'Savings account',
    };
    readonly context = inject(CustomerProfileService);

    ngOnInit(): void {
        this.context.load();
    }
}
