# Mutasel: Classroom Connector

Aplikasi Windows untuk satu ruang guru dan satu ruang siswa melalui LAN. Guru mengirim video dan audio; siswa mengirim audio hanya setelah guru mengizinkan. Tidak memakai internet saat runtime, cloud, database, recording, analytics, atau STUN/TURN eksternal.

## Arsitektur dan berkas

- `apps/desktop/electron`: lifecycle Electron, settings JSON, IPC terbatas, izin media dan pembatasan koneksi jaringan.
- `apps/desktop/renderer`: React + TypeScript, UI, pengaturan, perangkat dan WebRTC native.
- `packages/signaling`: Fastify + ws, otoritas izin bicara, heartbeat, mDNS dan UDP discovery.
- `packages/shared`: skema Zod dan protokol TypeScript.
- `tests`: Vitest untuk protokol/server; Playwright untuk dua proses Electron dengan media simulasi.
- `scripts`: development, bundling, smoke test dan pemeriksaan layout.
- `docs`: arsitektur, verifikasi, dan checklist uji sekolah.

Media **langsung P2P** dengan Opus dan video guru target 720p/24 fps. Server hanya membawa signaling dan kontrol. Adaptasi video mengurangi bitrate, framerate, dan resolusi ketika RTT tinggi. Student camera tidak dibuka. Izin siswa kembali MUTED setelah peer terputus. Penguncian audio juga diterapkan pada penerima Teacher.

Desain mengacu pada `design-system-v2.md`: hijau, Afacad/Inter lokal, panel aplikasi dan tema terang/gelap. `PromtGuide.md` digunakan untuk pemisahan tanggung jawab, validasi server, dan verifikasi; contoh fitur PACUCAP tidak termasuk aplikasi ini.

## Menjalankan dari source

Lingkungan build: Windows, Node.js 22 atau lebih baru, npm.

```powershell
npm ci
npm run dev
```

Untuk hasil build production:

```powershell
npm run build
npm start
```

Vite hanya server development di loopback. Aplikasi terpasang memuat renderer dari berkas lokal. Browser biasa dapat digunakan untuk preview UI, tetapi discovery dan Teacher server memerlukan Electron.

## Build EXE dan installer

```powershell
npm run dist
# Alias:
npm run package
```

Output NSIS: `release/Mutasel-Classroom-Connector-Setup-1.2.0.exe`.
Executable hasil packaging: `release/win-unpacked/Mutasel Classroom Connector.exe` (folder pendukung harus ikut disalin jika menjalankan versi unpacked).

Installer berisi Electron, renderer, server, discovery dan aset. Komputer sekolah tidak perlu Node.js, npm, Python, atau internet. Build pertama membutuhkan internet untuk dependency dan tool NSIS. Installer belum ditandatangani dengan sertifikat penerbit; Windows dapat menampilkan peringatan penerbit tidak dikenal.

Nama tampilan produk adalah **Mutasel: Classroom Connector**. Nama EXE dan shortcut tidak memakai titik dua karena pembatasan nama berkas Windows. Logo bersumber dari `Logo Mutasel.svg`; salinan SVG renderer dan ikon Windows tersedia di repository. Setelah memperbarui SVG, jalankan `npm run icons` (memerlukan build Electron yang sudah tersedia), lalu `npm run dist`.

## Instalasi komputer guru

1. Jalankan installer, pilih lokasi, lalu buka Mutasel: Classroom Connector.
2. Pilih **Ruang guru**. Server lokal otomatis aktif selama aplikasi terbuka.
3. Di **Pengaturan → Perangkat**, pilih mikrofon, kamera dan speaker. Jalankan tes lokal.
4. Periksa pratinjau kamera dan tombol Mikrofon/Kamera. Guru dapat berbicara tanpa menunggu permintaan siswa.
5. Biarkan aplikasi terbuka. Saat siswa meminta bicara, pilih **Izinkan** atau **Tolak**. Pilih **Akhiri izin bicara** untuk menonaktifkan suara siswa.

