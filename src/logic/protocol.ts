/**
 * Protokol baris-perintah antara app (React Native) dan Arduino Uno lewat ESP-01.
 *
 * Semua pesan satu baris, dipisah newline (\n). Dipisah koma. Sengaja
 * super ringan — Uno hanya punya 2KB RAM dan lewat ESP-01 pakai AT command.
 *
 * Arah APP → ALAT
 *   N,<bilah>     nyalakan lampu bilah <bilah> (1..6), not berikutnya
 *   L,0           matikan semua lampu
 *   P             ping, alat harus jawab PONG
 *
 * Arah ALAT → APP
 *   READY                      alat siap
 *   H,<bilah>,<kekuatan>,<ms>  ada pukulan: bilah, nilai ADC, millis()
 *   R,<bilah>,<benar>,<delta>  hasil penilaian alat: 1=benar, 0=salah, delta ms
 *   PONG                       balasan ping
 */

export const BILAH_MIN = 1;
export const BILAH_MAX = 6;

export function encodeNote(bilah: number): string {
  if (!Number.isInteger(bilah) || bilah < BILAH_MIN || bilah > BILAH_MAX) {
    throw new Error(`Nomor bilah harus 1..${BILAH_MAX}, dapat ${bilah}.`);
  }
  return `N,${bilah}\n`;
}

export function encodeLedOff(): string {
  return 'L,0\n';
}

export function encodePing(): string {
  return 'P\n';
}

export type AlatMessage =
  | { tipe: 'hit'; bilah: number; kekuatan: number; millis: number }
  | { tipe: 'hasil'; bilah: number; benar: boolean; delta: number }
  | { tipe: 'pong' }
  | { tipe: 'ready' };

/**
 * Baca satu baris dari alat. Baris kosong / sampah (mis. echo AT command,
 * pesan "WIFI GOT IP" dari ESP-01) dikembalikan null supaya bisa diabaikan.
 */
export function parseLine(line: string): AlatMessage | null {
  const s = line.trim();
  if (!s) return null;

  if (s === 'PONG') return { tipe: 'pong' };
  if (s === 'READY') return { tipe: 'ready' };

  const bagian = s.split(',');
  if (bagian[0] !== 'H' && bagian[0] !== 'R') return null;

  if (bagian[0] === 'R') {
    if (bagian.length !== 4) return null;
    const bilahR = Number(bagian[1]);
    const benar = bagian[2] === '1';
    const delta = Number(bagian[3]);
    if (!Number.isInteger(bilahR) || bilahR < BILAH_MIN || bilahR > BILAH_MAX) {
      return null;
    }
    if (!Number.isFinite(delta)) return null;
    return { tipe: 'hasil', bilah: bilahR, benar, delta };
  }

  if (bagian.length !== 4) return null;

  const bilah = Number(bagian[1]);
  const kekuatan = Number(bagian[2]);
  const millis = Number(bagian[3]);

  if (!Number.isInteger(bilah) || bilah < BILAH_MIN || bilah > BILAH_MAX) {
    return null;
  }
  if (!Number.isFinite(kekuatan) || !Number.isFinite(millis)) return null;

  return { tipe: 'hit', bilah, kekuatan, millis };
}
