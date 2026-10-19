import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {Page} from '../models/api.model';
import {
    Dispute,
    DisputeDocument,
    DisputeReason,
    DisputeReasonOption,
    DisputeSummary,
    DisputeStatus,
    TimelineEvent,
} from '../models/dispute.model';
import {API_BASE_URL} from './api.config';

@Injectable({providedIn: 'root'})
export class DisputeService {
    private readonly http = inject(HttpClient);

    getDisputeReasons(): Observable<DisputeReasonOption[]> {
        return this.http.get<DisputeReasonOption[]>(`${API_BASE_URL}/disputes/reasons`);
    }

    getDisputeSummary(): Observable<DisputeSummary> {
        return this.http.get<DisputeSummary>(`${API_BASE_URL}/disputes/summary`);
    }

    getDisputes(page = 0, size = 20, status: DisputeStatus | '' = ''): Observable<Page<Dispute>> {
        let params = new HttpParams().set('page', page).set('size', size);

        if (status) params = params.set('status', status);

        return this.http.get<Page<Dispute>>(`${API_BASE_URL}/disputes`, {params});
    }

    getDispute(id: string): Observable<Dispute> {
        return this.http.get<Dispute>(`${API_BASE_URL}/disputes/${id}`);
    }

    getDisputeTimeline(disputeId: string): Observable<TimelineEvent[]> {
        return this.http.get<TimelineEvent[]>(`${API_BASE_URL}/disputes/${disputeId}/timeline`);
    }

    createDispute(
        transactionId: string,
        reason: DisputeReason,
        details: string,
        idempotencyKey: string,
    ): Observable<Dispute> {
        const headers = new HttpHeaders({'Idempotency-Key': idempotencyKey});

        return this.http.post<Dispute>(
            `${API_BASE_URL}/disputes`,
            {transactionId, reason, details},
            {headers},
        );
    }

    getDisputeDocuments(disputeId: string): Observable<DisputeDocument[]> {
        return this.http.get<DisputeDocument[]>(`${API_BASE_URL}/disputes/${disputeId}/documents`);
    }

    uploadDisputeDocument(disputeId: string, file: File): Observable<DisputeDocument> {
        if (
            file.size > 5 * 1024 * 1024 ||
            !['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)
        ) {
            throw new Error('Invalid document: only PDF, PNG or JPEG files up to 5 MB are allowed.');
        }

        const body = new FormData();

        body.append('file', file);

        return this.http.post<DisputeDocument>(`${API_BASE_URL}/disputes/${disputeId}/documents`, body);
    }
}
