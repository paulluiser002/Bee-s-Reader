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
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (
    !origin ||
    origin !== new URL(request.url).origin ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    throw new ProviderError('A same-origin request is required.', 403);
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new ProviderError('JSON content is required.', 415);
}
export async function jsonBody(request: Request) {
  if (Number(request.headers.get('content-length')) > 8192)
    throw new ProviderError('Request too large.', 413);
  const text = await request.text();
  if (text.length > 8192) throw new ProviderError('Request too large.', 413);
  try {
    return JSON.parse(text);
  } catch {
    throw new ProviderError('Invalid JSON.', 400);
  }
}
