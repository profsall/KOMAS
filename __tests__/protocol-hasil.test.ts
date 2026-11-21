import { parseLine } from '../src/logic/protocol';

describe('parseLine — hasil penilaian dari alat', () => {
  it('membaca hasil benar', () => {
    expect(parseLine('R,3,1,120')).toEqual({
      tipe: 'hasil',
      bilah: 3,
      benar: true,
      delta: 120,
    });
  });

  it('membaca hasil salah', () => {
    expect(parseLine('R,2,0,55')).toEqual({
      tipe: 'hasil',
      bilah: 2,
      benar: false,
      delta: 55,
    });
  });

  it('membaca delta negatif (dipukul sebelum lampu siap)', () => {
    expect(parseLine('R,1,0,-30')).toEqual({
      tipe: 'hasil',
      bilah: 1,
      benar: false,
      delta: -30,
    });
  });

  it('menolak bilah di luar 1..6 pada hasil', () => {
    expect(parseLine('R,9,1,10')).toBeNull();
  });

  it('menolak baris hasil yang jumlah kolomnya salah', () => {
    expect(parseLine('R,3,1')).toBeNull();
  });
});
