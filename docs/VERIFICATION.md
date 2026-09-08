# Hasil verifikasi — 7 September 2026

## Versi 1.2.0 — sambungan dua kode (8 September 2026)

Build TypeScript/Vite/Electron dan installer NSIS v1.2.0 berhasil. Smoke test EXE produksi lulus: nama/logo, versi 1.2.0, kode guru berubah setelah kembali ke beranda dan memulai ruang guru lagi, serta formulir siswa kosong dan siap untuk kode baru. Pemeriksaan layout tidak menemukan overflow horizontal pada 1280×720, 1366×768, dan 1920×1080.

Kode jaringan menentukan IPv4/port guru secara langsung. Kode unik 12 karakter dibuat acak di server untuk setiap sesi guru baru. Server memvalidasi kedua kode sebelum menerima Student; discovery dan endpoint status tidak memuat kode unik. Koneksi Student selalu dimulai secara manual, dengan reconnect otomatis hanya pada sesi yang sama.

Vitest 7/7 lulus: validasi kode lokal, kode kosong/salah/kedaluwarsa, isolasi dua server guru bersamaan, penolakan perangkat ketiga pada slot terisi, serta regresi protokol dan izin bicara. E2E dua proses Electron lulus: isi kode salah melalui UI lalu koreksi, sambungan media, fullscreen, volume, presentasi, izin bicara, reconnect, penolakan kode lama setelah restart guru, masuk memakai kode baru, dan pertukaran peran. Uji video simulasi 60,061 detik: 1.197 frame, rata-rata 19,93 fps, 1 dropped frame. Hasil ini tidak menggantikan pengujian beberapa komputer fisik pada LAN sekolah.

Pengujian versi terdahulu di bawah merupakan riwayat; pada versi 1.2, restart guru memulai sesi baru sehingga siswa harus memasukkan kode baru.

## Versi 1.1.0 — kontrol kelas dan uji kelancaran (8 September 2026)

Installer NSIS `Mutasel-Classroom-Connector-Setup-1.1.0.exe` berhasil dibangun. Smoke test EXE produksi tanpa Vite lulus, termasuk layar pemilihan peran, judul, logo, nama produk, dan IPC versi 1.1.0/build 1. Sandbox dan context isolation aktif. Checksum installer tersedia di `release/SHA256SUMS.txt`.

Perubahan: tombol Kembali ke beranda, pemilihan ulang Teacher/Student, fullscreen khusus video, mode presentasi yang mengirim layar komputer guru, slider volume speaker 0–100%, dan penyimpanan settings berurutan. Pemutar audio tersembunyi tidak lagi menghalangi tombol video. Izin fullscreen dibatasi pada renderer aplikasi terpercaya; screen capture hanya untuk Teacher setelah memilih monitor.

Uji Vitest 4/4 lulus. Skenario Playwright dua Electron lulus, mencakup:

- Fullscreen masuk/keluar pada Teacher dan Student.
- Volume 0%, 1%, 100% diterapkan pada media dan disimpan.
- Tiga siklus kamera → presentasi → kamera, dengan frame tetap diterima Student.
- Request/approve/reject/mute, reconnect, discovery, restart Teacher dan pemulihan sesi.
- Kembali ke beranda pada kedua perangkat, server berhenti, lalu saling bertukar peran dan terhubung kembali.
- Pemantauan video 60,048 detik: **1.197 frame**, **19,93 fps rata-rata**, **0 dropped frame**; jumlah frame bertambah pada setiap sampel 5 detik.

Uji awal menemukan putus tayangan saat pemulihan dan jendela berada di latar belakang. Renderer kini menggunakan `backgroundThrottling: false`; uji ulang berkelanjutan lulus. Meter mikrofon juga hanya memperbarui UI ketika panel pengaturan terbuka.

