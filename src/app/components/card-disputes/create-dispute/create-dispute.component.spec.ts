import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateDisputeComponent } from './create-dispute.component';
import { transaction } from '../../../testing/fixtures';

describe('Dispute form submission', () => {
  let fixture: ComponentFixture<CreateDisputeComponent>;
  let root: HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateDisputeComponent);
    fixture.componentRef.setInput('transaction', transaction());
    fixture.componentRef.setInput('reasons', [{ code: 'OTHER', label: 'Other' }]);
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
  });

  function submitButton(): HTMLButtonElement {
    const button = root.querySelector<HTMLButtonElement>('.drawer-actions button:last-child');
    if (!button) throw new Error('Submit button was not rendered');
    return button;
  }

  it('submits a valid form from the visible footer button and trims comments', () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    fixture.componentInstance.disputeForm.setValue({
      reason: 'OTHER',
      details: '  My payment was incorrect.  ',
    });
    submitButton().click();
    expect(submitted).toHaveBeenCalledWith({
      reason: 'OTHER',
      details: 'My payment was incorrect.',
      file: null,
    });
  });

  it('shows a visible validation message instead of silently ignoring an empty form', () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    submitButton().click();
    fixture.detectChanges();
    expect(submitted).not.toHaveBeenCalled();
    expect(root.querySelector('.submit-error')?.textContent).toContain('Choose a dispute reason');
  });

  it('rejects comments that meet the length limit only through whitespace padding', () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    fixture.componentInstance.disputeForm.setValue({
      reason: 'OTHER',
      details: '       short       ',
    });
    submitButton().click();
    fixture.detectChanges();
    expect(submitted).not.toHaveBeenCalled();
    expect(root.querySelector('.submit-error')?.textContent).toContain('10');
  });

  it('prevents another submission while the original request is saving', () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    fixture.componentInstance.disputeForm.setValue({
      reason: 'OTHER',
      details: 'My payment was incorrect.',
    });
    fixture.componentRef.setInput('saving', true);
    fixture.detectChanges();
    expect(submitButton().disabled).toBe(true);
    submitButton().click();
    fixture.componentInstance.submit();
    expect(submitted).not.toHaveBeenCalled();
  });
});
