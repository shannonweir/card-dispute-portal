import type {components} from '../generated/api-types';

export interface Page<T> {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
}

export type ApiProblem = components['schemas']['Problem'];
