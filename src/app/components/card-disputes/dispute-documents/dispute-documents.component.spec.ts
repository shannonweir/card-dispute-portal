import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { DisputeDocumentsComponent } from './dispute-documents.component';
import { DisputeService } from '../../../services/dispute.service';
import type { DisputeDocument } from '../../../models/dispute.model';

describe('Supporting document interactions', () => {
  const saved: DisputeDocument = {
    id: 'document-a',
    fileName: 'receipt.pdf',
    contentType: 'application/pdf',
    sizeBytes: 7,
    uploadedAt: '2026-10-18T10:00:00Z',
  };
  const getDocuments = vi.fn<DisputeService['getDisputeDocuments']>();
  const uploadDocument = vi.fn<DisputeService['uploadDisputeDocument']>();
  let fixture: ComponentFixture<DisputeDocumentsComponent>;
  let root: HTMLElement;

  beforeEach(() => {
    getDocuments.mockReset().mockReturnValue(of([]));
    uploadDocument.mockReset().mockReturnValue(of(saved));
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DisputeService,
          useValue: { getDisputeDocuments: getDocuments, uploadDisputeDocument: uploadDocument },
        },
      ],
    });
    fixture = TestBed.createComponent(DisputeDocumentsComponent);
    fixture.componentRef.setInput('disputeId', 'case-a');
    fixture.componentRef.setInput('reference', 'DSP-TEST-A');
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
  });

  function choose(file: File): void {
    const input = root.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error('File chooser missing');
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function uploadButton(): HTMLButtonElement {
    const button = root.querySelector<HTMLButtonElement>('button.upload');
    if (!button) throw new Error('Upload button missing');
    return button;
  }

  it('loads documents for the selected dispute and disables upload without a file', () => {
    expect(getDocuments).toHaveBeenCalledWith('case-a');
    expect(root.textContent).toContain('No documents have been uploaded');
    expect(uploadButton().disabled).toBe(true);
  });

  it('displays a failed load and recovers using the visible retry button', () => {
    getDocuments.mockReturnValueOnce(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 503,
            error: { detail: 'Documents are temporarily unavailable' },
          }),
      ),
    );
    fixture.componentInstance.refresh();
    fixture.detectChanges();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('temporarily unavailable');
    getDocuments.mockReturnValue(of([saved]));
    const retry = Array.from(root.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Retry loading'),
    );
    if (!retry) throw new Error('Retry button missing');
    retry.click();
    fixture.detectChanges();
    expect(root.querySelector('ul')?.textContent).toContain('receipt.pdf');
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });

  it('rejects unsupported file types before any upload request', () => {
    choose(new File(['executable'], 'program.exe', { type: 'application/octet-stream' }));
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('PDF, PNG or JPEG');
    expect(uploadButton().disabled).toBe(true);
    expect(uploadDocument).not.toHaveBeenCalled();
  });

  it('rejects files larger than 5 MiB before any upload request', () => {
    choose(
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.pdf', { type: 'application/pdf' }),
    );
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('5 MB');
    expect(uploadButton().disabled).toBe(true);
    expect(uploadDocument).not.toHaveBeenCalled();
  });

  it('uploads to the existing case, announces success and reloads the document list', () => {
    const uploaded = vi.fn();
    fixture.componentInstance.uploaded.subscribe(uploaded);
    const file = new File(['receipt'], 'receipt.pdf', { type: 'application/pdf' });
    choose(file);
    getDocuments.mockReturnValue(of([saved]));
    uploadButton().click();
    fixture.detectChanges();
    expect(uploadDocument).toHaveBeenCalledWith('case-a', file);
    expect(uploaded).toHaveBeenCalledOnce();
    expect(root.querySelector('.success')?.textContent).toContain('uploaded successfully');
    expect(root.querySelector('ul')?.textContent).toContain('receipt.pdf');
    expect(uploadButton().disabled).toBe(true);
  });

  it('prevents duplicate uploads and retains the file when the server rejects it', () => {
    const pending = new Subject<DisputeDocument>();
    uploadDocument.mockReturnValue(pending);
    const file = new File(['receipt'], 'receipt.pdf', { type: 'application/pdf' });
    choose(file);
    uploadButton().click();
    fixture.detectChanges();
    expect(uploadButton().disabled).toBe(true);
    fixture.componentInstance.upload();
    expect(uploadDocument).toHaveBeenCalledOnce();
    pending.error(
      new HttpErrorResponse({
        status: 400,
        error: { detail: 'Document signature does not match its type' },
      }),
    );
    fixture.detectChanges();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('signature');
    expect(fixture.componentInstance.selectedFile()).toBe(file);
    expect(uploadButton().disabled).toBe(false);
  });
});
