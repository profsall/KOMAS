/**
 * Klien WebSocket ke "bridge" yang jalan di laptop.
 *
 * Kenapa pakai bridge, bukan konek langsung ke ESP-01?
 * React Native tidak bisa buka TCP mentah, sedangkan ESP-01 dengan AT command
 * bicara TCP. Bridge di laptop jadi penerjemah: WebSocket (untuk app) <-> TCP
 * (untuk ESP-01). Bonus: notasi & skor tetap bisa diuji tanpa alat nyala.
 */

export type BridgeStatus = 'terputus' | 'menyambung' | 'tersambung';

export type BridgeHandlers = {
  onPesan: (baris: string) => void;
  onStatus: (status: BridgeStatus) => void;
};

export class Bridge {
  private ws: WebSocket | null = null;
  private url = '';
  private timer: ReturnType<typeof setTimeout> | null = null;
  private dicabut = false;

  constructor(private readonly handlers: BridgeHandlers) {}

  sambung(url: string): void {
    this.putus();
    this.dicabut = false;
    this.url = url;
    this.buka();
  }

  private buka(): void {
    this.handlers.onStatus('menyambung');
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url);
    } catch {
      this.jadwalkanUlang();
      return;
    }
    this.ws = ws;

    ws.onopen = () => this.handlers.onStatus('tersambung');
    ws.onmessage = (e) => {
      const data = typeof e.data === 'string' ? e.data : '';
      for (const baris of data.split('\n')) {
        if (baris.trim()) this.handlers.onPesan(baris);
      }
    };
    ws.onerror = () => {
      /* onclose yang urus */
    };
    ws.onclose = () => {
      this.handlers.onStatus('terputus');
      this.jadwalkanUlang();
    };
  }

  private jadwalkanUlang(): void {
    if (this.dicabut) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.buka(), 3000);
  }

  kirim(perintah: string): boolean {
    if (!this.ws || this.ws.readyState !== 1) return false;
    this.ws.send(perintah);
    return true;
  }

  putus(): void {
    this.dicabut = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.handlers.onStatus('terputus');
  }
}
