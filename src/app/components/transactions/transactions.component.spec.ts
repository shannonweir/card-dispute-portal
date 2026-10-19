import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TransactionsComponent } from './transactions.component';
import { CustomerProfileService } from '../../services/customer-profile.service';
import { customer, transaction } from '../../testing/fixtures';

describe('Transaction table interactions', () => {
  let fixture: ComponentFixture<TransactionsComponent>;
  let root: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CustomerProfileService,
          useValue: {
            selectedAccount: signal(customer.accounts[0]),
            accountLabel: () => 'Current account · •••• 1234',
          },
        },
      ],
    });
    fixture = TestBed.createComponent(TransactionsComponent);
    fixture.componentRef.setInput('transactionPage', {
      content: [transaction()],
      page: 0,
      size: 10,
      totalElements: 1,
      totalPages: 1,
    });
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
  });

  it('opens creation for an eligible payment without also selecting the row', () => {
    const requested = vi.fn();
    const selected = vi.fn();
    fixture.componentInstance.disputeRequested.subscribe(requested);
    fixture.componentInstance.transactionSelected.subscribe(selected);
    root.querySelector<HTMLButtonElement>('tbody button')?.click();
    expect(requested).toHaveBeenCalledWith(transaction());
    expect(selected).not.toHaveBeenCalled();
  });

  it('opens the existing case rather than requesting another dispute', () => {
    const item = transaction({ disputeId: 'active-case', disputeEligible: false });
    fixture.componentRef.setInput('transactionPage', {
      content: [item],
      page: 0,
      size: 10,
      totalElements: 1,
      totalPages: 1,
    });
    fixture.detectChanges();
    const selected = vi.fn();
    const requested = vi.fn();
    fixture.componentInstance.transactionSelected.subscribe(selected);
    fixture.componentInstance.disputeRequested.subscribe(requested);
    root.querySelector<HTMLButtonElement>('tbody button')?.click();
    expect(selected).toHaveBeenCalledWith(item);
    expect(requested).not.toHaveBeenCalled();
  });

  it('disables creation for an ineligible payment and explains why', () => {
    fixture.componentRef.setInput('transactionPage', {
      content: [
        transaction({
          status: 'PENDING',
          disputeEligible: false,
          disputeIneligibilityReason: 'Only posted transactions can be disputed',
        }),
      ],
      page: 0,
      size: 10,
      totalElements: 1,
      totalPages: 1,
    });
    fixture.detectChanges();
    const button = root.querySelector<HTMLButtonElement>('tbody button');
    expect(button?.disabled).toBe(true);
    expect(button?.title).toContain('Only posted');
  });

  it('emits the entered search text and selected transaction type', () => {
    const searched = vi.fn();
    const filtered = vi.fn();
    fixture.componentInstance.searchChanged.subscribe(searched);
    fixture.componentInstance.typeChanged.subscribe(filtered);
    const input = root.querySelector<HTMLInputElement>('input[type="search"]');
    const select = root.querySelector<HTMLSelectElement>('.type-filter select');
    if (!input || !select) throw new Error('Transaction filters missing');
    input.value = 'Merchant';
    input.dispatchEvent(new Event('input'));
    select.value = 'SHOPPING';
    select.dispatchEvent(new Event('change'));
    expect(searched).toHaveBeenCalledWith('Merchant');
    expect(filtered).toHaveBeenCalledWith('SHOPPING');
  });
});
