import 'server-only';
import { ProviderError } from './http';
export function imageLimiter(limit: number, maxQueue: number) {
  let active = 0;
  const waiting: (() => void)[] = [];
  return async () => {
    if (active >= limit) {
      if (waiting.length >= maxQueue)
        throw new ProviderError('Image request queue is full. Retry this page.', 503, 2);
      await new Promise<void>((resolve) => waiting.push(resolve));
    } else active++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const next = waiting.shift();
      if (next) next();
      else active--;
    };
  };
}
