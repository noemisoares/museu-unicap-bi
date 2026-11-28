import { HttpErrorResponse } from '@angular/common/http';

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const body: unknown = error.error;
    if (body !== null && typeof body === 'object' && 'message' in body &&
        typeof body.message === 'string') {
      return body.message;
    }
  }
  return fallback;
}
