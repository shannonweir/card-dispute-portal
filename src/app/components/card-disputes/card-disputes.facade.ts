import { DestroyRef, Injectable, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import {
  EMPTY,
  Subject,
  catchError,
  defer,
  finalize,
  forkJoin,
  map,
  merge,
  of,
  switchMap,
  takeUntil,
  tap,
  timer,
} from 'rxjs';
import { Page } from '../../models/api.model';
import {
  Dispute,
  DisputeReasonOption,
  DisputeStatus,
  DisputeSummary,
  TimelineEvent,
} from '../../models/dispute.model';
import { Transaction, TransactionType } from '../../models/transaction.model';
import { CustomerProfileService } from '../../services/customer-profile.service';
import { DisputeService } from '../../services/dispute.service';
import { TransactionService } from '../../services/transaction.service';
import { DisputeSubmission } from './dispute-submission.model';
import { apiErrorMessage } from '../../utils/api-error.util';
import { DisputeSubmissionService } from '../../services/dispute-submission.service';

const emptyPage = <T>(): Page<T> => ({
  content: [],
  page: 0,
  size: 10,
  totalElements: 0,
  totalPages: 0,
});
const EMPTY_SUMMARY: DisputeSummary = {
  totalTransactions: 0,
  disputesSubmitted: 0,
  inProgress: 0,
  resolved: 0,
  rejected: 0,
};

type Selection = { transaction: Transaction } | { dispute: Dispute };

@Injectable()
export class CardDisputesFacade {
  private readonly destroyRef = inject(DestroyRef);
  private readonly disputeService = inject(DisputeService);
  private readonly submissions = inject(DisputeSubmissionService);
  private readonly transactionService = inject(TransactionService);
  readonly context = inject(CustomerProfileService);

  readonly view = signal<'transactions' | 'disputes'>('transactions');
  readonly transactionPage = signal<Page<Transaction>>(emptyPage());
  readonly disputePage = signal<Page<Dispute>>(emptyPage());
  readonly statusFilter = signal<DisputeStatus | ''>('');
  readonly summary = signal(EMPTY_SUMMARY);
  readonly reasons = signal<DisputeReasonOption[]>([]);
  readonly selectedTransaction = signal<Transaction | null>(null);
  readonly selectedDispute = signal<Dispute | null>(null);
  readonly selectedDisputeId = signal<string | null>(null);
  readonly timeline = signal<TimelineEvent[]>([]);
  readonly query = signal('');
  readonly typeFilter = signal<TransactionType | ''>('');
  readonly loading = signal(false);
  readonly disputesLoading = signal(false);
  readonly detailLoading = signal(false);
  readonly detailError = signal('');
  readonly saving = signal(false);
  readonly drawerOpen = signal(false);
  readonly documentsOpen = signal(false);
  readonly pendingDocument = signal<File | null>(null);
  readonly documentNotice = signal('');
  readonly pageError = signal('');
  readonly formError = signal('');

  private readonly transactionRequests = new Subject<{
    page: number;
    search: string;
    type: TransactionType | '';
    debounce: boolean;
  }>();
  private readonly disputeRequests = new Subject<{ page: number; status: DisputeStatus | '' }>();
  private readonly selections = new Subject<Selection | null>();
  private readonly overviewRequests = new Subject<void>();
  private readonly viewChanged = new Subject<void>();
  private lastSelection: Selection | null = null;

  constructor() {
    this.transactionRequests
      .pipe(
        switchMap((request) =>
          defer(() => {
            this.loading.set(true);
            this.pageError.set('');

            return (request.debounce ? timer(250) : of(0)).pipe(
              switchMap(() =>
                this.transactionService.getTransactions({
                  page: request.page,
                  size: 10,
                  search: request.search,
                  type: request.type,
                }),
              ),
              takeUntil(merge(this.context.changed, this.viewChanged)),
              tap((page) => {
                this.transactionPage.set(page);

                const selected = this.selectedTransaction();

                if (selected && page.content.some((item) => item.id === selected.id)) {
                  this.selectedTransaction.set(
                    page.content.find((item) => item.id === selected.id)!,
                  );
                } else {
                  this.queueSelection(page.content[0] ? { transaction: page.content[0] } : null);
                }
              }),
              catchError((error) => {
                this.pageError.set(this.errorMessage(error));

                return EMPTY;
              }),
              finalize(() => this.loading.set(false)),
            );
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    this.disputeRequests
      .pipe(
        switchMap((request) =>
          defer(() => {
            this.disputesLoading.set(true);
            this.pageError.set('');

            return this.disputeService.getDisputes(request.page, 10, request.status).pipe(
              takeUntil(merge(this.context.changed, this.viewChanged)),
              tap((page) => this.disputePage.set(page)),
              catchError((error) => {
                this.pageError.set(this.errorMessage(error));

                return EMPTY;
              }),
              finalize(() => this.disputesLoading.set(false)),
            );
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    this.selections
      .pipe(
        switchMap((selection) =>
          defer(() => {
            if (!selection) return EMPTY;

            const transaction = 'transaction' in selection ? selection.transaction : null;
            const disputeId = transaction
              ? transaction.disputeId
              : 'dispute' in selection
                ? selection.dispute.id
                : null;

            if (!disputeId) return EMPTY;
            this.detailLoading.set(true);

            return forkJoin({
              transaction: this.transactionService.getTransaction(
                transaction
                  ? transaction.id
                  : 'dispute' in selection
                    ? selection.dispute.transactionId
                    : '',
              ),
              dispute: this.disputeService.getDispute(disputeId),
              timeline: this.disputeService.getDisputeTimeline(disputeId),
            }).pipe(
              takeUntil(this.context.changed),
              tap((result) => {
                this.selectedTransaction.set(result.transaction);
                this.selectedDispute.set(result.dispute);
                this.timeline.set(result.timeline);
              }),
              catchError((error) => {
                this.detailError.set(this.errorMessage(error));

                return EMPTY;
              }),
              finalize(() => this.detailLoading.set(false)),
            );
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    this.overviewRequests
      .pipe(
        switchMap(() =>
          forkJoin({
            summary: this.disputeService.getDisputeSummary(),
            reasons: this.disputeService.getDisputeReasons(),
          }).pipe(
            takeUntil(this.context.changed),
            tap((result) => {
              this.summary.set(result.summary);
              this.reasons.set(result.reasons);
            }),
            catchError((error) => {
              this.pageError.set(this.errorMessage(error));

              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    effect(() => {
      const customer = this.context.customer();
      const accountId = this.context.accountId();

      if (customer && accountId)
        untracked(() => {
          this.transactionPage.set(emptyPage());
          this.disputePage.set(emptyPage());
          this.summary.set(EMPTY_SUMMARY);
          this.queueSelection(null);
          this.query.set('');
          this.typeFilter.set('');
          this.statusFilter.set('');
          this.initialize();
        });
    });
  }

  initialize(): void {
    if (!this.context.accountId()) return;
    this.overviewRequests.next();

    if (this.view() === 'transactions') this.loadTransactions(this.transactionPage().page);
    else this.loadDisputes(this.disputePage().page);
  }

  showView(view: 'transactions' | 'disputes'): void {
    if (view === this.view() || this.saving()) return;
    this.viewChanged.next();
    this.view.set(view);
    this.queueSelection(null);

    if (view === 'transactions') this.loadTransactions(this.transactionPage().page);
    else this.loadDisputes(this.disputePage().page);
  }

  showDisputeHistory(): void {
    if (this.saving()) return;

    this.statusFilter.set('');
    this.viewChanged.next();
    this.view.set('disputes');
    this.queueSelection(null);
    this.loadDisputes(0);
  }

  selectTransaction(transaction: Transaction): void {
    if (!this.saving()) this.queueSelection({ transaction });
  }

  selectDispute(dispute: Dispute): void {
    if (!this.saving()) this.queueSelection({ dispute });
  }

  clearSelection(): void {
    if (!this.saving()) this.queueSelection(null);
  }

  retryDetails(): void {
    if (!this.lastSelection) return;

    const pendingDocument = this.pendingDocument();
    const documentNotice = this.documentNotice();
    const documentsOpen = this.documentsOpen();

    this.queueSelection(this.lastSelection);
    this.pendingDocument.set(pendingDocument);
    this.documentNotice.set(documentNotice);
    this.documentsOpen.set(documentsOpen);
  }

  private queueSelection(selection: Selection | null): void {
    // Emit even when there is no dispute so the previous request is unsubscribed.
    this.lastSelection = selection;
    this.selectedTransaction.set(
      selection && 'transaction' in selection ? selection.transaction : null,
    );
    this.selectedDispute.set(null);
    this.selectedDisputeId.set(
      selection
        ? 'dispute' in selection
          ? selection.dispute.id
          : (selection.transaction.disputeId ?? null)
        : null,
    );
    this.timeline.set([]);
    this.detailError.set('');
    this.detailLoading.set(false);
    this.drawerOpen.set(false);
    this.documentsOpen.set(false);
    this.pendingDocument.set(null);
    this.documentNotice.set('');
    this.selections.next(selection);
  }

  startDispute(transaction: Transaction): void {
    if (this.saving()) return;
    this.queueSelection({ transaction });

    if (transaction.disputeEligible && !transaction.disputeId) {
      this.formError.set('');
      this.drawerOpen.set(true);
    }
  }

  closeDrawer(): void {
    if (!this.saving()) this.drawerOpen.set(false);
  }

  openDocuments(): void {
    if (this.selectedDispute()) {
      this.drawerOpen.set(false);
      this.documentsOpen.set(true);
    }
  }

  attachmentUploaded(): void {
    this.pendingDocument.set(null);
    this.documentNotice.set('');
  }

  closeDocuments(): void {
    this.documentsOpen.set(false);
    this.pendingDocument.set(null);
    this.documentNotice.set('');
  }

  onSearch(value: string): void {
    this.query.set(value);
    this.loadTransactions(0, true);
  }

  onTypeChange(value: string): void {
    this.typeFilter.set(value as TransactionType | '');
    this.loadTransactions(0);
  }

  onStatusChange(status: DisputeStatus | ''): void {
    this.statusFilter.set(status);
    this.queueSelection(null);
    this.loadDisputes(0);
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.transactionPage().totalPages) this.loadTransactions(page);
  }

  goToDisputePage(page: number): void {
    if (page >= 0 && page < this.disputePage().totalPages) {
      this.queueSelection(null);
      this.loadDisputes(page);
    }
  }

  private loadTransactions(page: number, debounce = false): void {
    this.transactionRequests.next({
      page,
      search: this.query(),
      type: this.typeFilter(),
      debounce,
    });
  }

  private loadDisputes(page: number): void {
    this.disputeRequests.next({ page, status: this.statusFilter() });
  }

  submitDispute(submission: DisputeSubmission): void {
    const transaction = this.selectedTransaction();
    const customerId = this.context.customer()?.id;

    if (this.saving()) return;

    if (!customerId || !transaction) {
      this.formError.set(
        'Your customer or transaction could not be loaded. Reload the page and try again.',
      );
      return;
    }

    if (!transaction.disputeEligible || transaction.disputeId) {
      this.formError.set(
        transaction.disputeIneligibilityReason ||
          'This transaction is no longer eligible for a new dispute. Refresh its details and try again.',
      );
      return;
    }
    this.saving.set(true);
    this.formError.set('');
    this.submissions
      .create(customerId, transaction.id, submission.reason, submission.details)
      .pipe(
        switchMap((dispute) =>
          submission.file
            ? defer(() =>
                this.disputeService.uploadDisputeDocument(dispute.id, submission.file!),
              ).pipe(
                map(() => ({ dispute, attachmentError: '' })),
                catchError((error) => of({ dispute, attachmentError: this.errorMessage(error) })),
              )
            : of({ dispute, attachmentError: '' }),
        ),
        takeUntil(this.context.changed),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: ({ dispute, attachmentError }) => {
          this.queueSelection({
            transaction: {
              ...transaction,
              disputeId: dispute.id,
              disputeEligible: false,
              disputeIneligibilityReason:
                'A non-closed dispute already exists for this transaction',
            },
          });

          if (attachmentError) {
            this.pendingDocument.set(submission.file ?? null);
            this.documentNotice.set(
              `Dispute ${dispute.reference} was submitted. Its attachment was not uploaded: ${attachmentError}`,
            );
            this.documentsOpen.set(true);
          }
          this.overviewRequests.next();

          if (this.view() === 'transactions') this.loadTransactions(this.transactionPage().page);
          else this.loadDisputes(this.disputePage().page);
        },
        error: (error) => {
          const unconfirmed =
            error instanceof HttpErrorResponse && (error.status === 0 || error.status >= 500);

          this.formError.set(
            unconfirmed
              ? 'We could not confirm your submission. Retry with the same details; if it was already saved, we will show the existing dispute.'
              : this.errorMessage(error),
          );
        },
      });
  }

  private errorMessage(error: unknown): string {
    return apiErrorMessage(error, 'We could not complete the request. Please try again.');
  }
}
