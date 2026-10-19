import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { DisputeSubmissionService } from './dispute-submission.service';
import { DisputeService } from './dispute.service';
import { dispute } from '../testing/fixtures';

describe('Dispute idempotency and new cases', () => {
  const createDispute = vi.fn<DisputeService['createDispute']>();
  let service: DisputeSubmissionService;

  beforeEach(() => {
    sessionStorage.clear();
    createDispute.mockReset();
    TestBed.configureTestingModule({
      providers: [{ provide: DisputeService, useValue: { createDispute } }],
    });
    service = TestBed.inject(DisputeSubmissionService);
  });

  function create(details = 'My payment was incorrect.') {
    return firstValueFrom(service.create('customer-a', 'transaction-a', 'OTHER', details));
  }

  it('reuses the original key when a request fails and the same trimmed payload is retried', async () => {
    createDispute.mockReturnValue(throwError(() => new Error('Connection lost')));
    await expect(create()).rejects.toThrow('Connection lost');
    await expect(create('  My payment was incorrect.  ')).rejects.toThrow('Connection lost');
    expect(createDispute.mock.calls[1]?.[3]).toBe(createDispute.mock.calls[0]?.[3]);
    expect(createDispute.mock.calls[1]?.[2]).toBe('My payment was incorrect.');
  });

  it('uses a different key when the customer changes the dispute details', async () => {
    createDispute.mockReturnValue(throwError(() => new Error('Connection lost')));
    await expect(create()).rejects.toThrow();
    await expect(create('A different payment explanation.')).rejects.toThrow();
    expect(createDispute.mock.calls[1]?.[3]).not.toBe(createDispute.mock.calls[0]?.[3]);
  });

  it('restores an unconfirmed key after the service is recreated without storing the narrative', async () => {
    createDispute.mockReturnValue(throwError(() => new Error('Connection lost')));
    await expect(create()).rejects.toThrow();
    const originalKey = createDispute.mock.calls[0]?.[3];
    service = TestBed.runInInjectionContext(() => new DisputeSubmissionService());
    await expect(create()).rejects.toThrow();
    expect(createDispute.mock.calls[1]?.[3]).toBe(originalKey);
    expect(JSON.stringify(sessionStorage)).not.toContain('My payment was incorrect');
  });

  it('clears a confirmed key so a later new case cannot replay the old dispute', async () => {
    createDispute.mockReturnValue(of(dispute()));
    await create();
    const originalKey = createDispute.mock.calls[0]?.[3];
    expect(sessionStorage.length).toBe(0);
    createDispute.mockReturnValue(of(dispute({ id: 'dispute-b' })));
    expect((await create()).id).toBe('dispute-b');
    expect(createDispute.mock.calls[1]?.[3]).not.toBe(originalKey);
  });
});
