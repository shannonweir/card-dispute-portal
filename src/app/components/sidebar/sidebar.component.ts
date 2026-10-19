import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {CustomerProfileService} from '../../services/customer-profile.service';
import {AuthService} from '../../core/auth/auth.service';

@Component({
    selector: 'app-sidebar',
    imports: [RouterLink, RouterLinkActive],
    templateUrl: './sidebar.component.html',
    styleUrl: './sidebar.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
    readonly auth = inject(AuthService);
    private readonly profile = inject(CustomerProfileService);
    readonly displayName = computed(
        () =>
            this.profile.customer()?.displayName ?? this.auth.currentUser()?.split('@')[0] ?? 'Customer',
    );
    readonly initials = computed(() => this.displayName().slice(0, 2).toUpperCase());
}
