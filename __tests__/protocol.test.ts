import { encodeNote, encodeLedOff, encodePing, parseLine } from '../src/logic/protocol';

describe('encodeNote', () => {
  it('mengirim perintah not dengan nomor bilah', () => {
    expect(encodeNote(3)).toBe('N,3\n');
  });

  it('menolak bilah di luar 1..6', () => {
    expect(() => encodeNote(0)).toThrow(/bilah/i);
    expect(() => encodeNote(7)).toThrow(/bilah/i);
  });
});

describe('encodeLedOff / encodePing', () => {
  it('perintah matikan lampu', () => {
    expect(encodeLedOff()).toBe('L,0\n');
  });

  it('perintah ping untuk cek koneksi', () => {
    expect(encodePing()).toBe('P\n');
  });
});

describe('parseLine', () => {
  it('membaca laporan pukulan benar', () => {
    expect(parseLine('H,3,612,15234')).toEqual({
      tipe: 'hit',
      bilah: 3,
      kekuatan: 612,
      millis: 15234,
    });
  });

  it('membaca pukulan lemah yang tetap dihitung (kekuatan kecil)', () => {
    expect(parseLine('H,1,405,900')).toEqual({
      tipe: 'hit',
      bilah: 1,
      kekuatan: 405,
      millis: 900,
    });
  });

  it('membaca balasan ping', () => {
    expect(parseLine('PONG')).toEqual({ tipe: 'pong' });
  });

  it('membaca sapaan saat sambungan terbentuk', () => {
    expect(parseLine('READY')).toEqual({ tipe: 'ready' });
  });

  it('mengabaikan baris kosong', () => {
    expect(parseLine('   ')).toBeNull();
  });

  it('mengembalikan null untuk baris tak dikenal', () => {
    expect(parseLine('apa ini')).toBeNull();
  });

  it('menolak nomor bilah di luar 1..6', () => {
    expect(parseLine('H,9,612,15234')).toBeNull();
  });

  it('mentoleransi spasi di ujung baris', () => {
    expect(parseLine('  H,6,700,200  ')).toEqual({
      tipe: 'hit',
      bilah: 6,
      kekuatan: 700,
      millis: 200,
    });
  });
});
