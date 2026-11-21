import { LAGU_CONTOH } from '../src/data/songs';
import { parseNotation } from '../src/logic/notation';

describe('data lagu contoh', () => {
  it('semua lagu punya notasi yang valid dan tidak kosong', () => {
    for (const lagu of LAGU_CONTOH) {
      const not = parseNotation(lagu.notasi);
      expect(not.length).toBeGreaterThan(3);
    }
  });

  it('id lagu unik', () => {
    const ids = LAGU_CONTOH.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