## Instalasi komputer siswa

1. Pasang installer yang sama, pilih **Ruang siswa**.
2. Minta **Kode jaringan** dan **Kode unik sesi** yang tampil di halaman Kelas komputer guru. Isi keduanya di formulir **Sambung dengan kode**.
3. Tekan **Sambungkan dengan kode**. Kode salah atau sesi lama ditolak oleh server sebelum media tersambung. Mikrofon siswa tidak mengirim suara sebelum disetujui.
4. Pilih speaker dan atur slider **Volume speaker** di panel kelas. Tombol fullscreen pada tayangan memperbesar video saja; klik lagi atau tekan Esc untuk keluar. **F11** memperbesar seluruh jendela aplikasi.
5. Tekan **Minta izin berbicara**. Setelah disetujui, berbicara; tekan **Selesai berbicara** bila selesai.

Peran dan perangkat tersimpan di `%APPDATA%/local-classroom/settings.json`. Ganti peran melalui **Pengaturan → Umum**. Opsi startup Windows berlaku pada versi terpasang. Tutup aplikasi untuk menghentikan server; tidak berjalan tersembunyi di tray.

## Sambungan sesi pada versi 1.2

Kode jaringan berformat `MS-XXXXXXXX-XXXX`, memuat IPv4 lokal dan port guru. Jika komputer guru memiliki beberapa adapter, gunakan kode jaringan yang sama-sama dapat dijangkau kedua perangkat. Kode unik terdiri dari 12 karakter heksadesimal acak, dibuat dengan generator kriptografis dan hanya disimpan di memori server. Kode ini tidak diumumkan melalui discovery atau endpoint status.

Sesi baru dibuat ketika guru kembali ke beranda lalu memilih Ruang guru, membuka ulang aplikasi guru, atau mengubah port guru. Kode lama langsung tidak berlaku; masukkan kode terbaru untuk bergabung kembali. Gangguan LAN singkat tetap memakai kode sesi yang sama selama server guru masih berjalan. Komputer siswa tidak otomatis memilih guru pertama atau menyambung saat aplikasi dibuka. Pasang versi 1.2 pada kedua komputer.

Beberapa pasangan ruang dapat menggunakan LAN yang sama; setiap sesi tetap memiliki satu guru dan satu ruang kelas. Perangkat tambahan tidak dapat mengambil alih slot yang sudah terisi. Kode sesi bertujuan mencegah salah sambung, bukan menggantikan keamanan jaringan.

## Kontrol baru pada versi 1.1

- **Kembali ke beranda** tersedia di atas layar kelas. Koneksi dan media dihentikan sebelum kembali ke pilihan Ruang guru/Ruang siswa. Pilih peran lagi untuk memulai; pengaturan perangkat dan volume tetap tersimpan.
- **Fullscreen kamera/tayangan** memperbesar area video, dengan tombol keluar tetap dapat diklik. Pemutar audio tersembunyi tidak lagi menutupi kontrol.
- **Mode presentasi** pada Teacher mengirim layar komputer menggantikan video kamera. Pilih monitor pada dialog; **Batal** tidak memulai pembagian layar. Tekan **Hentikan presentasi** untuk kembali ke kamera. Mikrofon guru tetap digunakan; audio sistem tidak ikut dibagikan. Siswa menerima tayangan melalui koneksi P2P yang sama. Tidak ada rekaman.
- **Volume speaker** dapat digeser 0–100% langsung di kelas dan tersimpan ketika slider dilepas atau tombol keyboard selesai ditekan. Tombol mute tetap tersedia.

## LAN dan Firewall

Gunakan Ethernet jika tersedia. Dua komputer harus saling menjangkau pada LAN, tanpa Wi-Fi client/AP isolation. Jika VLAN berbeda, minta pengelola jaringan memeriksa routing/ACL; discovery multicast biasanya tidak melintasi VLAN.

