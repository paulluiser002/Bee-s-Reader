import 'server-only';
export type TransferResult = { success: boolean; bytes: number; duration: number };
export function imageBody(
  source: {
    getReader(): {
      read(): Promise<ReadableStreamReadResult<Uint8Array>>;
      cancel(reason?: unknown): Promise<void>;
    };
  },
  cleanup: () => Promise<void>,
  maxBytes: number,
  started = performance.now(),
) {
  const reader = source.getReader();
  let bytes = 0;
  let settled = false;
  let resolve!: (value: TransferResult) => void;
  const finished = new Promise<TransferResult>((r) => {
    resolve = r;
  });
  async function finish(success: boolean) {
    if (settled) return;
    settled = true;
    const result = { success, bytes, duration: Math.round(performance.now() - started) };
    try {
      await cleanup();
    } catch {
      console.warn('Image connection cleanup failed.');
    } finally {
      resolve(result);
    }
  }
  const body = new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            await finish(bytes > 0);
            controller.close();
            return;
          }
          bytes += value.byteLength;
          if (bytes > maxBytes) {
            await reader.cancel();
            throw new Error('Image exceeds the safety size limit.');
          }
          controller.enqueue(value);
        } catch (error) {
          try {
            await reader.cancel();
          } catch {}
          await finish(false);
          controller.error(error);
        }
      },
      async cancel(reason) {
        try {
          await reader.cancel(reason);
        } finally {
          await finish(false);
        }
      },
    },
    { highWaterMark: 0 },
  );
  return { body, finished };
}
