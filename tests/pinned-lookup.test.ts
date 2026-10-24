// @vitest-environment node
import { it, expect } from 'vitest';
import { pinnedLookup } from '@/lib/providers/media';
it('supplies pinned DNS answers in Node’s all-addresses callback shape', () => {
  const lookup = pinnedLookup({ address: '1.1.1.1', family: 4 });
  lookup('upstream.test', { all: true }, (error, address) => {
    expect(error).toBeNull();
    expect(address).toEqual([{ address: '1.1.1.1', family: 4 }]);
  });
  lookup('upstream.test', { all: false }, (error, address, family) => {
    expect(error).toBeNull();
    expect(address).toBe('1.1.1.1');
    expect(family).toBe(4);
  });
});
