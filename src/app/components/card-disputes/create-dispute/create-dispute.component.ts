import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, ValidatorFn } from '@angular/forms';
import { DisputeReason, DisputeReasonOption } from '../../../models/dispute.model';
import { DisputeSubmission } from '../dispute-submission.model';
import { Transaction } from '../../../models/transaction.model';
import { transactionTypeIcon } from '../../../utils/transaction-display.util';

const trimmedDetailsLength: ValidatorFn = (control) =>
  typeof control.value === 'string' && control.value.trim().length >= 10
    ? null
    : { minlength: true };

@Component({
  selector: 'app-create-dispute',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule],
  templateUrl: './create-dispute.component.html',
  styleUrl: './create-dispute.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateDisputeComponent {
  private readonly fb = inject(FormBuilder);

  readonly transaction = input.required<Transaction>();
  readonly reasons = input.required<DisputeReasonOption[]>();
  readonly saving = input(false);
  readonly submissionError = input('');

  readonly closed = output<void>();
  readonly submitted = output<DisputeSubmission>();

  readonly selectedFile = signal<File | null>(null);
  readonly fileError = signal('');
  readonly validationError = signal('');
  readonly typeIcon = transactionTypeIcon;
  readonly disputeForm = this.fb.nonNullable.group({
    reason: ['' as DisputeReason | '', Validators.required],
    details: ['', [Validators.required, trimmedDetailsLength, Validators.maxLength(2000)]],
  });

  chooseFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (this.saving()) return;

    if (file && !file.size) {
      this.fileError.set('Choose a non-empty file.');
      this.selectedFile.set(null);
      input.value = '';

      return;
    }

    if (file && file.size > 5 * 1024 * 1024) {
      this.fileError.set('Supporting documents must be 5 MB or smaller.');
      this.selectedFile.set(null);
      input.value = '';

      return;
    }

    if (file && !['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) {
      this.fileError.set('Only PDF, PNG and JPEG files are supported.');
      this.selectedFile.set(null);
      input.value = '';

      return;
    }
    this.fileError.set('');
    this.selectedFile.set(file);
  }

  submit(): void {
    if (this.saving()) return;

    this.validationError.set('');

    if (this.disputeForm.invalid || !!this.fileError()) {
      this.disputeForm.markAllAsTouched();
      this.validationError.set(
        this.fileError() ||
          (this.disputeForm.controls.reason.invalid
            ? 'Choose a dispute reason before submitting.'
            : 'Enter between 10 and 2,000 characters of details, excluding surrounding spaces.'),
      );

      return;
    }

    const { reason, details } = this.disputeForm.getRawValue();

    if (reason) this.submitted.emit({ reason, details: details.trim(), file: this.selectedFile() });
  }
}
