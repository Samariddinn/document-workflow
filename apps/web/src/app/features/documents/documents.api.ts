import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type DocumentStatus = 'DRAFT' | 'IN_APPROVAL' | 'RETURNED' | 'AWAITING_SIGNATURE' | 'SIGNED';

/** Body of `POST /documents` (mirrors the API's DocumentCreateDto). */
export interface CreateDocumentRequest {
  document_number: string;
  description: string;
  main_file_ids: string[];
  additional_file_ids?: string[];
}

/** Document row as returned by the API. */
export interface DocumentRecord {
  id: string;
  kind: 'DOCUMENT' | 'PROTOCOL';
  document_number: string;
  description: string;
  status: DocumentStatus;
  current_attempt: number;
  created_by: string;
  org_id: string;
  created_at: string;
  updated_at: string;
}

/** Body of `PATCH /documents/:id`: the full new state, file lists replace the current links. */
export type UpdateDocumentRequest = CreateDocumentRequest;

export interface DocumentFile {
  id: string;
  name: string;
  mime_type: string;
  size: string;
  kind: 'MAIN' | 'ADDITIONAL' | 'SIGNED';
}

/** Response of `GET /documents/:id`. */
export interface DocumentDetail extends DocumentRecord {
  files: DocumentFile[];
}

/** Statuses in which the author may still edit the document (mirrors the API's check). */
export const EDITABLE_STATUSES: readonly DocumentStatus[] = ['DRAFT', 'RETURNED'];

/** Response of `GET /documents`: one page plus the total across all pages. */
export interface DocumentPage {
  list: DocumentRecord[];
  total: number;
}

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  DRAFT: 'Draft',
  IN_APPROVAL: 'In approval',
  RETURNED: 'Returned',
  AWAITING_SIGNATURE: 'Awaiting signature',
  SIGNED: 'Signed',
};

@Injectable({ providedIn: 'root' })
export class DocumentsApi {
  private readonly http = inject(HttpClient);

  /** The current user's own documents, newest first. */
  list(limit: number, offset: number): Observable<DocumentPage> {
    return this.http.get<DocumentPage>('/api/documents', { params: { limit, offset } });
  }

  /** One of the current user's documents, with its attached files. */
  get(id: string): Observable<DocumentDetail> {
    return this.http.get<DocumentDetail>(`/api/documents/${id}`);
  }

  /** Allowed for the author while the document is DRAFT or RETURNED. */
  update(id: string, body: UpdateDocumentRequest): Observable<DocumentRecord> {
    return this.http.patch<DocumentRecord>(`/api/documents/${id}`, body);
  }

  /**
   * Sends a DRAFT or RETURNED document to the chosen approvers (a new approval attempt).
   * Contract agreed for the API: `POST /documents/:id/submit` with `{ approver_ids }`.
   */
  submit(id: string, approverIds: string[]): Observable<DocumentRecord> {
    return this.http.post<DocumentRecord>(`/api/documents/${id}/submit`, {
      approver_ids: approverIds,
    });
  }

  /** Soft-deletes the document. The API allows it only for the author's own DRAFT documents. */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/documents/${id}`);
  }

  /** Creates a DRAFT; the files must already be uploaded through `POST /files`. */
  create(body: CreateDocumentRequest): Observable<DocumentRecord> {
    return this.http.post<DocumentRecord>('/api/documents', body);
  }
}
