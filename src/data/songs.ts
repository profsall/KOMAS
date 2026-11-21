export type Lagu = {
  id: string;
  judul: string;
  /** Notasi titi laras, satu karakter = satu ketukan. */
  notasi: string;
};

/**
 * Contoh lagu. Nada mengikuti bilah demung: 1 2 3 5 6 1¹
 * Tambah lagu sendiri di sini — format bebas, app tidak perlu diubah.
 */
export const LAGU_CONTOH: Lagu[] = [
  {
    id: 'tangga-nada',
    judul: 'Tangga Nada (latihan dasar)',
    notasi: '1 2 3 5 6 1 6 5 3 2 1',
  },
  {
    id: 'gundul-pacul',
    judul: 'Gundul Pacul (potongan)',
    notasi: '3 3 2 1 2 3 3 5 6 5 3',
  },
  {
    id: 'satu-dua-tiga',
    judul: 'Pola Sederhana',
    notasi: '1 1 2 2 3 3 5 5 6 6 1',
  },
];
