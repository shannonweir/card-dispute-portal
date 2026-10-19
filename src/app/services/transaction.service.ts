import {HttpClient, HttpParams} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {Page} from '../models/api.model';
import {Transaction, TransactionFilters} from '../models/transaction.model';
import {API_BASE_URL} from './api.config';

@Injectable({providedIn: 'root'})
export class TransactionService {
    private readonly http = inject(HttpClient);

    getTransactions(filters: TransactionFilters = {}): Observable<Page<Transaction>> {
        let params = new HttpParams().set('page', filters.page ?? 0).set('size', filters.size ?? 10);

        if (filters.from) params = params.set('from', filters.from);

        if (filters.to) params = params.set('to', filters.to);

        if (filters.search) params = params.set('search', filters.search);

        if (filters.type) params = params.set('type', filters.type);

        return this.http.get<Page<Transaction>>(`${API_BASE_URL}/transactions`, {params});
    }

    getTransaction(id: string): Observable<Transaction> {
        return this.http.get<Transaction>(`${API_BASE_URL}/transactions/${id}`);
    }
}
