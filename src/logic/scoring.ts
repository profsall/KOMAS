export type HitResult = {
  /** Posisi not yang harus dimainkan berikutnya (0..total-1). */
  posisiBaru: number;
  /** true kalau seluruh notasi sudah selesai dimainkan. */
  selesai: boolean;
};

export type Stats = {
  total: number;
  benar: number;
  salah: number;
  akurasi: number;
  streak: number;
  streakTerbaik: number;
  selesai: boolean;
};

/**
 * Pelacak sesi latihan.
 *
 * Aturan main (disepakati untuk user 45+ supaya tidak bikin frustrasi):
 * - pukulan tepat  → benar +1, posisi maju, streak naik
 * - pukulan salah  → salah +1, posisi TIDAK maju, streak reset
 *   (user mengulang not yang sama sampai kena — tidak ada hukuman berat)
 */
export class SessionTracker {
  private readonly total: number;
  private posisi = 0;
  private benar = 0;
  private salah = 0;
  private streak = 0;
  private streakTerbaik = 0;

  constructor(total: number) {
    if (!Number.isInteger(total) || total <= 0) {
      throw new Error('Jumlah not harus bilangan bulat positif.');
    }
    this.total = total;
  }

  get stats(): Stats {
    const totalDipukul = this.benar + this.salah;
    return {
      total: totalDipukul,
      benar: this.benar,
      salah: this.salah,
      akurasi:
        totalDipukul === 0
          ? 0
          : Math.round((this.benar / totalDipukul) * 100),
      streak: this.streak,
      streakTerbaik: this.streakTerbaik,
      selesai: this.posisi >= this.total,
    };
  }

  get indexSekarang(): number {
    return Math.min(this.posisi, this.total - 1);
  }

  record(tepat: boolean, bilah: string): HitResult {
    if (this.stats.selesai) {
      return { posisiBaru: this.posisi, selesai: true };
    }

    if (tepat) {
      this.benar += 1;
      this.streak += 1;
      if (this.streak > this.streakTerbaik) this.streakTerbaik = this.streak;
      this.posisi += 1;
    } else {
      this.salah += 1;
      this.streak = 0;
    }
    // bilah dipakai untuk log/replay; sengaja tidak disimpan di sini
    void bilah;

    return { posisiBaru: this.posisi, selesai: this.posisi >= this.total };
  }

  reset(): void {
    this.posisi = 0;
    this.benar = 0;
    this.salah = 0;
    this.streak = 0;
    this.streakTerbaik = 0;
  }
}
