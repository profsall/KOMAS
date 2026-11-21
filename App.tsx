import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { LAGU_CONTOH, Lagu } from './src/data/songs';
import { DEMUNG_LABELS, parseNotation } from './src/logic/notation';
import { SessionTracker, Stats } from './src/logic/scoring';
import {
  encodeLedOff,
  encodeNote,
  encodePing,
  parseLine,
} from './src/logic/protocol';
import { Bridge, BridgeStatus } from './src/net/bridge';

const SIMPAN_URL = 'demung-tutor:urlBridge';
const SIMPAN_LAGU = 'demung-tutor:notasiCustom';

const WARNA = {
  latar: '#12100E',
  panel: '#1E1A16',
  panelAktif: '#302518',
  emas: '#E8B84B',
  emasRedup: '#7A6127',
  putih: '#F5F0E6',
  abu: '#A89880',
  hijau: '#4CAF7D',
  merah: '#D9534F',
};

export default function App() {
  const [statusBridge, setStatusBridge] = useState<BridgeStatus>('terputus');
  const [urlBridge, setUrlBridge] = useState('ws://192.168.1.10:8081');
  const [laguId, setLaguId] = useState(LAGU_CONTOH[0].id);
  const [notasiCustom, setNotasiCustom] = useState('');
  const [notasiAktif, setNotasiAktif] = useState<string[]>([]);
  const [posisi, setPosisi] = useState(0);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    benar: 0,
    salah: 0,
    akurasi: 0,
    streak: 0,
    streakTerbaik: 0,
    selesai: false,
  });
  const [pesanTerakhir, setPesanTerakhir] = useState('');
  const [bilahTerakhir, setBilahTerakhir] = useState<number | null>(null);
  const [tepat, setTepat] = useState<boolean | null>(null);
  const [sedangMain, setSedangMain] = useState(false);

  const trackerRef = useRef<SessionTracker | null>(null);
  const bridgeRef = useRef<Bridge | null>(null);
  const posisiRef = useRef(0);
  const notasiRef = useRef<string[]>([]);

  const laguAktif: Lagu | undefined = useMemo(
    () => LAGU_CONTOH.find((l) => l.id === laguId),
    [laguId],
  );

  const notYangHarusDimainkan = notasiAktif[posisi] ?? null;

  /* ---------- setup bridge ---------- */
  useEffect(() => {
    const bridge = new Bridge({
      onStatus: setStatusBridge,
      onPesan: (baris) => {
        const pesan = parseLine(baris);
        if (!pesan) return;
        if (pesan.tipe === 'ready') {
          setPesanTerakhir('Alat siap.');
          return;
        }
        if (pesan.tipe === 'pong') {
          setPesanTerakhir('Alat menjawab.');
          return;
        }
        if (pesan.tipe === 'hasil') {
          // Penilaian sudah dilakukan alat (di Arduino, tanpa jitter WiFi).
          const t = trackerRef.current;
          if (!t) return;
          const hasil = t.record(pesan.benar, String(pesan.bilah));
          setTepat(pesan.benar);
          setStats({ ...t.stats });
          if (pesan.benar) {
            posisiRef.current = hasil.posisiBaru;
            setPosisi(hasil.posisiBaru);
            const berikut = notasiRef.current[hasil.posisiBaru];
            if (berikut && !hasil.selesai) {
              const idx = DEMUNG_LABELS.findIndex((l) => l === berikut);
              bridgeRef.current?.kirim(encodeNote(idx >= 0 ? idx + 1 : 1));
              setPesanTerakhir(`Benar! Lanjut ke bilah ${berikut}.`);
            } else {
              bridgeRef.current?.kirim(encodeLedOff());
              setPesanTerakhir('Selesai! Semua not sudah dimainkan.');
              setSedangMain(false);
            }
          } else {
            setPesanTerakhir(
              `Salah — lampu tetap nyala, coba pukul lagi bilah ${notasiRef.current[posisiRef.current] ?? '?'}.`,
            );
          }
          return;
        }
        // hit (data mentah, penilaian tetap di alat)
        setBilahTerakhir(pesan.bilah);
      },
    });
    bridgeRef.current = bridge;

    (async () => {
      const [url, custom] = await Promise.all([
        AsyncStorage.getItem(SIMPAN_URL),
        AsyncStorage.getItem(SIMPAN_LAGU),
      ]);
      if (url) setUrlBridge(url);
      if (custom) setNotasiCustom(custom);
    })();

    return () => bridge.putus();
  }, []);

  const simpanUrl = useCallback(async (url: string) => {
    setUrlBridge(url);
    await AsyncStorage.setItem(SIMPAN_URL, url);
  }, []);

  const mulaiLatihan = useCallback(
    (notasiTeks: string) => {
      let daftar: string[];
      try {
        daftar = parseNotation(notasiTeks);
      } catch (e: any) {
        setPesanTerakhir(e?.message ?? 'Notasi tidak valid.');
        return;
      }
      trackerRef.current = new SessionTracker(daftar.length);
      notasiRef.current = daftar;
      posisiRef.current = 0;
      setNotasiAktif(daftar);
      setPosisi(0);
      setStats({ ...trackerRef.current.stats });
      setTepat(null);
      setBilahTerakhir(null);
      setSedangMain(true);

      // Bilah fisik tidak 1:1 dengan angka notasi — pakai label index.
      const targetIdx = DEMUNG_LABELS.findIndex((l) => l === daftar[0]);
      const bilahFisik = targetIdx >= 0 ? targetIdx + 1 : 1;
      const terkirim = bridgeRef.current?.kirim(encodeNote(bilahFisik)) ?? false;
      setPesanTerakhir(
        terkirim
          ? `Mulai. Pukul bilah ${daftar[0]} (lampu menyala).`
          : `Mulai. Pukul bilah ${daftar[0]} — alat belum tersambung.`,
      );
    },
    [],
  );

  const ulangi = useCallback(() => {
    if (notasiAktif.length === 0) return;
    trackerRef.current = new SessionTracker(notasiAktif.length);
    posisiRef.current = 0;
    setPosisi(0);
    setStats({ ...trackerRef.current.stats });
    setTepat(null);
    setSedangMain(true);
    const pertama = notasiAktif[0];
    const idx = DEMUNG_LABELS.findIndex((l) => l === pertama);
    bridgeRef.current?.kirim(encodeNote(idx >= 0 ? idx + 1 : 1));
    setPesanTerakhir('Diulang dari awal.');
  }, [notasiAktif]);

  const berhenti = useCallback(() => {
    bridgeRef.current?.kirim(encodeLedOff());
    setSedangMain(false);
    setPesanTerakhir('Berhenti. Lampu dimatikan.');
  }, []);

  /* ---------- render ---------- */
  const warnaStatus =
    statusBridge === 'tersambung'
      ? WARNA.hijau
      : statusBridge === 'menyambung'
        ? WARNA.emas
        : WARNA.merah;

  return (
    <SafeAreaView style={s.latar}>
      <ScrollView contentContainerStyle={s.isi}>
        <Text style={s.judul}>Demung Tutor</Text>

        {/* status sambungan */}
        <View style={s.barisStatus}>
          <View style={[s.titik, { backgroundColor: warnaStatus }]} />
          <Text style={s.teksStatus}>
            {statusBridge === 'tersambung'
              ? 'Tersambung ke alat'
              : statusBridge === 'menyambung'
                ? 'Menyambung…'
                : 'Belum tersambung'}
          </Text>
          <TouchableOpacity
            style={s.tombolKecil}
            onPress={() => bridgeRef.current?.sambung(urlBridge)}
          >
            <Text style={s.teksTombolKecil}>Sambung</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.label}>Alamat bridge (IP laptop)</Text>
        <TextInput
          style={s.input}
          value={urlBridge}
          onChangeText={setUrlBridge}
          onEndEditing={() => simpanUrl(urlBridge)}
          placeholder="ws://192.168.1.10:8081"
          placeholderTextColor={WARNA.abu}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* panduan bilah besar */}
        <View style={s.panduan}>
          <Text style={s.labelPanduan}>PUKUL BILAH</Text>
          <Text style={s.angkaBesar}>{notYangHarusDimainkan ?? '—'}</Text>
          <Text style={s.subPanduan}>
            {sedangMain
              ? `Not ${Math.min(posisi + 1, Math.max(notasiAktif.length, 1))} dari ${notasiAktif.length}`
              : 'Tekan Mulai untuk latihan'}
          </Text>
        </View>

        {/* visual 6 bilah */}
        <View style={s.deretanBilah}>
          {DEMUNG_LABELS.map((label, i) => {
            const nomor = i + 1;
            const aktif =
              sedangMain &&
              notYangHarusDimainkan !== null &&
              DEMUNG_LABELS.indexOf(notYangHarusDimainkan as any) === i;
            const barusanDipukul = bilahTerakhir === nomor;
            return (
              <View
                key={label}
                style={[
                  s.bilah,
                  aktif && s.bilahAktif,
                  barusanDipukul && {
                    borderColor: tepat ? WARNA.hijau : WARNA.merah,
                  },
                ]}
              >
                <Text
                  style={[s.teksBilah, aktif && { color: WARNA.latar }]}
                >
                  {label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* pesan feedback */}
        <View style={s.pesanBox}>
          <Text style={s.teksPesan}>{pesanTerakhir || 'Selamat berlatih.'}</Text>
        </View>

        {/* tombol aksi besar */}
        <View style={s.barisTombol}>
          <TouchableOpacity
            style={[s.tombol, s.tombolUtama]}
            onPress={() =>
              mulaiLatihan(
                laguAktif ? laguAktif.notasi : notasiCustom,
              )
            }
          >
            <Text style={s.teksTombol}>Mulai</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tombol, s.tombolSekunder]} onPress={ulangi}>
            <Text style={s.teksTombolSekunder}>Ulangi</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tombol, s.tombolSekunder]} onPress={berhenti}>
            <Text style={s.teksTombolSekunder}>Berhenti</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={s.tombolTes}
          onPress={() => {
            const ok = bridgeRef.current?.kirim(encodePing());
            setPesanTerakhir(ok ? 'Tes dikirim…' : 'Belum tersambung.');
          }}
        >
          <Text style={s.teksTombolKecil}>Tes sambungan ke alat</Text>
        </TouchableOpacity>

        {/* pilih lagu */}
        <Text style={s.label}>Pilih lagu</Text>
        {LAGU_CONTOH.map((l) => (
          <TouchableOpacity
            key={l.id}
            style={[s.barisLagu, laguId === l.id && s.barisLaguAktif]}
            onPress={() => setLaguId(l.id)}
          >
            <Text style={s.judulLagu}>{l.judul}</Text>
            <Text style={s.notasiLagu} numberOfLines={1}>
              {l.notasi}
            </Text>
          </TouchableOpacity>
        ))}

        {/* notasi custom */}
        <Text style={s.label}>Notasi sendiri (angka 1-7, titik = istirahat)</Text>
        <TextInput
          style={[s.input, s.inputArea]}
          value={notasiCustom}
          onChangeText={(t) => {
            setNotasiCustom(t);
            AsyncStorage.setItem(SIMPAN_LAGU, t);
          }}
          multiline
          placeholder="contoh: 1 2 3 5 6 1 6 5 3 2 1"
          placeholderTextColor={WARNA.abu}
        />
        <TouchableOpacity
          style={[s.tombol, s.tombolSekunder, { marginTop: 12 }]}
          onPress={() => mulaiLatihan(notasiCustom)}
        >
          <Text style={s.teksTombolSekunder}>Mulai dengan notasi ini</Text>
        </TouchableOpacity>

        {/* statistik */}
        <View style={s.panelStat}>
          <View style={s.kolomStat}>
            <Text style={s.angkaStat}>{stats.benar}</Text>
            <Text style={s.labelStat}>Benar</Text>
          </View>
          <View style={s.kolomStat}>
            <Text style={s.angkaStat}>{stats.salah}</Text>
            <Text style={s.labelStat}>Salah</Text>
          </View>
          <View style={s.kolomStat}>
            <Text style={s.angkaStat}>{stats.akurasi}%</Text>
            <Text style={s.labelStat}>Akurasi</Text>
          </View>
          <View style={s.kolomStat}>
            <Text style={s.angkaStat}>{stats.streakTerbaik}</Text>
            <Text style={s.labelStat}>Rekor</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  latar: { flex: 1, backgroundColor: WARNA.latar },
  isi: { padding: 20, paddingTop: 28 },
  judul: {
    fontSize: 34,
    fontWeight: '800',
    color: WARNA.emas,
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  barisStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WARNA.panel,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  titik: { width: 16, height: 16, borderRadius: 8, marginRight: 12 },
  teksStatus: { color: WARNA.putih, fontSize: 19, flex: 1 },
  tombolKecil: {
    backgroundColor: WARNA.emasRedup,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  teksTombolKecil: { color: WARNA.putih, fontSize: 17, fontWeight: '700' },
  label: {
    color: WARNA.abu,
    fontSize: 17,
    marginBottom: 8,
    marginTop: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: WARNA.panel,
    color: WARNA.putih,
    fontSize: 20,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#3A322A',
  },
  inputArea: { minHeight: 90, textAlignVertical: 'top' },
  panduan: {
    backgroundColor: WARNA.panelAktif,
    borderRadius: 20,
    paddingVertical: 26,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: WARNA.emasRedup,
  },
  labelPanduan: {
    color: WARNA.emas,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 3,
  },
  angkaBesar: {
    color: WARNA.putih,
    fontSize: 96,
    fontWeight: '900',
    lineHeight: 110,
  },
  subPanduan: { color: WARNA.abu, fontSize: 18 },
  deretanBilah: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  bilah: {
    flex: 1,
    marginHorizontal: 4,
    aspectRatio: 0.7,
    backgroundColor: WARNA.panel,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#3A322A',
  },
  bilahAktif: { backgroundColor: WARNA.emas, borderColor: WARNA.emas },
  teksBilah: { color: WARNA.putih, fontSize: 24, fontWeight: '800' },
  pesanBox: {
    backgroundColor: WARNA.panel,
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    minHeight: 66,
    justifyContent: 'center',
  },
  teksPesan: { color: WARNA.putih, fontSize: 20, lineHeight: 28 },
  barisTombol: { flexDirection: 'row', marginBottom: 12 },
  tombol: {
    flex: 1,
    paddingVertical: 22,
    borderRadius: 14,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  tombolUtama: { backgroundColor: WARNA.emas },
  tombolSekunder: {
    backgroundColor: WARNA.panel,
    borderWidth: 2,
    borderColor: WARNA.emasRedup,
  },
  teksTombol: { color: WARNA.latar, fontSize: 24, fontWeight: '900' },
  teksTombolSekunder: { color: WARNA.emas, fontSize: 20, fontWeight: '800' },
  tombolTes: {
    backgroundColor: WARNA.panel,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#3A322A',
  },
  barisLagu: {
    backgroundColor: WARNA.panel,
    borderRadius: 12,
    padding: 18,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  barisLaguAktif: { borderColor: WARNA.emas },
  judulLagu: { color: WARNA.putih, fontSize: 21, fontWeight: '700' },
  notasiLagu: { color: WARNA.abu, fontSize: 17, marginTop: 4 },
  panelStat: {
    flexDirection: 'row',
    backgroundColor: WARNA.panel,
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
  },
  kolomStat: { flex: 1, alignItems: 'center' },
  angkaStat: { color: WARNA.emas, fontSize: 30, fontWeight: '900' },
  labelStat: { color: WARNA.abu, fontSize: 16, marginTop: 4 },
});
