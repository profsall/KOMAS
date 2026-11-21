// Firmware Demung Tutor — Arduino Uno
// 6 piezo (A0..A5) + 6 LED (D2..D7) + ESP-01 di Serial (AT command).
//
// PRINSIP: penilaian benar/salah di SINI, bukan di app. WiFi itu jitter-nya
// 20–100 ms, presisi pukulan manusia ~20–30 ms. millis() di Uno akurat.
//
// Pesan yang diterima (dari ESP-01, hasil terusan bridge):
//   N,<bilah>   not berikutnya = bilah <bilah>
//   L,0         matikan semua lampu
//   P           ping → jawab PONG
// Pesan yang dikirim:
//   READY                 siap
//   H,<bilah>,<adc>,<ms>  ada pukulan
//   R,<bilah>,<benar>,<delta_ms>  hasil penilaian (1=benar, 0=salah)
//
// CATATAN ESP-01: ESP-01 pakai AT command. Cara paling gampang biar Uno gak
// perlu ngatur AT: mode "ESP-01 transparent" (AT+CIPMODE=1) — semua byte yang
// masuk lewat WiFi langsung diteruskan ke Serial, dan sebaliknya. Jadi Uno
// cuma perlu bicara Serial biasa. Lihat catatan-esp01.md untuk setup sekali.

const uint8_t PIN_PIEZO[6] = { A0, A1, A2, A3, A4, A5 };
const uint8_t PIN_LED[6]   = { 2, 3, 4, 5, 6, 7 };

const int   THRESHOLD   = 400;    // ambang ADC dianggap pukulan
const int   TOLERANSI_MS = 400;   // telat/cepat masih dianggap benar
const uint32_t CROSS_TALK_MS = 12; // abaikan sensor lain selama ini setelah pukulan
const unsigned long BAUD = 115200;

// ---- state ----
int   bilahTarget = -1;           // -1 = belum mulai
uint32_t waktuTarget = 0;         // millis() saat not diberikan
uint32_t waktuPukulanTerakhir = 0;
bool     sedangCrossTalk = false;
char     bufSerial[32];
uint8_t  idxBuf = 0;

void setup() {
  for (int i = 0; i < 6; i++) {
    pinMode(PIN_LED[i], OUTPUT);
    digitalWrite(PIN_LED[i], LOW);
  }
  Serial.begin(BAUD);
  kirim("READY");
}

void loop() {
  bacaSerial();
  bacaSensor();
}

/* ---------- pesan masuk ---------- */
void bacaSerial() {
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      if (idxBuf > 0) {
        bufSerial[idxBuf] = '\0';
        prosesBaris(bufSerial);
        idxBuf = 0;
      }
      continue;
    }
    if (idxBuf < sizeof(bufSerial) - 1) {
      bufSerial[idxBuf++] = c;
    } else {
      idxBuf = 0; // baris kepanjangan, buang
    }
  }
}

void prosesBaris(const char* line) {
  if (line[0] == 'P' && line[1] == '\0') {
    kirim("PONG");
    return;
  }
  if (line[0] == 'L' && line[1] == ',' && line[2] == '0') {
    matikanLampu();
    bilahTarget = -1;
    return;
  }
  if (line[0] == 'N' && line[1] == ',') {
    int b = atoi(line + 2);
    if (b >= 1 && b <= 6) {
      bilahTarget = b - 1;
      waktuTarget = millis();
      nyalakanLampu(bilahTarget);
    }
    return;
  }
  // baris lain (echo AT, "WIFI GOT IP", dst) diabaikan
}

/* ---------- sensor ---------- */
void bacaSensor() {
  // Sampling tanpa delay — pukulan piezo cuma 1–3 ms.
  uint32_t sekarang = millis();

  if (sedangCrossTalk) {
    if (sekarang - waktuPukulanTerakhir >= CROSS_TALK_MS) {
      sedangCrossTalk = false;
    } else {
      return; // getaran susulan dari pukulan tadi, abaikan
    }
  }

  for (int i = 0; i < 6; i++) {
    int v = analogRead(PIN_PIEZO[i]);
    if (v > THRESHOLD) {
      waktuPukulanTerakhir = sekarang;
      sedangCrossTalk = true;

      // kirim data mentah
      kirimHit(i + 1, v, sekarang);

      // nilai di sini — tidak tergantung WiFi
      if (bilahTarget >= 0) {
        bool bilahBenar = (i == bilahTarget);
        long delta = (long)sekarang - (long)waktuTarget;
        bool waktuBenar = (delta >= -TOLERANSI_MS) && (delta <= (long)TOLERANSI_MS * 10);
        // toleransi waktu longgar: user 45+ butuh waktu mikir.
        bool benar = bilahBenar && waktuBenar;

        kirimHasil(i + 1, benar, delta);

        if (benar) {
          flashLampu(bilahTarget, 2);   // konfirmasi visual: kedip 2x
          bilahTarget = -1;             // tunggu app kirim not berikutnya
        } else {
          // salah: lampu target tetap nyala (kalau salah bilah), user coba lagi
          if (!bilahBenar) nyalakanLampu(bilahTarget);
          else flashLampu(bilahTarget, 1); // salah timing: kedip 1x
        }
      }
      break; // satu pukulan per cross-talk window
    }
  }
}

/* ---------- LED ---------- */
void matikanLampu() {
  for (int i = 0; i < 6; i++) digitalWrite(PIN_LED[i], LOW);
}

void nyalakanLampu(int idx) {
  matikanLampu();
  digitalWrite(PIN_LED[idx], HIGH);
}

void flashLampu(int idx, int kali) {
  for (int k = 0; k < kali; k++) {
    digitalWrite(PIN_LED[idx], LOW);
    delay(80);
    digitalWrite(PIN_LED[idx], HIGH);
    delay(80);
  }
}

/* ---------- kirim ---------- */
void kirim(const char* msg) {
  Serial.print(msg);
  Serial.print('\n');
}

void kirimHit(int bilah, int adc, uint32_t ms) {
  Serial.print("H,");
  Serial.print(bilah);
  Serial.print(',');
  Serial.print(adc);
  Serial.print(',');
  Serial.println(ms);
}

void kirimHasil(int bilah, bool benar, long delta) {
  Serial.print("R,");
  Serial.print(bilah);
  Serial.print(',');
  Serial.print(benar ? 1 : 0);
  Serial.print(',');
  Serial.println(delta);
}
