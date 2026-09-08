# Hasil verifikasi — 7 September 2026

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

Versi ini menggunakan IPv4 privat dan LAN terpercaya. Student memakai satu slot tanpa pairing secret. Server signaling lokal tidak memakai TLS. Installer belum memiliki tanda tangan sertifikat penerbit. Tidak ada klaim production acceptance sebelum checklist hardware selesai.
