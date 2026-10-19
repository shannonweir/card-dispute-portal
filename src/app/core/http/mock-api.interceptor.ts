import {
  HttpErrorResponse,
  HttpHeaders,
  HttpEvent,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import { ApiProblem, Page } from '../../models/api.model';
import { Authentication } from '../../models/authentication.model';
import {
  Dispute,
  DisputeDocument,
  DisputeReason,
  DisputeReasonOption,
  DisputeStatus,
  DisputeSummary,
  TimelineEvent,
} from '../../models/dispute.model';
import { API_BASE_URL } from '../../services/api.config';
import { Transaction, TransactionType } from '../../models/transaction.model';

export const MOCK_API_ENABLED = new InjectionToken<boolean>('MOCK_API_ENABLED');
export const MOCK_AUTH_ENABLED = new InjectionToken<boolean>('MOCK_AUTH_ENABLED');

interface CreateDisputeRequest {
  transactionId: string;
  reason: DisputeReason;
  details: string;
}

const reasons: DisputeReasonOption[] = [
  { code: 'UNAUTHORISED', label: 'Unauthorised transaction' },
  { code: 'DUPLICATE_CHARGE', label: 'Charged more than once' },
  { code: 'INCORRECT_AMOUNT', label: 'Incorrect transaction amount' },
  { code: 'GOODS_NOT_RECEIVED', label: 'Goods or services not received' },
  { code: 'REFUND_NOT_RECEIVED', label: 'Expected refund not received' },
  { code: 'OTHER', label: 'Other' },
];

const transactionSeed: Array<[string, TransactionType, number, string, string]> = [
  ['Checkers Somerset West', 'GROCERIES', 450, '2026-08-27T19:14:00+02:00', 'Somerset West, WC'],
  ['Spotify', 'ENTERTAINMENT', 59.99, '2026-08-25T11:03:00+02:00', 'Online'],
  ['Shell Helderberg', 'FUEL', 800, '2026-08-24T08:21:00+02:00', 'Helderberg, WC'],
  ['Takealot.com', 'SHOPPING', 299, '2026-08-22T16:45:00+02:00', 'Online'],
  ['Woolworths', 'GROCERIES', 320, '2026-08-20T12:17:00+02:00', 'Cape Town, WC'],
  ['Netflix', 'ENTERTAINMENT', 199, '2026-08-18T09:10:00+02:00', 'Online'],
  ['Uber Eats', 'DINING', 210, '2026-08-17T17:28:00+02:00', 'Cape Town, WC'],
  ['Dis-Chem', 'OTHER', 180, '2026-08-16T14:05:00+02:00', 'Somerset West, WC'],
  ['Booking.com', 'TRAVEL', 1250, '2026-08-15T10:11:00+02:00', 'Online'],
  ['Mr D', 'DINING', 89, '2026-08-12T19:33:00+02:00', 'Cape Town, WC'],
];

const transactionIds: string[] = [];
const disputeIds: string[] = [];

function transactionId(index: number): string {
  return (transactionIds[index] ??= crypto.randomUUID());
}

function disputeId(index: number): string {
  return (disputeIds[index] ??= crypto.randomUUID());
}

function buildTransactions(): Transaction[] {
  const featured = transactionSeed.map(
    (seed, index): Transaction => ({
      accountId: '98ae225d-446d-4b4a-b860-67ea49abafaf',
      customerId: 'f19f1d66-263f-4fd4-a3d5-1638b308e5f3',
      id: transactionId(index),
      reference: `ZA987654${String(3210 + index)}`,
      merchant: seed[0],
      merchantLocation: seed[4],
      amount: { amount: seed[2], currency: 'ZAR' },
      occurredAt: seed[3],
      type: seed[1],
      status: 'POSTED',
      cardLastFour: '1234',
      disputeEligible: ![0, 4, 7].includes(index),
      disputeIneligibilityReason: [0, 4, 7].includes(index) ? 'A dispute already exists.' : null,
      disputeId:
        index === 0 ? disputeId(0) : index === 4 ? disputeId(1) : index === 7 ? disputeId(2) : null,
    }),
  );

  const merchants = [
    'Pick n Pay',
    'Engen',
    'vida e caffè',
    'Clicks',
    'Uber',
    'Amazon',
    'Cape Union Mart',
  ];
  const types: TransactionType[] = [
    'GROCERIES',
    'FUEL',
    'DINING',
    'OTHER',
    'TRANSPORT',
    'SHOPPING',
    'SHOPPING',
  ];
  const generated = Array.from({ length: 114 }, (_, offset): Transaction => {
    const index = offset + featured.length;
    const day = 31 - (offset % 31);

    return {
      accountId: '98ae225d-446d-4b4a-b860-67ea49abafaf',
      customerId: 'f19f1d66-263f-4fd4-a3d5-1638b308e5f3',
      id: transactionId(index),
      reference: `ZA${String(9876543300 + index)}`,
      merchant: merchants[offset % merchants.length],
      merchantLocation: offset % 3 === 0 ? 'Online' : 'Cape Town, WC',
      amount: { amount: 45 + ((offset * 73) % 1450), currency: 'ZAR' },
      occurredAt: `2026-08-${String(day).padStart(2, '0')}T${String(8 + (offset % 12)).padStart(2, '0')}:15:00+02:00`,
      type: types[offset % types.length],
      status: offset % 19 === 0 ? 'PENDING' : 'POSTED',
      cardLastFour: '1234',
      disputeEligible: true,
      disputeIneligibilityReason: null,
      disputeId: null,
    };
  });

  return [...featured, ...generated];
}

@Injectable({ providedIn: 'root' })
class MockApiBackend {
  private readonly mockAuthEnabled = inject(MOCK_AUTH_ENABLED);
  private readonly transactions = buildTransactions();
  private readonly disputes: Dispute[] = [
    this.makeDispute(
      0,
      0,
      'UNAUTHORISED',
      'INFORMATION_REQUESTED',
      'I do not recognise this purchase.',
    ),
    this.makeDispute(
      1,
      4,
      'INCORRECT_AMOUNT',
      'RESOLVED',
      'The amount charged was higher than the receipt.',
    ),
    this.makeDispute(2, 7, 'GOODS_NOT_RECEIVED', 'UNDER_REVIEW', 'Part of this order was missing.'),
    this.makeDispute(
      3,
      38,
      'DUPLICATE_CHARGE',
      'INVESTIGATING',
      'This purchase was charged twice.',
    ),
    this.makeDispute(
      4,
      82,
      'REFUND_NOT_RECEIVED',
      'RESOLVED',
      'The promised merchant refund did not arrive.',
    ),
  ];
  private readonly timelines = new Map<string, TimelineEvent[]>();
  private readonly documents = new Map<string, DisputeDocument[]>();
  private readonly idempotentDisputes = new Map<string, Dispute>();

  constructor() {
    this.disputes.forEach((dispute, index) => {
      this.transactions.find((transaction) => transaction.id === dispute.transactionId)!.disputeId =
        dispute.id;
      this.transactions.find(
        (transaction) => transaction.id === dispute.transactionId,
      )!.disputeEligible = false;
      this.timelines.set(dispute.id, this.seedTimeline(dispute, index));
      this.documents.set(dispute.id, []);
    });
  }

  handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> | null {
    if (!request.url.startsWith(`${API_BASE_URL}/`)) return null;

    const url = new URL(request.urlWithParams, 'http://localhost');
    const path = url.pathname;

    if (path === '/api/v1/auth/login' && request.method === 'POST' && this.mockAuthEnabled) {
      return this.login(request);
    }

    const authorization = request.headers.get('Authorization');
    const hasValidToken = this.mockAuthEnabled
      ? authorization?.startsWith('Bearer mock-jwt-')
      : authorization?.startsWith('Bearer ');

    if (!hasValidToken) {
      return this.fail(401, 'UNAUTHORIZED', 'Authentication is required.', request.url);
    }

    // Closed cases remain in history and no longer block the transaction.
    for (const transaction of this.transactions) {
      const current = this.disputes.find(
        (dispute) => dispute.transactionId === transaction.id && dispute.status !== 'CLOSED',
      );
      transaction.disputeId = current?.id ?? null;
      transaction.disputeEligible = transaction.status === 'POSTED' && !current;
      transaction.disputeIneligibilityReason = current
        ? 'A non-closed dispute already exists for this transaction'
        : transaction.status !== 'POSTED'
          ? 'Only posted transactions can be disputed'
          : null;
    }

    if (path === '/api/v1/customer' && request.method === 'GET')
      return this.ok({
        id: 'f19f1d66-263f-4fd4-a3d5-1638b308e5f3',
        displayName: 'Shannon Weir',
        type: 'INDIVIDUAL',
        accounts: [
          {
            id: '98ae225d-446d-4b4a-b860-67ea49abafaf',
            displayName: 'Personal card account',
            type: 'CURRENT',
            maskedNumber: '•••• 1234',
            currency: 'ZAR',
          },
        ],
      });

    if (path === '/api/v1/transactions' && request.method === 'GET')
      return this.listTransactions(url);

    if (path.startsWith('/api/v1/transactions/') && request.method === 'GET') {
      const id = path.split('/').at(-1)!;
      const transaction = this.transactions.find((item) => item.id === id);

      return transaction
        ? this.ok(transaction)
        : this.fail(404, 'NOT_FOUND', 'Transaction not found.', request.url);
    }

    if (path === '/api/v1/disputes/reasons' && request.method === 'GET') return this.ok(reasons);

    if (path === '/api/v1/disputes/summary' && request.method === 'GET')
      return this.ok(this.summary());

    if (path === '/api/v1/disputes' && request.method === 'GET') return this.listDisputes(url);

    if (path === '/api/v1/disputes' && request.method === 'POST')
      return this.createDispute(request);

    const timelineMatch = path.match(/^\/api\/v1\/disputes\/([^/]+)\/timeline$/);

    if (timelineMatch && request.method === 'GET') {
      const timeline = this.timelines.get(timelineMatch[1]);

      return timeline
        ? this.ok(timeline)
        : this.fail(404, 'NOT_FOUND', 'Dispute not found.', request.url);
    }

    const documentsMatch = path.match(/^\/api\/v1\/disputes\/([^/]+)\/documents$/);

    if (documentsMatch && request.method === 'GET') {
      const documents = this.documents.get(documentsMatch[1]);

      return documents
        ? this.ok(documents)
        : this.fail(404, 'NOT_FOUND', 'Dispute not found.', request.url);
    }

    if (documentsMatch && request.method === 'POST')
      return this.uploadDocument(documentsMatch[1], request);

    const disputeMatch = path.match(/^\/api\/v1\/disputes\/([^/]+)$/);

    if (disputeMatch && request.method === 'GET') {
      const dispute = this.disputes.find((item) => item.id === disputeMatch[1]);

      return dispute
        ? this.ok(dispute)
        : this.fail(404, 'NOT_FOUND', 'Dispute not found.', request.url);
    }

    return this.fail(404, 'NOT_FOUND', 'Mock endpoint not found.', request.url);
  }

  private login(request: HttpRequest<unknown>): Observable<HttpEvent<Authentication>> {
    const credentials = request.body as { email?: string; password?: string };

    if (credentials.email !== 'alex@example.com' || credentials.password !== 'Welcome123!') {
      return this.fail(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.', request.url);
    }

    return this.ok({
      accessToken: `mock-jwt-${crypto.randomUUID()}`,
      tokenType: 'Bearer',
      expiresIn: 3600,
    });
  }

  private listTransactions(url: URL): Observable<HttpEvent<Page<Transaction>>> {
    const page = Math.max(0, Number(url.searchParams.get('page') ?? 0));
    const size = Math.min(100, Math.max(1, Number(url.searchParams.get('size') ?? 20)));
    const search = (url.searchParams.get('search') ?? '').trim().toLowerCase();
    const type = url.searchParams.get('type');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const filtered = this.transactions.filter((transaction) => {
      const date = transaction.occurredAt.slice(0, 10);

      return (
        (!search ||
          `${transaction.merchant} ${transaction.reference} ${transaction.amount.amount}`
            .toLowerCase()
            .includes(search)) &&
        (!type || transaction.type === type) &&
        (!from || date >= from) &&
        (!to || date <= to)
      );
    });

    return this.ok(this.page(filtered, page, size));
  }

  private listDisputes(url: URL): Observable<HttpEvent<Page<Dispute>>> {
    const page = Math.max(0, Number(url.searchParams.get('page') ?? 0));
    const size = Math.min(100, Math.max(1, Number(url.searchParams.get('size') ?? 20)));
    const status = url.searchParams.get('status');
    const filtered = status
      ? this.disputes.filter((dispute) => dispute.status === status)
      : this.disputes;

    return this.ok(this.page(filtered, page, size));
  }

  private createDispute(request: HttpRequest<unknown>): Observable<HttpEvent<Dispute>> {
    if (!request.headers.has('Idempotency-Key')) {
      return this.fail(
        400,
        'IDEMPOTENCY_KEY_REQUIRED',
        'An Idempotency-Key header is required.',
        request.url,
      );
    }

    const key = request.headers.get('Idempotency-Key')!;
    const existing = this.idempotentDisputes.get(key);
    const body = request.body as CreateDisputeRequest;

    if (existing) {
      if (
        existing.transactionId !== body.transactionId ||
        existing.reason !== body.reason ||
        existing.details.trim() !== body.details.trim()
      ) {
        return this.fail(
          409,
          'CONFLICT',
          'Idempotency-Key was already used for a different request',
          request.url,
        );
      }

      return this.ok(existing);
    }

    const transaction = this.transactions.find((item) => item.id === body.transactionId);

    if (!transaction) return this.fail(404, 'NOT_FOUND', 'Transaction not found.', request.url);

    if (!transaction.disputeEligible || transaction.disputeId) {
      return this.fail(
        409,
        'DUPLICATE_DISPUTE',
        'A dispute already exists for this transaction.',
        request.url,
      );
    }

    if (!reasons.some((reason) => reason.code === body.reason) || body.details.trim().length < 10) {
      return this.fail(
        400,
        'VALIDATION_ERROR',
        'Select a reason and provide at least 10 characters.',
        request.url,
      );
    }

    const now = new Date().toISOString();
    const dispute: Dispute = {
      accountId: transaction.accountId,
      customerId: transaction.customerId,
      id: crypto.randomUUID(),
      reference: `DSP-2026-${String(this.disputes.length + 1).padStart(6, '0')}`,
      transactionId: transaction.id,
      reason: body.reason,
      details: body.details.trim(),
      status: 'SUBMITTED',
      createdAt: now,
      updatedAt: now,
    };

    this.idempotentDisputes.set(key, dispute);
    this.disputes.unshift(dispute);
    transaction.disputeEligible = false;
    transaction.disputeId = dispute.id;
    transaction.disputeIneligibilityReason = 'A dispute already exists.';
    this.timelines.set(dispute.id, [
      {
        id: crypto.randomUUID(),
        status: 'SUBMITTED',
        title: 'Dispute submitted',
        description: 'Your dispute has been submitted successfully.',
        occurredAt: now,
        actionRequired: false,
      },
    ]);
    this.documents.set(dispute.id, []);

    return this.ok(dispute, 201);
  }

  private uploadDocument(
    disputeIdValue: string,
    request: HttpRequest<unknown>,
  ): Observable<HttpEvent<DisputeDocument>> {
    const collection = this.documents.get(disputeIdValue);

    if (!collection) return this.fail(404, 'NOT_FOUND', 'Dispute not found.', request.url);

    const file = request.body instanceof FormData ? request.body.get('file') : null;

    if (!(file instanceof File))
      return this.fail(400, 'VALIDATION_ERROR', 'A file is required.', request.url);

    if (file.size > 5 * 1024 * 1024)
      return this.fail(413, 'PAYLOAD_TOO_LARGE', 'Files must be 5 MB or smaller.', request.url);

    if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) {
      return this.fail(
        415,
        'UNSUPPORTED_MEDIA_TYPE',
        'Only PDF, PNG, and JPEG files are supported.',
        request.url,
      );
    }

    const document: DisputeDocument = {
      id: crypto.randomUUID(),
      fileName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
    };

    collection.push(document);

    return this.ok(document, 201);
  }

  private summary(): DisputeSummary {
    return {
      totalTransactions: this.transactions.length,
      disputesSubmitted: this.disputes.length,
      inProgress: this.disputes.filter((item) =>
        ['SUBMITTED', 'UNDER_REVIEW', 'INFORMATION_REQUESTED', 'INVESTIGATING'].includes(
          item.status,
        ),
      ).length,
      resolved: this.disputes.filter((item) => ['RESOLVED', 'CLOSED'].includes(item.status)).length,
      rejected: this.disputes.filter((item) => item.status === 'REJECTED').length,
    };
  }

  private makeDispute(
    index: number,
    transactionIndex: number,
    reason: DisputeReason,
    status: DisputeStatus,
    details: string,
  ): Dispute {
    return {
      accountId: '98ae225d-446d-4b4a-b860-67ea49abafaf',
      customerId: 'f19f1d66-263f-4fd4-a3d5-1638b308e5f3',
      id: disputeId(index),
      reference: `DSP-2026-${String(index + 123).padStart(6, '0')}`,
      transactionId: transactionId(transactionIndex),
      reason,
      details,
      status,
      createdAt: `2026-08-${String(27 - index * 3).padStart(2, '0')}T19:25:00+02:00`,
      updatedAt: `2026-08-${String(29 - index * 2).padStart(2, '0')}T14:36:00+02:00`,
      resolvedAt:
        status === 'RESOLVED'
          ? `2026-08-${String(30 - index).padStart(2, '0')}T10:00:00+02:00`
          : null,
      resolutionNote:
        status === 'RESOLVED' ? 'The disputed amount was credited to your account.' : null,
    };
  }

  private seedTimeline(dispute: Dispute, index: number): TimelineEvent[] {
    const events: TimelineEvent[] = [
      {
        id: crypto.randomUUID(),
        status: 'SUBMITTED',
        title: 'Dispute submitted',
        description: 'Your dispute has been submitted successfully.',
        occurredAt: dispute.createdAt,
      },
      {
        id: crypto.randomUUID(),
        status: 'UNDER_REVIEW',
        title: 'Under review',
        description: 'Our team is reviewing your dispute and may request additional information.',
        occurredAt: `2026-08-${String(28 - index * 2).padStart(2, '0')}T09:12:00+02:00`,
      },
    ];

    if (dispute.status === 'INFORMATION_REQUESTED')
      events.push({
        id: crypto.randomUUID(),
        status: 'INFORMATION_REQUESTED',
        title: 'Information requested',
        description: 'We have requested additional supporting documents.',
        occurredAt: dispute.updatedAt,
        actionRequired: true,
      });

    if (dispute.status === 'INVESTIGATING')
      events.push({
        id: crypto.randomUUID(),
        status: 'INVESTIGATING',
        title: 'Investigation in progress',
        description: 'We are investigating the transaction with the merchant.',
        occurredAt: dispute.updatedAt,
      });

    if (dispute.status === 'RESOLVED')
      events.push({
        id: crypto.randomUUID(),
        status: 'RESOLVED',
        title: 'Resolved',
        description: dispute.resolutionNote ?? 'The dispute was resolved.',
        occurredAt: dispute.resolvedAt ?? dispute.updatedAt,
      });

    return events;
  }

  private page<T>(items: T[], page: number, size: number): Page<T> {
    return {
      content: items.slice(page * size, (page + 1) * size),
      page,
      size,
      totalElements: items.length,
      totalPages: Math.max(1, Math.ceil(items.length / size)),
    };
  }

  private ok<T>(body: T, status = 200): Observable<HttpEvent<T>> {
    return of(new HttpResponse({ body, status })).pipe(delay(180));
  }

  private fail(status: number, code: string, message: string, url: string): Observable<never> {
    const titles: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      413: 'Content Too Large',
      415: 'Unsupported Media Type',
      422: 'Unprocessable Content',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
    };
    const error: ApiProblem = {
      type: 'about:blank',
      title: titles[status] ?? 'Request failed',
      status,
      detail: message,
      instance: new URL(url, 'http://localhost').pathname,
      code,
    };

    return throwError(
      () =>
        new HttpErrorResponse({
          status,
          error,
          url,
          headers: new HttpHeaders({ 'Content-Type': 'application/problem+json' }),
        }),
    );
  }
}

export const mockApiInterceptor: HttpInterceptorFn = (request, next) => {
  if (!inject(MOCK_API_ENABLED)) return next(request);

  return inject(MockApiBackend).handle(request) ?? next(request);
};
