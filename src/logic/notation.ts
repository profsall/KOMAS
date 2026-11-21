/**
 * Notasi demung — 6 bilah.
 * Angka mengikuti notasi karawitan Jawa (titi laras) yang dipakai di gamelan:
 * bilah 1..6 = notasi dari nada rendah ke tinggi sesuai urutan fisik bilah.
 */
export const DEMUNG_LABELS = ['1', '2', '3', '5', '6', '1¹'] as const;

/** Nada yang diterima di notasi teks. */
const VALID_NOTES = new Set(['1', '2', '3', '4', '5', '6', '7']);

/**
 * Ubah teks notasi jadi daftar ketukan.
 * Menerima pemisah spasi, koma, atau tanpa pemisah (satu karakter = satu ketukan).
 * Titik (.) dan tanda hubung (-) dianggap istirahat dan dibuang.
 */
export function parseNotation(input: string): string[] {
  const bersih = input.trim();
  if (!bersih) {
    throw new Error('Notasi kosong — isi dulu notasi lagunya.');
  }

  const token: string[] = [];
  for (const chunk of bersih.split(/[\s,]+/)) {
    if (!chunk) continue;
    // chunk bisa berisi beberapa karakter tanpa pemisah, mis. "356123"
    for (const ch of chunk) {
      if (ch === '.' || ch === '-') continue; // istirahat
      if (!VALID_NOTES.has(ch)) {
        throw new Error(
          `Nada "${ch}" tidak dikenal. Gunakan angka 1-7, titik untuk istirahat.`,
        );
      }
      token.push(ch);
    }
  }

  if (token.length === 0) {
    throw new Error('Notasi kosong — semua isinya istirahat.');
  }
  return token;
}
