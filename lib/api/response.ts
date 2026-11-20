import { NextResponse } from 'next/server';

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

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
    { status, headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300', ...init?.headers } },
  );
}

export function created<T>(data: T) {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export function fail(message: string, status = 400, code: ErrorCode = 'BAD_REQUEST', details?: unknown) {
  return NextResponse.json(
    { success: false, error: { message, code, ...(details ? { details } : {}) } },
    { status },
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
      if (error instanceof ApiError) return fail(error.message, error.status, error.code, error.details);
      console.error('[api] unexpected error', error);
      return fail('Une erreur interne est survenue.', 500, 'INTERNAL_ERROR');
    }
  };
}
