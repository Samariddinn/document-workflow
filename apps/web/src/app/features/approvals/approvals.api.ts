import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

/** Row of `GET /agreements`: a document waiting for the current user's decision. */
export interface ApprovalItem {
  /** The agreement id (used for approve / reject). */
  id: string;
  sent_at: string;
  document_id: string;
  document_number: string;
  description: string;
  kind: 'DOCUMENT' | 'PROTOCOL';
  author_first_name: string;
  author_middle_name: string | null;
  author_last_name: string;
}

export interface ApprovalPage {
  list: ApprovalItem[];
  total: number;
}

/** What the approve / reject flows need to know about an approval, from the inbox or the detail. */
export type ApprovalSummary = Pick<
  ApprovalItem,
  'id' | 'document_number' | 'description' | 'author_first_name' | 'author_middle_name' | 'author_last_name'
>;

export type AgreementStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface ApprovalFile {
  id: string;
  name: string;
  mime_type: string;
  size: string;
  kind: 'MAIN' | 'ADDITIONAL';
}

/** Response of `GET /agreements/:id`. */
export interface ApprovalDetail extends ApprovalItem {
  status: AgreementStatus;
  attempt: number;
  comment: string | null;
  decided_at: string | null;
  document_status: string;
  current_attempt: number;
  /** True while the approver can still approve or reject (the API's rule). */
  can_decide: boolean;
  files: ApprovalFile[];
}

export function authorName(item: ApprovalSummary): string {
  return [item.author_last_name, item.author_first_name, item.author_middle_name]
    .filter(Boolean)
    .join(' ');
}

/** Response of `POST /agreements/:id/approve`. */
export interface ApproveResult {
  id: string;
  status: 'APPROVED';
  /** `AWAITING_SIGNATURE` when this was the last approval and the document went to the head. */
  document_status: 'IN_APPROVAL' | 'AWAITING_SIGNATURE';
}

/** Response of `POST /agreements/:id/reject`. */
export interface RejectResult {
  id: string;
  status: 'REJECTED';
  document_status: 'RETURNED';
}

/** Mirrors the API's AgreementRejectDto limit. */
export const REJECT_REASON_MAX_LENGTH = 1000;

@Injectable({ providedIn: 'root' })
export class ApprovalsApi {
  private readonly http = inject(HttpClient);

  /** Pending approvals of the current user, oldest first. */
  list(limit: number, offset: number): Observable<ApprovalPage> {
    return this.http.get<ApprovalPage>('/api/agreements', { params: { limit, offset } });
  }

  /** One of the current user's approvals, with the document and its files. */
  get(id: string): Observable<ApprovalDetail> {
    return this.http.get<ApprovalDetail>(`/api/agreements/${id}`);
  }

  approve(id: string): Observable<ApproveResult> {
    return this.http.post<ApproveResult>(`/api/agreements/${id}/approve`, {});
  }

  /** Rejects the document for this whole approval round; it goes back to the author. */
  reject(id: string, reason: string): Observable<RejectResult> {
    return this.http.post<RejectResult>(`/api/agreements/${id}/reject`, { reject_reason: reason });
  }
}
