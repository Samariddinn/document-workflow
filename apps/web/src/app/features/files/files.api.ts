import { HttpClient, HttpEvent } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

/** Row returned by `POST /files`. `size` is a string because Postgres BIGINT comes back as text. */
export interface StoredFile {
  id: string;
  name: string;
  mime_type: string;
  size: string;
  created_at: string;
}

/** Mirrors the API's limits in FilesController, so bad files are rejected before uploading. */
export const MAX_FILE_SIZE = 20 * 1024 * 1024;
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
export const ACCEPT_ATTRIBUTE = '.pdf,.png,.jpg,.jpeg,.docx';

/** Same checks the API runs; returns a message, or null when the file can be uploaded. */
export function validateUpload(file: File): string | null {
  if (file.size === 0) return 'File is empty';
  if (file.size > MAX_FILE_SIZE) return `File is larger than ${MAX_FILE_SIZE / 1024 / 1024} MB`;
  if (!ALLOWED_MIME_TYPES.includes(file.type)) return 'Only PDF, DOCX, PNG and JPEG files are allowed';
  return null;
}

@Injectable({ providedIn: 'root' })
export class FilesApi {
  private readonly http = inject(HttpClient);

  /** Emits progress events while uploading, then the response with the stored row. */
  upload(file: File): Observable<HttpEvent<StoredFile>> {
    const body = new FormData();
    body.append('file', file);

    return this.http.post<StoredFile>('/api/files', body, {
      reportProgress: true,
      observe: 'events',
    });
  }

  /** Fetched through HttpClient (not a plain link) so the auth interceptor can add the token. */
  download(id: string): Observable<Blob> {
    return this.http.get(`/api/files/${id}`, { responseType: 'blob' });
  }
}