Media kamera/audio memakai perangkat simulasi Chromium. Pengujian presentasi menjalankan alur getDisplayMedia/desktopCapturer dengan sumber dibatasi ke jendela aplikasi uji; pemilihan dialog diotomatisasi. Tidak mengambil atau merekam isi layar pribadi. Hasil satu menit pada satu komputer tidak menggantikan pengujian LAN dua komputer fisik, monitor ganda, suara hardware, dan sesi tiga jam.

## Pembaruan branding — 8 September 2026

Nama produk diubah menjadi **Mutasel: Classroom Connector**. SVG asli `Logo Mutasel.svg` dipakai pada header dan dikonversi menjadi ICO 16/24/32/48/64/128/256 px untuk executable, installer dan shortcut Windows. Nama berkas menggunakan `Mutasel Classroom Connector` tanpa titik dua. App ID, protokol discovery dan lokasi settings tetap kompatibel dengan versi sebelumnya.

Build TypeScript/Vite/Electron dan skenario E2E dua proses lulus setelah rename, termasuk media P2P, izin bicara, discovery, penyimpanan pengaturan dan reconnect. Pratinjau diperbarui; ketiga resolusi desktop tetap tanpa overflow horizontal.

EXE produksi `Mutasel Classroom Connector.exe` berhasil dijalankan tanpa Vite. Judul, logo, dan `app.getName()` terverifikasi; metadata ProductName/FileDescription memuat `Mutasel: Classroom Connector`. Ikon diekstrak kembali dari EXE untuk pemeriksaan visual. Konfigurasi tetap nodeIntegration=false, contextIsolation=true, sandbox=true.

## Berhasil

| Pemeriksaan | Hasil |
|---|---|
| TypeScript strict, Vite renderer, bundling Electron | Lulus |
| Vitest | 4/4 test lulus |
| Playwright dua proses Electron | 1 skenario integrasi lengkap lulus |
| Teacher/Student role selection | Lulus |
| Validasi payload dan token Teacher | Lulus |
| Relay offer, answer, ICE | Lulus |
| WebRTC P2P dengan video simulasi dan audio track penerima | Lulus |
| Request, approval, rejection, mute dan penguncian audio penerima | Lulus |
| Disconnect/reconnect manual | Lulus |
| Discovery lokal dari proses Student | Lulus |
| Teacher ditutup/dibuka; Student reconnect otomatis | Lulus |
| Peran dan tema bertahan setelah relaunch | Lulus |
| Pengaturan dan diagnostik | Lulus |
| Layout 1280×720, 1366×768, 1920×1080 | Tidak ada overflow horizontal |
| npm audit setelah pembaruan Electron 44.2.0 | 0 vulnerability |
| electron-builder Windows x64 NSIS | Berhasil menghasilkan installer |
| Startup EXE unpacked tanpa Vite | Lulus, IPC mengembalikan versi 1.0.0/build 1 |
| WebPreferences pada EXE produksi | nodeIntegration=false, contextIsolation=true, sandbox=true |

Vitest mencakup skema dan IP privat, token Teacher, perubahan permission, relay SDP/ICE dan pengisian ulang slot Student. E2E memakai media simulasi Chromium, bukan kamera atau mikrofon pengguna. Output screenshot hanya UI kosong untuk pemeriksaan desain, tidak merekam sesi kelas.

## Batas verifikasi

Belum dilakukan: instal/uninstal interaktif NSIS pada komputer sekolah, uji terpisah Windows 10, dua komputer fisik dengan internet dimatikan, cabut/pasang perangkat USB dan Bluetooth fisik, kualitas suara/echo/latency aktual, VLAN dan kebijakan Firewall sekolah, serta sesi tiga jam. Checklist lengkap berada di `MANUAL-TESTS.md`.

Versi ini menggunakan IPv4 privat dan LAN terpercaya. Student memakai satu slot yang dilindungi kode sesi sejak versi 1.2. Server signaling lokal tidak memakai TLS. Installer belum memiliki tanda tangan sertifikat penerbit. Tidak ada klaim production acceptance sebelum checklist hardware selesai.
