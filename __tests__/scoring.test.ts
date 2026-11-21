import { SessionTracker } from '../src/logic/scoring';

describe('SessionTracker', () => {
  it('mulai dari nol', () => {
    const t = new SessionTracker(6);
    expect(t.stats.total).toBe(0);
    expect(t.stats.benar).toBe(0);
    expect(t.stats.salah).toBe(0);
    expect(t.stats.akurasi).toBe(0);
    expect(t.stats.streak).toBe(0);
    expect(t.stats.streakTerbaik).toBe(0);
    expect(t.stats.selesai).toBe(false);
  });

  it('pukulan tepat menambah benar, streak, dan memajukan posisi', () => {
    const t = new SessionTracker(6);
    const r = t.record(true, '3');
    expect(r.posisiBaru).toBe(1);
    expect(t.stats.benar).toBe(1);
    expect(t.stats.streak).toBe(1);
    expect(t.stats.akurasi).toBe(100);
  });

  it('pukulan salah menambah salah dan mereset streak, posisi tidak maju', () => {
    const t = new SessionTracker(6);
    t.record(true, '3');
    t.record(true, '5');
    const r = t.record(false, '2');
    expect(r.posisiBaru).toBe(2);
    expect(t.stats.salah).toBe(1);
    expect(t.stats.streak).toBe(0);
    expect(t.stats.streakTerbaik).toBe(2);
  });

  it('akurasi dibulatkan ke bilangan bulat', () => {
    const t = new SessionTracker(6);
    t.record(true, '3');
    t.record(false, '2');
    t.record(false, '1');
    expect(t.stats.akurasi).toBe(33);
  });

  it('menandai selesai ketika semua not sudah dimainkan', () => {
    const t = new SessionTracker(3);
    t.record(true, '3');
    t.record(true, '5');
    const r = t.record(true, '6');
    expect(r.selesai).toBe(true);
    expect(t.stats.selesai).toBe(true);
  });

  it('tidak memajukan posisi setelah selesai', () => {
    const t = new SessionTracker(1);
    t.record(true, '3');
    const r = t.record(true, '5');
    expect(r.posisiBaru).toBe(1);
    expect(t.stats.total).toBe(1);
  });

  it('reset mengembalikan ke kondisi awal', () => {
    const t = new SessionTracker(6);
    t.record(true, '3');
    t.record(true, '5');
    t.reset();
    expect(t.stats.benar).toBe(0);
    expect(t.stats.total).toBe(0);
    expect(t.stats.streakTerbaik).toBe(0);
  });
});
