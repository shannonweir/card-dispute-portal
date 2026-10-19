import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CustomerProfileService } from './customer-profile.service';
import { API_BASE_URL } from './api.config';
import { customer } from '../testing/fixtures';

describe('Customer profile and account selection', () => {
  let service: CustomerProfileService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CustomerProfileService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the current customer without sending a caller-selected customer ID', () => {
    service.load();
    const request = http.expectOne(`${API_BASE_URL}/customer`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush(customer);
    expect(service.customer()).toEqual(customer);
    expect(service.accountId()).toBeNull();
    expect(service.loading()).toBe(false);
  });

  it('clears the previous profile and displays a backend error when reloading fails', () => {
    service.customer.set(customer);
    service.accountId.set('account-a');
    service.load();
    expect(service.customer()).toBeNull();
    expect(service.accountId()).toBeNull();
    http
      .expectOne(`${API_BASE_URL}/customer`)
      .flush(
        { detail: 'Login is not linked to a customer' },
        { status: 403, statusText: 'Forbidden' },
      );
    expect(service.error()).toBe('Login is not linked to a customer');
    expect(service.loading()).toBe(false);
  });

  it('rejects an account outside the loaded customer without emitting a context change', () => {
    service.customer.set(customer);
    const changed = vi.fn();
    service.changed.subscribe(changed);
    service.selectAccount('someone-elses-account');
    expect(service.accountId()).toBeNull();
    expect(changed).not.toHaveBeenCalled();
  });

  it('emits only real selection changes and can return to the account picker', () => {
    service.customer.set(customer);
    const changed = vi.fn();
    service.changed.subscribe(changed);
    service.selectAccount('account-a');
    service.selectAccount('account-a');
    expect(service.selectedAccount()?.id).toBe('account-a');
    expect(changed).toHaveBeenCalledTimes(1);
    service.selectAccount('');
    expect(service.selectedAccount()).toBeNull();
    expect(changed).toHaveBeenCalledTimes(2);
  });
});
