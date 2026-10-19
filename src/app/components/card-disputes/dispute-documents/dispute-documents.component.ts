import {DatePipe} from '@angular/common';
import {apiErrorMessage} from '../../../utils/api-error.util';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    effect,
    inject,
    input,
    output,
    signal,
    untracked,
} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {EMPTY, Subject, catchError, defer, finalize, switchMap, tap} from 'rxjs';
import {DisputeDocument} from '../../../models/dispute.model';
import {DisputeService} from '../../../services/dispute.service';

@Component({
    selector: 'app-dispute-documents',
    imports: [DatePipe],
    templateUrl: './dispute-documents.component.html',
    styleUrl: './dispute-documents.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisputeDocumentsComponent {
    private readonly service = inject(DisputeService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly reloads = new Subject<string>();
    readonly disputeId = input.required<string>();
    readonly reference = input.required<string>();
    readonly initialFile = input<File | null>(null);
    readonly notice = input('');
    readonly closed = output<void>();
    readonly uploaded = output<void>();
    readonly documents = signal<DisputeDocument[]>([]);
    readonly selectedFile = signal<File | null>(null);
    readonly loading = signal(false);
    readonly uploading = signal(false);
    readonly loadError = signal('');
    readonly uploadError = signal('');
    readonly success = signal('');

    constructor() {
        this.reloads
            .pipe(
                switchMap((id) =>
                    defer(() => {
                        this.loading.set(true);
                        this.loadError.set('');

                        return this.service.getDisputeDocuments(id).pipe(
                            tap((documents) => this.documents.set(documents)),
                            catchError((error) => {
                                this.loadError.set(this.message(error));

                                return EMPTY;
                            }),
                            finalize(() => this.loading.set(false)),
                        );
                    }),
                ),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe();
        effect(() => {
            this.disputeId();
            this.selectedFile.set(this.initialFile());
        });
        effect(() => {
            const id = this.disputeId();

            this.documents.set([]);
            untracked(() => this.reloads.next(id));
        });
    }

    refresh(): void {
        this.reloads.next(this.disputeId());
    }

    chooseFile(event: Event): void {
        const input = event.target as HTMLInputElement;

        this.success.set('');

        const file = input.files?.[0] ?? null;
        const error = file ? this.validate(file) : '';

        this.uploadError.set(error);
        this.selectedFile.set(error ? null : file);

        if (error) input.value = '';
    }

    upload(): void {
        const file = this.selectedFile();

        if (!file || this.uploading()) return;

        const error = this.validate(file);

        if (error) {
            this.uploadError.set(error);

            return;
        }
        this.uploading.set(true);
        this.uploadError.set('');
        this.success.set('');
        defer(() => this.service.uploadDisputeDocument(this.disputeId(), file))
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.uploading.set(false)),
            )
            .subscribe({
                next: () => {
                    this.selectedFile.set(null);
                    this.uploaded.emit();
                    this.success.set('Document uploaded successfully.');
                    this.refresh();
                },
                error: (response) => this.uploadError.set(this.message(response)),
            });
    }

    private validate(file: File): string {
        if (!file.size) return 'Choose a non-empty file.';

        if (file.size > 5 * 1024 * 1024) return 'Files must be 5 MB or smaller.';

        if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type))
            return 'Choose a PDF, PNG or JPEG file.';

        return '';
    }

    private message(error: unknown): string {
        return apiErrorMessage(error, 'The request failed. Please try again.');
    }
}
