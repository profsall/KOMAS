# Demung Tutor

Aplikasi latihan demung (gamelan karawitan Jawa) untuk 1 instrumen 6 bilah.
Lampu nyala di bilah yang harus dipukul, sensor piezo menilai pukulan, skor tampil di layar.

Target pengguna: 45+ → font besar, tombol besar, alur sesederhana mungkin.

## Arsitektur

```
[ HP / Tablet ]            [ Laptop ]                [ Alat ]
  React Native  ──WS──>  bridge.js (WebSocket)  ──TCP──>  ESP-01  ──AT──>  Arduino Uno
  (Expo)                 Node                    (port     (WiFi)          + 6 piezo
                                                   8081)                   + 6 LED
```

Kenapa ada bridge? React Native tidak bisa buka TCP mentah, sementara ESP-01 bicara TCP
lewat AT command. Bridge di laptop menerjemahkan WebSocket ⇄ TCP.

**Logika penilaian ada di Arduino**, bukan di app: WiFi jitter 20–100 ms, sementara presisi
pukulan manusia ~20–30 ms. Kalau app yang menilai, hasilnya acak. Arduino menghitung sendiri
pakai `millis()`, app cuma menampilkan.

## Isi folder

| File | Keterangan |
|---|---|
| `App.tsx` | UI aplikasi React Native (Expo) |
| `src/logic/notation.ts` | Parser notasi |
| `src/logic/scoring.ts` | Pelacak skor sesi |
| `src/logic/protocol.ts` | Protokol baris perintah app ⇄ alat |
| `src/net/bridge.ts` | Klien WebSocket ke bridge laptop |
| `src/data/songs.ts` | Daftar lagu contoh |
| `bridge/bridge.js` | Jembatan WebSocket ⇄ TCP (jalankan di laptop) |
| `firmware/uno_demung/uno_demung.ino` | Sketch Arduino Uno (sensor + LED + penilaian) |
| `firmware/esp01_bridge/` | Catatan firmware AT ESP-01 |
| `__tests__/` | Unit test (`npm test`) |

## 1. Jalankan bridge di laptop

```bash
cd bridge
npm install
node bridge.js --port 8081 --esp 192.168.1.50:2000
```

- `--port` = port WebSocket untuk app (default 8081)
- `--esp` = alamat ESP-01 hasil AT `CIPSTART` (lihat bagian firmware)

Test tanpa alat: `node bridge.js --esp dummy` → bridge akan menjawab PING sendiri.

## 2. Jalankan app

```bash
npm install
npm start
```

Scan QR dengan Expo Go di HP. HP dan laptop harus di WiFi yang sama.
Isi "Alamat bridge" dengan `ws://IP_LAPTOP:8081`, cari IP laptop pakai `hostname -I` (Linux) atau `ipconfig` (Windows).

## 3. Upload firmware

Buka `firmware/uno_demung/uno_demung.ino` di Arduino IDE, sesuaikan pin kalau perlu, upload.

## Protokol

Satu pesan = satu baris, dipisah koma. Ringan karena Uno hanya 2 KB RAM.

App → alat:
```
N,3        nyalakan lampu bilah 3 (not berikutnya)
L,0        matikan semua lampu
P          ping
```

Alat → app:
```
READY                     siap
H,3,612,15234             pukulan: bilah 3, ADC 612, millis 15234
R,3,1,120                 hasil penilaian: bilah 3, benar(1), telat 120 ms
PONG                      balasan ping
```

`H` cuma data mentah (dipakai untuk tampilan/debug). Yang menentukan benar/salah
adalah `R` — dihitung di Arduino, jadi jitter WiFi tidak mempengaruhi hasil.

## Aturan penilaian

- Pukulan tepat → benar +1, maju ke not berikutnya, lampu pindah
- Pukulan salah → salah +1, **posisi tidak maju** (ulangi not yang sama sampai kena)
- Toleransi waktu pukulan: `TOLERANSI_MS` di sketch (default 400 ms)

Sengaja tidak ada hukuman berat — pengguna 45+ butuh latihan berulang tanpa frustrasi.

## Wiring

- 6 piezo → A0..A5, masing-masing 1 MΩ paralel + zener 5.1 V ke GND
- 6 LED + resistor 220 Ω → D2..D7
- ESP-01 → `Serial` (pin 0/1) lewat level shifter 3.3 V, VCC dari sumber 3.3 V terpisah
  (jangan dari pin 3.3 V Uno — arusnya tidak cukup, ESP-01 butuh ~300 mA saat TX)

## Catatan

- `npm test` — 28 unit test untuk parser, skor, dan protokol
- Belum ada build native; jalankan lewat Expo Go
- Font besar & tombol besar mengikuti kebutuhan pengguna 45+; jangan dikecilkan tanpa alasan kuat
