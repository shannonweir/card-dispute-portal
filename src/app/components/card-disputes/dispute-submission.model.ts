import {DisputeReason} from '../../models/dispute.model';

/** Values emitted by the dispute form; evidence is uploaded separately. */
export interface DisputeSubmission {
    reason: DisputeReason;
    details: string;
    file: File | null;
}