- Signaling: TCP **45700** default, dapat diubah di kedua perangkat.
- Discovery fallback: UDP **45701**, query broadcast lokal.
- mDNS: UDP **5353**, service `_localclassroom._tcp` / `LOCAL_CLASSROOM_TEACHER`.
- Media WebRTC: UDP **port dinamis**, langsung kedua komputer. Membuka port signaling saja tidak cukup.

Di Windows Security → Firewall & network protection → Allow an app through firewall, izinkan **Mutasel Classroom Connector.exe** pada jaringan **Private** di kedua komputer. Disarankan rule berdasarkan program dengan cakupan subnet lokal; jangan menonaktifkan Firewall keseluruhan. Jika rule organisasi memblokir outbound, izinkan juga traffic lokal aplikasi. Tidak ada rule yang diubah otomatis oleh aplikasi.

Kode jaringan hanya menerima IPv4 loopback atau rentang RFC1918 (10/8, 172.16/12, 192.168/16). IPv6-only dan alamat publik bukan target versi ini. Sistem ditujukan untuk LAN sekolah terpercaya. Signaling lokal menggunakan ws tanpa TLS; kode sesi tidak menggantikan keamanan jaringan. Media WebRTC menggunakan enkripsi DTLS-SRTP bawaan.

## Perangkat dan troubleshooting

- **Guru tidak ditemukan:** periksa aplikasi guru, IP, port, LAN, Firewall, isolasi Wi-Fi dan VLAN. Discovery dan akses media tidak dapat dipastikan hanya dengan ping.
- **Signaling terhubung, media gagal:** periksa UDP dinamis/Firewall. Lihat status WebRTC dan RTT di Diagnostik.
- **Mikrofon/kamera tidak tersedia:** pastikan Windows mengizinkan aplikasi desktop mengakses perangkat, lepaskan perangkat dari aplikasi lain, lalu pilih ulang. Audio tetap berjalan bila kamera gagal.
- **Suara tidak terdengar:** periksa status izin siswa, mute, volume aplikasi, pilihan speaker, dan output Windows. Uji speaker menghasilkan nada lokal 600 ms.
- **Echo:** jauhkan speaker dari mikrofon, gunakan mikrofon directional. Echo cancellation, noise suppression dan auto gain aktif; penempatan hardware tetap penting.
- **USB dilepas:** aplikasi memeriksa devicechange dan beralih ke default bila pilihan hilang; pilih perangkat baru lewat pengaturan. Bluetooth dapat menambah latency atau mengubah profil kualitas ketika mikrofon digunakan.
- **Putus LAN:** reconnect otomatis menggunakan backoff sampai 15 detik; WebRTC mencoba ICE restart lalu membuat ulang peer melalui reconnect. Izin siswa selalu dicabut saat pemulihan.
- **Port sibuk:** ubah port di pengaturan kedua komputer. Simpan ulang pengaturan Teacher untuk mencoba menyalakan server kembali.

Diagnostik menyimpan maksimal 60 kejadian di memori, hilang ketika aplikasi ditutup. Tidak menulis media atau log pribadi ke disk. Indikator internet menyatakan tidak dibutuhkan; aplikasi tidak menghubungi situs luar untuk mengetes internet. Gangguan VLAN/firewall/isolation disampaikan sebagai kemungkinan penyebab, bukan diagnosis pasti tanpa akses jaringan.

## Pengujian

```powershell
npm test
npm run build
npm run test:e2e
node scripts/smoke.mjs
node scripts/visual-check.mjs
```

E2E memakai dua proses Electron, profil data terpisah, dan perangkat audio/video simulasi Chromium. Tidak merekam media. Profil uji berada di `.test-data/`; hasil UI statis di `docs/previews/`. Pengujian dua proses pada satu komputer tidak menggantikan uji fisik dua komputer. Lihat [checklist sekolah](docs/MANUAL-TESTS.md) dan [hasil verifikasi](docs/VERIFICATION.md).

Referensi implementasi: [Electron security](https://www.electronjs.org/docs/latest/tutorial/security), [Context Isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation), [electron-builder NSIS](https://www.electron.build/nsis/).


