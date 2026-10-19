import type {components} from '../generated/api-types';

export type TransactionType = components['schemas']['TransactionType'];
export type TransactionStatus = components['schemas']['TransactionStatus'];
export type Money = components['schemas']['Money'];
export type Transaction = components['schemas']['Transaction'];

export interface TransactionFilters {
    page?: number;
    size?: number;
    from?: string;
    to?: string;
    search?: string;
    type?: TransactionType | '';
}
