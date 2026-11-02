import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

/** Row of `GET /signatures`: a document every approver approved, waiting for the head's signature. */
export interface SignatureItem {
  /** The signature id (used for sign / reject). */
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

export interface SignaturePage {
  list: SignatureItem[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class SignaturesApi {
  private readonly http = inject(HttpClient);

  /** Documents waiting for the current head's signature, oldest first. */
  list(limit: number, offset: number): Observable<SignaturePage> {
    return this.http.get<SignaturePage>('/api/signatures', { params: { limit, offset } });
  }
}
