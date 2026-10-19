import {HttpErrorResponse} from '@angular/common/http';
import type {ApiProblem} from '../models/api.model';

/** Read RFC 9457 responses without displaying HTML proxy errors or transport internals. */
export function apiErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
        const problem: Partial<ApiProblem> | null =
            error.error && typeof error.error === 'object' ? error.error : null;

        if (typeof problem?.detail === 'string' && problem.detail.trim()) return problem.detail;

        if (typeof problem?.title === 'string' && problem.title.trim()) return problem.title;

        return fallback;
    }

    return error instanceof Error && error.message.trim() ? error.message : fallback;
}
