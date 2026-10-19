import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DisputeListComponent } from './dispute-list.component';
import { dispute } from '../../../testing/fixtures';

describe('Account dispute history', () => {
  let fixture: ComponentFixture<DisputeListComponent>;
  let root: HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(DisputeListComponent);
    fixture.componentRef.setInput('page', {
      content: [dispute({ status: 'CLOSED' })],
      page: 0,
      size: 10,
      totalElements: 1,
      totalPages: 1,
    });
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
  });

  it('keeps closed cases visible and opens their original record', () => {
    const selected = vi.fn();
    fixture.componentInstance.disputeSelected.subscribe(selected);
    expect(root.querySelector('tbody')?.textContent).toContain('Closed');
    root.querySelector<HTMLButtonElement>('tbody button')?.click();
    expect(selected).toHaveBeenCalledWith(dispute({ status: 'CLOSED' }));
  });

  it('allows selecting closed cases and returning to all statuses', () => {
    const changed = vi.fn();
    fixture.componentInstance.statusChanged.subscribe(changed);
    const select = root.querySelector<HTMLSelectElement>('select');
    if (!select) throw new Error('Status filter missing');
    select.value = 'CLOSED';
    select.dispatchEvent(new Event('change'));
    select.value = '';
    select.dispatchEvent(new Event('change'));
    expect(changed.mock.calls).toEqual([['CLOSED'], ['']]);
  });

  it('prevents pagination beyond the only page', () => {
    const buttons = root.querySelectorAll<HTMLButtonElement>('footer button');
    const changed = vi.fn();
    fixture.componentInstance.pageChanged.subscribe(changed);
    expect(buttons[0]?.disabled).toBe(true);
    expect(buttons[1]?.disabled).toBe(true);
    buttons.forEach((button) => button.click());
    expect(changed).not.toHaveBeenCalled();
  });

  it('shows the empty state only when loading has finished', () => {
    fixture.componentRef.setInput('page', {
      content: [],
      page: 0,
      size: 10,
      totalElements: 0,
      totalPages: 0,
    });
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect(root.textContent).toContain('Loading disputes');
    expect(root.textContent).not.toContain('No disputes match');
    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();
    expect(root.textContent).toContain('No disputes match');
  });
});
