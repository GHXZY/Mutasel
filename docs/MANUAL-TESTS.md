# Checklist penerimaan dua komputer

Belum dijalankan pada hardware sekolah. Catat tanggal, versi Windows, versi aplikasi, perangkat, jaringan, dan hasil untuk setiap langkah.

- [ ] Instal EXE pada Windows 10 dan Windows 11 tanpa Node/npm/Python.
- [ ] Pilih Teacher dan Student; tutup/buka aplikasi dan pastikan peran tersimpan.
- [ ] Matikan akses internet sambil mempertahankan LAN. Pastikan discovery, audio, video dan request-to-speak tetap bekerja.
- [ ] Uji Ethernet dan Wi-Fi tanpa AP/client isolation.
- [ ] Uji mDNS dan fallback UDP; blok discovery sementara dan uji alamat manual.
- [ ] Student awal MUTED, kamera tidak dibuka; guru terdengar dan terlihat.
- [ ] Student meminta bicara, guru menerima, audio siswa terdengar.
- [ ] Guru menolak: mikrofon siswa tetap tidak mengirim suara.
- [ ] Guru mencabut izin saat siswa berbicara: suara langsung berhenti.
- [ ] Student selesai bicara dan membatalkan permintaan.
- [ ] Cabut kabel LAN 30 detik lalu pasang: sambung kembali tanpa restart aplikasi; izin siswa kembali MUTED.
- [ ] Tutup/buka Teacher saat Student aktif: Student tersambung kembali.
- [ ] Cabut/pasang USB mic, kamera dan speaker; uji fallback serta pemilihan ulang.
- [ ] Ganti perangkat selama sesi; pastikan replaceTrack menjaga koneksi.
- [ ] Uji kamera gagal tetapi audio tetap bekerja; mikrofon gagal tetapi video tetap bekerja.
- [ ] Tes volume input/output 0, 50, 100; mute, kamera, speaker dan F11.
- [ ] Coba izin Windows ditolak: pesan dapat dipahami, tidak crash.
- [ ] Buka aplikasi kedua: fokus ke instance yang ada, tidak menyalakan server kedua.
- [ ] Uji startup Windows dan fullscreen pada aplikasi terpasang.
- [ ] Uji layar 1280×720, 1366×768, 1920×1080, tema gelap, navigasi keyboard dan mode presentasi.
- [ ] Izinkan TCP signaling tetapi blok UDP media: pastikan diagnostik membedakan status signaling/media.
- [ ] Jalankan sesi 3 jam. Catat CPU/memori/RTT/jitter tiap 30 menit; periksa suara, gambar, pertumbuhan memori dan reconnect.

Kualitas audio nyata, latency antargedung, perilaku Bluetooth, Firewall sekolah, dan stabilitas tiga jam memerlukan pengujian ini sebelum penggunaan kelas produksi.
