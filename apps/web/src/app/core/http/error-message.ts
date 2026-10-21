import { HttpErrorResponse } from '@angular/common/http';

/** Turns an API error (Nest exception / ValidationPipe response) into a readable message. */
export function errorMessage(err: unknown): string {
  if (!(err instanceof HttpErrorResponse)) {
    return err instanceof Error && err.message ? err.message : 'Something went wrong.';
  }
  if (err.status === 0) return 'Cannot reach the server. Is the API running on port 3000?';

  const message = err.error?.message;
  if (Array.isArray(message)) return message.join('. ');
  if (typeof message === 'string') return message;
  return `Request failed (${err.status}).`;
}
