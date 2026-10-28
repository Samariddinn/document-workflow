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

  /** Creates a DRAFT; the files must already be uploaded through `POST /files`. */
  create(body: CreateDocumentRequest): Observable<DocumentRecord> {
    return this.http.post<DocumentRecord>('/api/documents', body);
  }
}
