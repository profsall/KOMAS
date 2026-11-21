import { parseNotation, DEMUNG_LABELS } from '../src/logic/notation';

describe('parseNotation', () => {
  it('memecah notasi dipisah spasi jadi daftar bilah', () => {
    expect(parseNotation('3 5 6 1 2 3')).toEqual(['3', '5', '6', '1', '2', '3']);
  });

  it('menerima notasi tanpa spasi sebagai satu ketukan per karakter', () => {
    expect(parseNotation('356123')).toEqual(['3', '5', '6', '1', '2', '3']);
  });

  it('membuang spasi berlebih dan baris kosong', () => {
    expect(parseNotation('  3   5 \n 6  ')).toEqual(['3', '5', '6']);
  });

  it('mendukung tanda titik sebagai pemisah ketukan kosong (istirahat) diabaikan', () => {
    expect(parseNotation('3 . 5')).toEqual(['3', '5']);
  });

  it('menolak bilah di luar daftar bilah yang dikenal', () => {
    expect(() => parseNotation('3 9 5')).toThrow(/tidak dikenal/i);
  });

  it('menolak notasi kosong', () => {
    expect(() => parseNotation('   ')).toThrow(/kosong/i);
  });

  it('mengembalikan 6 bilah default demung', () => {
    expect(DEMUNG_LABELS).toHaveLength(6);
  });
});
