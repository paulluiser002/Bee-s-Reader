import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ProviderError } from './providers/http';
export async function api<T>(work: () => Promise<T>) {
  try {
    const data = await work();
    return data instanceof Response
      ? data
      : NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json({ error: 'Invalid request parameters.' }, { status: 400 });
    if (error instanceof ProviderError)
      return NextResponse.json(
        { error: error.message, retryAfter: error.retryAfter },
        {
          status: error.status,
          headers: {
            ...(error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {}),
            'Cache-Control': 'no-store',
          },
        },
      );
    console.error(
      'Bee’s Reader server error:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return NextResponse.json(
      { error: 'The request could not be completed. Please try again.' },
      { status: 500 },
    );
  }
}
