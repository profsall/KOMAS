// Catatan setup ESP-01 untuk Demung Tutor (dipakai sekali, lalu lupa).

# Mode transparent (paling simpel untuk Uno)

ESP-01 diset sekali lewat USB-TTL adapter (atau Serial Uno dengan sketch kosong),
lalu setelah itu tinggal colok. Target: semua byte WiFi ⇄ Serial lewat tanpa AT command.

Perintah AT (kirim satu-satu, akhiri \r\n):

```
AT                        -> OK
AT+CWMODE=1               -> mode station
AT+CWJAP="NamaWiFi","password"   -> sambung WiFi
AT+CIPMUX=0               -> mode single connection
AT+CIPSTART="TCP","192.168.1.10",2000    -> IP laptop + port bridge TCP*
AT+CIPMODE=1              -> transparent mode
AT+CIPSEND                -> mulai lewatkan data
```

*Port TCP untuk ESP-01: bridge WebSocket pakai port 8081. Untuk TCP murni ke ESP-01,
jalankan bridge kedua atau tambahkan listener TCP — sementara, set `--esp` di bridge
sesuai alamat ESP-01, dan arahkan CIPSTART ke laptop.

Catatan:
- ESP-01 butuh 3.3V yang cukup kuat (~300 mA saat transmit). Jangan ambil dari pin
  3.3V Uno — pakai regulator AMS1117 terpisah atau power supply eksternal.
- TX ESP-01 (3.3V) → RX Uno butuh level shifter (resistor divider 1kΩ/2kΩ cukup).
- RX ESP-01 ← TX Uno (5V) WAJIB divider — tanpa itu pin ESP-01 bisa rusak.

# Alternatif yang lebih simpel (direkomendasikan kalau sempat beli)

Ganti ESP-01 dengan modul ESP-01 yang sudah ada firmware "ESP-link" atau pakai
Wemos D1 Mini sebagai jembatan — sama fungsinya tapi setup-nya gampang.
