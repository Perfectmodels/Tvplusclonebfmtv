import { NextResponse } from 'next/server';

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'UNAVAILABLE';

export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code: ErrorCode = 'BAD_REQUEST',
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function ok<T>(data: T, status = 200, init?: ResponseInit) {
  return NextResponse.json(
    { success: true, data },
    { status, headers: { 'Cache-Control': 'private, no-store', ...init?.headers } },
  );
}

export function created<T>(data: T) {
  return NextResponse.json({ success: true, data }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
}

export function fail(message: string, status = 400, code: ErrorCode = 'BAD_REQUEST', details?: unknown, requestId = crypto.randomUUID()) {
  return NextResponse.json(
    { success: false, error: { message, code, requestId, ...(details ? { details } : {}) } },
    { status, headers: { 'Cache-Control': 'private, no-store', 'X-Request-Id': requestId } },
  );
}

/** Wraps a route handler and normalizes every thrown error. */
export function handleRoute<T extends unknown[]>(
  handler: (...args: T) => Promise<Response>,
): (...args: T) => Promise<Response> {
  return async (...args: T) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof ApiError) {
        const requestId=crypto.randomUUID();
        if(error.status>=500)console.warn('[api] service error',{requestId,status:error.status,code:error.code});
        return fail(error.message,error.status,error.code,error.details,requestId);
      }
      const requestId=crypto.randomUUID();
      console.error('[api] unexpected error', {requestId, type:error instanceof Error?error.name:'unknown'});
      return fail('Une erreur interne est survenue.', 500, 'INTERNAL_ERROR', undefined, requestId);
    }
  };
}
