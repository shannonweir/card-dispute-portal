import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { DisputeDetailsComponent } from './dispute-details.component';
import { CustomerProfileService } from '../../../services/customer-profile.service';
import { customer, dispute, transaction } from '../../../testing/fixtures';

describe('Dispute details and closed history', () => {
  let fixture: ComponentFixture<DisputeDetailsComponent>;
  let root: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: CustomerProfileService, useValue: { customer: signal(customer) } }],
    });
    fixture = TestBed.createComponent(DisputeDetailsComponent);
    root = fixture.nativeElement as HTMLElement;
  });

  it('offers another dispute for an eligible transaction while displaying a closed case', () => {
    const requested = vi.fn();
    const item = transaction();
    fixture.componentInstance.disputeRequested.subscribe(requested);
    fixture.componentRef.setInput('transaction', item);
    fixture.componentRef.setInput('dispute', dispute({ status: 'CLOSED' }));
    fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('.dispute-payment')?.click();
    expect(requested).toHaveBeenCalledWith(item);
    expect(root.textContent).toContain('Closed');
  });

  it('shows submitted comments and hides creation for a transaction with a non-closed dispute', () => {
    const current = dispute();
    fixture.componentRef.setInput(
      'transaction',
      transaction({ disputeId: current.id, disputeEligible: false }),
    );
    fixture.componentRef.setInput('dispute', current);
    fixture.detectChanges();
    expect(root.querySelector('.submission-details p')?.textContent).toBe(current.details);
    expect(root.querySelector('.dispute-payment')).toBeNull();
  });

  it('explains why an unposted transaction cannot be disputed', () => {
    fixture.componentRef.setInput(
      'transaction',
      transaction({
        status: 'PENDING',
        disputeEligible: false,
        disputeIneligibilityReason: 'Only posted transactions can be disputed',
      }),
    );
    fixture.detectChanges();
    expect(root.textContent).toContain('Only posted transactions can be disputed');
    expect(root.querySelector('.dispute-payment')).toBeNull();
  });

  it('opens account history from the compact footer', () => {
    const history = vi.fn();
    fixture.componentInstance.historyRequested.subscribe(history);
    fixture.componentRef.setInput('transaction', transaction());
    fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('.history-footer button')?.click();
    expect(history).toHaveBeenCalledOnce();
    expect(root.querySelector('.history-footer')?.textContent).toContain('Includes closed cases');
  });
});
