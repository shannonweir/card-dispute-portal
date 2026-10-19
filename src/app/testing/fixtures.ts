import type { CustomerProfile } from '../services/customer-profile.service';
import type { Dispute } from '../models/dispute.model';
import type { Transaction } from '../models/transaction.model';

export const customer: CustomerProfile = {
  id: 'customer-a',
  displayName: 'Test Customer',
  type: 'INDIVIDUAL',
  accounts: [
    {
      id: 'account-a',
      displayName: 'Current account',
      type: 'CURRENT',
      maskedNumber: '•••• 1234',
      currency: 'ZAR',
    },
  ],
};

export function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'transaction-a',
    accountId: 'account-a',
    customerId: customer.id,
    merchant: 'Test merchant',
    reference: 'REFERENCE-A',
    type: 'SHOPPING',
    status: 'POSTED',
    amount: { amount: 99, currency: 'ZAR' },
    occurredAt: '2026-10-18T10:00:00Z',
    cardLastFour: '1234',
    disputeEligible: true,
    disputeId: null,
    disputeIneligibilityReason: null,
    ...overrides,
  };
}

export function dispute(overrides: Partial<Dispute> = {}): Dispute {
  return {
    id: 'dispute-a',
    reference: 'DSP-TEST-A',
    transactionId: 'transaction-a',
    accountId: 'account-a',
    customerId: customer.id,
    reason: 'OTHER',
    details: 'These are my original comments.\nPlease investigate.',
    status: 'SUBMITTED',
    createdAt: '2026-10-18T10:00:00Z',
    updatedAt: '2026-10-18T10:00:00Z',
    ...overrides,
  };
}
