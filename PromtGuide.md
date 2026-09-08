# Prompt Guide — PACUCAP (Vibe Coding)

Panduan menulis prompt yang efektif saat menggunakan AI coding agent (Claude Code, Cursor, Claude di chat, dll.) untuk membangun aplikasi PACUCAP. Tujuannya: hasil kode konsisten dengan `SRS_PACUCAP.md`, `AGENTS.md`, dan `CodingStandards.md` — bukan cuma kode yang "terlihat jalan".

---

## 1. Prinsip Dasar Prompting untuk Proyek Ini

1. **Rujuk dokumen, jangan jelaskan ulang dari nol.** Karena sudah ada `SRS_PACUCAP.md`, `AGENTS.md`, dan `CodingStandards.md`, arahkan agent untuk membaca dokumen tersebut alih-alih menjelaskan seluruh requirement di prompt.
2. **Satu prompt = satu unit kerja.** Jangan minta "buatkan seluruh fitur Race" dalam satu prompt. Pecah per alur: matchmaking → waiting room → game session → hasil.
3. **Sebutkan kontrak/aturan spesifik, bukan cuma tujuan.** Untuk domain sensitif (skor, kredit, langganan), sebutkan aturan validasi server yang wajib diikuti, jangan asumsikan agent otomatis tahu dari SRS.
4. **Minta agent menyatakan asumsi.** Kalau requirement ambigu, minta agent bertanya balik atau menyatakan asumsi secara eksplisit sebelum menulis kode — bukan langsung menebak.
5. **Verifikasi, jangan langsung percaya.** Setelah agent menyelesaikan task, minta ringkasan apa yang diubah dan test apa yang ditambahkan, sebelum merge/lanjut ke task berikutnya.

## 2. Struktur Prompt yang Direkomendasikan

```
Konteks   : [fitur/alur apa, rujuk bagian SRS mana]
Tugas     : [apa yang harus dibuat/diubah, spesifik]
Batasan   : [aturan wajib: validasi server, stack yang dipakai, dll.]
Output    : [file apa yang diharapkan berubah/dibuat]
Verifikasi: [test/kriteria sukses yang harus dipenuhi]
```

## 3. Contoh Prompt per Domain

### 3.1 Fitur Quest

> **Baik:**
> "Rujuk `SRS_PACUCAP.md` bagian Quest dan `AGENTS.md` §4.2. Implementasikan endpoint untuk mengambil progres stage pengguna (`GET /api/quest-progress`). Progres harus granular per level (bukan hanya status stage), dan stage N+1 harus dikunci di server jika stage N belum selesai — jangan hanya mengandalkan validasi UI. Tambahkan unit test untuk kasus: pengguna mencoba akses level di stage yang belum terbuka."

> **Kurang baik:**
> "Buatkan fitur quest-nya."
> *(terlalu umum, tidak menyebut validasi server, tidak ada kriteria sukses)*

### 3.2 Fitur Race (Real-time)

> **Baik:**
> "Implementasikan event `race:player-ready` di realtime layer sesuai `docs/realtime-events.md` (buat dulu file itu jika belum ada). Server harus menunggu seluruh pemain di room (maks 4) menekan ready sebelum mengirim event `race:game-start` dengan countdown. Tangani kasus salah satu pemain disconnect setelah ready — status room harus berubah ke `reconnecting`, bukan diam. Sertakan test untuk skenario: 3 dari 4 pemain ready, satu disconnect sebelum ready."

> **Kurang baik:**
> "Bikin sistem multiplayer race-nya biar bisa main bareng."

### 3.3 Scoring / Matchmaking (High-risk)

> **Baik:**
> "JANGAN ubah rumus WPM/WP5S/akurasi yang sudah ada di `/core/scoring`. Tugas ini hanya menambahkan logging skor akhir ke tabel `race_results` setelah game selesai, dihitung ulang di server dari raw transcript — bukan dari nilai yang dikirim klien. Tunjukkan diff logic validasi sebelum saya approve."

> **Kurang baik:**
> "Perbaiki sistem skornya biar lebih akurat."
> *(berisiko agent mengubah rumus inti tanpa konfirmasi — lihat `AGENTS.md` §7)*

### 3.4 Pricing / Subscription

> **Baik:**
> "Implementasikan webhook validasi receipt dari Google Play Billing untuk paket Pro. Status langganan di database HARUS diperbarui dari hasil validasi server-to-server, bukan dari klaim klien setelah pembelian sukses secara lokal. Tambahkan test: langganan expired otomatis nonaktifkan akses Self-Exercise."

### 3.5 UI/Komponen non-kritis

> **Boleh lebih longgar** karena risiko rendah:
> "Buatkan komponen `RankLeaderboardCard` sesuai desain di FigJam untuk menampilkan peringkat Global/Local/Friends, ikuti konvensi penamaan di `CodingStandards.md` §2."

## 4. Pola Prompt untuk Debug / Perbaikan Bug

```
Bug     : [gejala yang terlihat]
Repro   : [langkah reproduksi]
Dugaan  : [file/fungsi yang dicurigai, kalau tahu]
Batasan : jangan ubah logic scoring/matchmaking kecuali itu akar masalahnya;
          kalau ternyata perlu, jelaskan dulu sebelum mengubah.
```

## 5. Pola Prompt untuk Review Kode

> "Review perubahan di `[nama file/PR]`. Cek terhadap `CodingStandards.md`: penamaan, pemisahan `/core` dari UI, ada tidaknya validasi server untuk data yang berdampak pada skor/kredit/langganan. Tandai bagian yang berisiko sesuai daftar 'tidak boleh diubah tanpa konfirmasi' di `AGENTS.md` §7."

## 6. Hal yang Perlu Dihindari Saat Prompting

- Jangan minta agent "buat semuanya sekaligus" (auth + quest + race + pricing dalam satu prompt) — hasilnya sulit direview dan besar risiko drift dari spesifikasi.
- Jangan gunakan istilah yang tidak ada di SRS (mis. menyebut fitur "leaderboard mingguan" padahal tidak ada di spesifikasi) tanpa menjelaskan itu penambahan baru di luar SRS.
- Jangan minta agent "optimalkan performa" tanpa metrik jelas — sebutkan target konkret (mis. "response API rank di bawah 300ms untuk 10rb pengguna") kalau memang itu tujuannya.
- Jangan skip langkah verifikasi — selalu minta ringkasan perubahan + test sebelum lanjut ke prompt berikutnya, terutama untuk domain high-risk (§3.3, §3.4).

## 7. Checklist Sebelum Mengirim Prompt

- [ ] Apakah saya sudah merujuk bagian SRS/AGENTS/CodingStandards yang relevan?
- [ ] Apakah scope prompt ini satu unit kerja yang jelas (bukan gabungan banyak fitur)?
- [ ] Apakah saya sudah menyebutkan batasan wajib (validasi server, jangan ubah rumus, dsb.) bila relevan?
- [ ] Apakah saya sudah menentukan kriteria sukses/test yang diharapkan?
- [ ] Apakah saya siap memverifikasi hasilnya, bukan langsung merge?