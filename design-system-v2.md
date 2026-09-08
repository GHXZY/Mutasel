# design-system.md — PACUCAP (Web App) — v2

Dokumen ini adalah **pembaruan** dari `design-system.md` sebelumnya, disusun ulang berdasarkan pola visual yang benar-benar teramati dari referensi desain aktual (`Beranda.png`) dan seluruh percakapan spesifikasi sebelumnya. Versi ini menjadi **rujukan tunggal** untuk seluruh halaman PACUCAP Web — gunakan dokumen ini, bukan versi v1, sebagai source of truth.

Perbedaan utama dari v1: sistem card kini punya **dua varian berbeda** (bukan satu), section punya **ritme warna selang-seling** yang eksplisit, dan ditemukan pola-pola baru (ikon panah interaktif, elemen dekoratif huruf, shadow bertingkat) yang tidak ada di v1.

---

## Daftar Isi

1. [Prinsip Desain](#1-prinsip-desain)
2. [Palet Warna](#2-palet-warna)
3. [Tipografi](#3-tipografi)
4. [Grid, Spacing & Layout Global](#4-grid-spacing--layout-global)
5. [Ritme Warna Antar Section](#5-ritme-warna-antar-section)
6. [Tombol (Button)](#6-tombol-button)
7. [Sistem Card (2 Varian)](#7-sistem-card-2-varian)
8. [Komponen Lain](#8-komponen-lain)
9. [Elemen Dekoratif](#9-elemen-dekoratif)
10. [Dark & Light Mode](#10-dark--light-mode)
11. [Komponen Reusable — Ringkasan](#11-komponen-reusable--ringkasan)
12. [Catatan Implementasi](#12-catatan-implementasi)

---

## 1. Prinsip Desain

- **Gamified & bold** — bukan desain SaaS minimalis. Shadow tombol dan card menggunakan gaya "hard shadow" (offset solid, blur 0) sebagai identitas visual utama, terinspirasi UI game/kartu fisik.
- **Ritme selang-seling** — halaman disusun dalam blok warna bergantian (putih → hijau → putih → hijau) untuk membagi konten menjadi section yang jelas secara visual tanpa perlu garis pembatas tebal.
- **Hijau sebagai identitas, bukan aksen kecil** — berbeda dari kebanyakan produk yang memakai brand color sebagai aksen, PACUCAP menggunakan gradasi hijau sebagai **background penuh** di banyak section kunci (Hero, Game Mode, Footer, Game Page) — bukan sekadar warna tombol.
- **Card sebagai "jendela ke fitur"** — card fitur utama (Game Type, Game Mode) selalu punya area gambar/ilustrasi di atas sebagai preview visual, bukan sekadar ikon kecil + teks.

---

## 2. Palet Warna

### 2.1 Warna Primer (Brand — Green Scale)
| Token | Hex | Penggunaan |
|---|---|---|
| `primary-50` | `#EEF9E3` | Background subtle, hover state tombol Secondary |
| `primary-100` | `#DCF3C7` | Hover background ringan |
| `primary-300` | `#9BD966` | Aksen sekunder |
| `primary-500` | `#6FBE2E` | **Titik terang gradasi radial** (awal radial gradient) |
| `primary-600` | `#499A13` | **Primary utama** — fill tombol utama, titik tengah gradasi |
| `primary-700` | `#3A7C0F` | Hover/active state tombol primary |
| `primary-dark` | `#2E5C0C` | **Titik gelap gradasi Hero** (akhir radial gradient di Hero, lebih gelap dari `primary-700`) |
| `primary-stroke` | `#276F27` | Stroke & shadow tombol/card (khas "hard shadow") |
| `primary-accent` | `#BBDC12` | Highlight, badge, elemen gamifikasi (bintang, skor) |

### 2.2 Gradasi Radial Standar (dipakai berulang di berbagai section)
| Nama Gradien | Definisi | Penggunaan |
|---|---|---|
| `gradient-hero` | `radial-gradient(circle at 70% 40%, #499A13 0%, #2E5C0C 100%)` | Hero Section Beranda, background Game Page |
| `gradient-section` | `radial-gradient(circle at 50% 50%, #6FBE2E 0%, #499A13 100%)` | Section Game Mode, Footer |

> Kedua gradien di atas serupa namun **tidak identik** — `gradient-hero` lebih gelap (untuk kontras teks putih besar & gambar produk), `gradient-section` lebih terang/medium (untuk section dengan banyak card putih di atasnya).

### 2.3 Warna Netral (Light Mode)
| Token | Hex | Penggunaan |
|---|---|---|
| `bg-base` | `#FFFFFF` | Background section netral |
| `bg-surface` | `#F7F9F5` | Card list item, hover row |
| `border` | `#E2E8DD` | Divider, border input |
| `text-primary` | `#1A1F17` | Teks utama |
| `text-secondary` | `#5B6357` | Teks sekunder/deskripsi |
| `text-disabled` | `#A2AA9C` | Placeholder, state nonaktif |
| `text-on-dark` | `#FFFFFF` | Teks di atas background hijau/gradien |
| `text-on-dark-muted` | `#FFFFFF` @ 85–90% opacity | Sub-teks di atas background hijau |

### 2.4 Warna Netral (Dark Mode)
| Token | Hex | Penggunaan |
|---|---|---|
| `bg-base` | `#0F130D` | Background utama |
| `bg-surface` | `#1A2016` | Card, panel |
| `border` | `#2B3325` | Divider |
| `text-primary` | `#F2F6EE` | Teks utama |
| `text-secondary` | `#B0BAA8` | Teks sekunder |

### 2.5 Warna Semantik
| Token | Hex (Light) | Hex (Dark) | Penggunaan |
|---|---|---|---|
| `success` | `#22A559` | `#3FD177` | "Menang", status aktif |
| `warning` | `#E3A008` | `#F5C242` | Peringatan waktu |
| `error` | `#DC2626` | `#F87171` | Gagal, validasi |
| `info` | `#2563EB` | `#60A5FA` | Notifikasi umum |

> **Kontras aksesibilitas:** seluruh kombinasi teks-background wajib memenuhi **WCAG AA (≥4.5:1)** untuk teks normal, **≥3:1** untuk teks besar/heading — termasuk teks putih di atas gradasi hijau (uji di titik gradien paling terang, `primary-500`/`#6FBE2E`, karena itu titik kontras terlemah).

---

## 3. Tipografi

| Elemen | Font | Sumber |
|---|---|---|
| Headline & Button | **Afacad** (Bold/SemiBold/Medium) | Google Fonts / self-hosted |
| Body Text | **Inter** (Regular/Medium) | Google Fonts / self-hosted |

### Skala Tipografi

| Token | Ukuran | Line-height | Weight Default | Penggunaan |
|---|---|---|---|---|
| `display` | 48px | 56px | Afacad Bold | Headline hero standar (1–2 baris) |
| `display-lg` | 52–56px | 60–64px | Afacad Bold | Headline hero 3 baris manual (mis. Beranda: "Berani Berbicara, Berani Melangkah, Lebih Maju!") — ukuran fleksibel agar 3 baris tetap proporsional, bukan wrap otomatis dari `display` |
| `h1` | 36px | 44px | Afacad Bold | Judul halaman (Game Page, Rank, dsb) |
| `h2` | 28px | 36px | Afacad SemiBold | Judul section — **catatan: pada section dengan 2 baris manual (mis. "Pilih tantangan. Nyalakan mikrofon."), boleh diperbesar ke ~32px/40px agar proporsional** |
| `h3` | 22px | 30px | Afacad SemiBold | Judul card fitur (Scrolling Text, Quest, dst) |
| `h4` | 18px | 26px | Afacad Medium | Judul card How It Works, sub-label |
| `body-lg` | 16px | 24px | Inter Regular | Sub-headline, copy penting |
| `body-md` | 14px | 20px | Inter Regular | Deskripsi card, teks form, nav menu |
| `body-sm` | 12px | 16px | Inter Regular | Caption, kicker text, tagline footer |
| `label` | 13px | 18px | Inter Medium | Label form, badge |

---

## 4. Grid, Spacing & Layout Global

### 4.1 Container & Margin
| Properti | Nilai |
|---|---|
| Max-width container (konten) | `1440px`, center |
| Margin tepi (desktop, ≥1280px) | `80px` |
| Margin tepi (tablet, 768–1279px) | `40px` |
| Margin tepi (mobile, <768px) | `20px` |
| Grid kolom | 12 (desktop) / 8 (tablet) / 4 (mobile), gutter `24px` / `20px` / `16px` |

> **Penting:** section dengan background gradasi hijau (`gradient-hero`, `gradient-section`) selalu **full-bleed** (background membentang penuh selebar viewport, edge-to-edge), sementara **konten di dalamnya** (teks, card, grid) tetap dibatasi margin tepi `80px` seperti section lain. Jangan menerapkan margin tepi pada elemen background itu sendiri.

### 4.2 Header (Topbar)
| Properti | Nilai |
|---|---|
| Height | `80px` (desktop/tablet), `64px` (mobile) |
| Posisi | Sticky top, background `#FFFFFF`, border-bottom `1px solid #E2E8DD` |
| Z-index | `10` |
| Logo height | `36px` |
| Gap menu nav | `32px` |
| Menu item aktif | warna `primary-600`, font-weight lebih tebal dari item lain |
| Slot tombol kanan | **2 tombol** (Sign In outline + Sign Up filled) sebelum login; setelah login diganti Blok Akun (lihat §8.4) |
| Gap antar 2 tombol kanan | `12px` |

### 4.3 Footer
| Properti | Nilai |
|---|---|
| Background | `gradient-section` (hijau, full-bleed) |
| Padding | `64px` atas, `40px` bawah, margin tepi horizontal `80px` |
| Layout | 4 kolom (Brand, Navigasi, Mode Game, Perusahaan & Legal) + ikon sosial media |
| Gap antar kolom | `48px` |
| Warna teks | Putih, opacity 85–90% (link), 80% (tagline) |

### 4.4 Jarak Antar Section (Vertical Rhythm)
| Konteks | Nilai (desktop / mobile) |
|---|---|
| Padding vertikal section besar | `96px` / `56px` |
| Padding vertikal section FAQ (lebih ringkas) | `80px` / `48px` |
| Headline section → konten di bawahnya | `48–56px` / `32px` |
| Gap antar card dalam grid | `24px` / `16px` |
| Divider tipis antar section (opsional, mis. antara How It Works & FAQ) | `1px solid #E2E8DD`, tanpa margin tambahan (menyatu dengan padding section) |

---

## 5. Ritme Warna Antar Section

Pola wajib untuk halaman panjang bergaya landing (Beranda, Tentang Kami, dan halaman serupa):

```
Topbar          → Putih
Hero            → gradient-hero (hijau gelap, full-bleed)
Section A       → Putih
Section B       → gradient-section (hijau medium, full-bleed)
Section C       → Putih
Section D (FAQ) → Putih (tidak ada 2 section putih berurutan yang membosankan — beri divider tipis sebagai pemisah, bukan warna)
Footer          → gradient-section (hijau medium, full-bleed)
```

**Aturan:** tidak boleh ada 2 section berwarna **hijau** berurutan tanpa diselingi putih (akan membuat halaman terasa berat). Section putih boleh berurutan 2×, namun disarankan diberi divider tipis (`border-top`) sebagai pemisah visual ringan jika lebih dari satu section putih bersebelahan.

---

## 6. Tombol (Button)

### 6.1 Ukuran

| Ukuran | Height | Padding Horizontal | Font Size | Radius |
|---|---|---|---|---|
| `sm` | 32px | 12px | 13px | 8px |
| `md` | 40px | 16px | 14px | 10px |
| `lg` | 48px | 24px | 16px | 12px |
| `xl` | 56px | 32px | 18px | 14px |

Target touch minimum tetap **44×44px** (WCAG 2.1) — untuk `sm` (32px), gunakan hanya pada konteks non-primer dengan area klik yang diperluas via padding invisible bila diperlukan.

### 6.2 Varian Tombol

#### a. Primary (di atas background putih)
```
Fill: #499A13
Stroke: 2px solid #276F27
Shadow: 0 4px 0 0 #276F27 (hard shadow, blur 0)
Teks: putih, Afacad Medium/SemiBold
Hover: fill #3A7C0F
Active: shadow berkurang jadi 0 2px 0 0, translateY(2px)
Disabled: fill text-disabled, stroke & shadow dihilangkan
```

#### b. Secondary (di atas background putih)
```
Fill: #FFFFFF
Stroke: 2px solid #276F27
Shadow: 0 4px 0 0 #276F27
Teks: #276F27, Afacad Medium
Hover: fill #EEF9E3
Active: shadow 0 2px 0 0, translateY(2px)
```

#### c. **Baru — On-Dark (khusus di atas background gradasi hijau, mis. tombol "Mulai" di Hero)**
```
Fill: #FFFFFF (solid, TANPA stroke tebal)
Stroke: none (atau 1px solid rgba(255,255,255,0.2) jika ingin sedikit definisi tepi)
Shadow: 0 4px 12px rgba(0,0,0,0.15) (shadow soft, BUKAN hard-shadow — karena hard-shadow hijau tidak akan terlihat di atas background hijau)
Teks: primary-600, Afacad Medium/SemiBold
Hover: sedikit scale (1.02) atau fill primary-50
```
> Gunakan varian ini khusus untuk tombol CTA yang berada langsung di atas `gradient-hero`/`gradient-section` (Hero Beranda, Game Page). **Jangan gunakan Primary/Secondary standar di atas background hijau** — kontras shadow hijau-atas-hijau akan hilang.

#### d. Ghost/Text
```
Tanpa border/shadow, teks primary-600, hover underline
```

#### e. Destructive
```
Fill: error (#DC2626), stroke #991B1B, shadow 0 4px 0 0 #991B1B, teks putih
```

### 6.3 Tombol Mic (Circular, khusus gameplay)
```
Diameter idle: 72px
Diameter recording/aktif: 88px (transisi 200ms)
Border-radius: full
Efek recording: ripple/pulse ring melebar dari tepi, opacity fade, loop ~1.5s
```

---

## 7. Sistem Card (2 Varian)

Berbeda dari v1 yang hanya punya satu gaya card, sistem ini memiliki **dua varian card fungsional** yang berbeda tujuan:

### 7.1 Varian A — "Feature Card" (Card dengan Gambar Atas)

Digunakan untuk card yang mempromosikan sebuah **fitur/mode** (Game Type: Scrolling/Running/Text Reveal; Game Mode: Quest/Race/Self-Exercise).

```
Container:
  - Border-radius: 16px
  - Border: 2px solid #276F27
  - Shadow: 0 4px 0 0 #276F27 (hard shadow)
  - Overflow: hidden

Area Gambar (atas):
  - Height: 220px (desktop) / 180px (mobile)
  - Background: gradient-section (radial hijau medium)
  - Ilustrasi/gambar produk mengisi area, padding internal 16px
  - Ikon panah (↘) di pojok kanan-bawah area gambar — 24px, menandakan card dapat diklik/ditautkan

Footer (bawah, background putih):
  - Padding: 24px
  - Judul (h3, center)
  - Deskripsi (body-md, center, text-secondary) — bagian penutup kalimat sering ditebalkan (bold) sebagai penekanan gaya copy
  - [Opsional] Tombol CTA (Secondary, full-width di dalam footer) — dipakai di card Game Mode, TIDAK dipakai di card Game Type
```

**Radius pengecualian:** pada beberapa brief sebelumnya disebutkan radius `10px` untuk card ini — namun berdasarkan referensi visual aktual, radius yang lebih sesuai adalah **`16px`**. Gunakan `16px` sebagai standar baru untuk Feature Card, dan catat `10px` sebagai versi deprecated dari draf sebelumnya.

### 7.2 Varian B — "Content Card" (Card Horizontal, mis. How It Works)

Digunakan untuk card berisi **penjelasan langkah/proses** (How It Works), bukan promosi fitur.

```
Container:
  - Background: #FFFFFF
  - Border: 2px solid #276F27
  - Border-radius: 16px
  - Padding: 20px 24px
  - Shadow: TIDAK memakai hard-shadow menonjol (flat/border-only, agar tidak bersaing visual dengan Feature Card di section lain)
  - Layout: flex horizontal — [Badge] — gap 16px — [Judul + Deskripsi stacked]

Badge:
  - 48×48px, background primary-600, radius 10px
  - Isi: angka urutan (putih, Afacad Bold, 20px, center) — dapat diganti ikon jika konteks bukan berurutan

Teks:
  - Judul: h4 (18px, Afacad SemiBold)
  - Deskripsi: body-sm–body-md, text-secondary
  - Jarak judul→deskripsi: 4px
```

### 7.3 Varian C — "List/Panel Card" (untuk konteks aplikasi/game, bukan landing page)

Untuk konteks di luar landing page (mis. Waiting Room, Rank list item, Result Page, Pricing card) — gunakan gaya card yang lebih soft, konsisten dengan v1:

```
Background: bg-surface (#F7F9F5 light / #1A2016 dark)
Border-radius: 16px
Shadow: 0 4px 30px 0 rgba(0,0,0,0.25) (soft shadow, blur besar)
Padding: 16px–24px
Tanpa stroke/border tebal
```

> **Aturan pemilihan varian:** gunakan **Varian A** untuk promosi fitur di landing page, **Varian B** untuk konten edukatif/penjelasan proses, **Varian C** untuk komponen fungsional di dalam aplikasi (bukan halaman marketing). Jangan mencampur gaya hard-shadow (A/B) dengan soft-shadow (C) dalam satu section yang sama.

---

## 8. Komponen Lain

### 8.1 Accordion (FAQ)
```
Item container:
  - Background: #FFFFFF
  - Border-radius: 12px
  - Shadow: 0 2px 8px rgba(0,0,0,0.08) (soft shadow tipis, BUKAN hard-shadow — beda dari card fitur)
  - Padding: 20px 24px
  - Margin-bottom antar item: 12px
  - Chevron kanan, rotate 180deg saat expanded
  - Transisi: 250ms ease
```

### 8.2 Form Input
```
Height: 48px
Padding horizontal: 16px
Border: 1.5px solid #E2E8DD → fokus 1.5px solid #499A13
Border-radius: 10px
Font: Inter Regular 14px
Label: 13px Inter Medium, jarak label-input 8px
Jarak antar field: 20px
```

### 8.3 Dropdown/Select
Sama seperti Form Input + chevron kanan 16px, warna text-secondary.

### 8.4 Blok Akun (Topbar setelah login)
```
Layout: [Poin pill] [Rank pill] [Credit pill] [Avatar + Nama + Bendera]
Pill: padding 6px 12px, radius full, fill bg-surface, icon 16px + teks body-sm medium, gap 6px
Avatar: 36px circle
Gap antar elemen: 20px
```

### 8.5 Elemen Dekoratif Latar (Hero)
Lihat §9.

---

## 9. Elemen Dekoratif

### 9.1 Huruf Besar Transparan (Hero Beranda)
```
Karakter: huruf acak (A, Z, C, B, dst.) merepresentasikan konten "speaking/reading"
Font: Afacad Bold
Ukuran: 64px–120px, bervariasi antar huruf
Warna: hijau lebih gelap dari background section, opacity 15–20%
Posisi: tersebar di belakang gambar mikrofon Hero, tidak mengganggu keterbacaan konten utama
Aksesibilitas: aria-hidden="true" (dekoratif murni, tidak dibaca screen reader)
```

### 9.2 Ikon Panah Interaktif (↘)
```
Digunakan di pojok kanan-bawah area gambar pada Feature Card (§7.1)
Ukuran: 24px
Fungsi: penanda visual bahwa card dapat diklik/mengarah ke halaman lain
Warna: putih atau hijau tua tergantung kontras area gambar
```

---

## 10. Dark & Light Mode

- Mode default mengikuti `prefers-color-scheme`, toggle manual tersimpan di akun/local state.
- **Section dengan background gradasi hijau (`gradient-hero`, `gradient-section`) TIDAK berubah signifikan antara light/dark mode** — karena sudah berupa warna solid/gradien brand, bukan token netral. Hanya section berbackground putih (`bg-base`) yang berubah mengikuti tema.
- Feature Card (§7.1) footer putihnya berubah mengikuti `bg-surface` dark saat dark mode, namun area gambar atas (`gradient-section`) tetap sama.
- Tombol Primary/Secondary/On-Dark **tidak berubah warna** di dark mode (brand color konsisten) — hanya kontras teks netral di sekitarnya yang menyesuaikan.

---

## 11. Komponen Reusable — Ringkasan

| Komponen | Varian Card Terkait | Digunakan di |
|---|---|---|
| `Topbar` | — | Global, 2 varian (before/after login) |
| `Footer` | — | Global |
| `Button` | — | Global, 5 varian (Primary/Secondary/On-Dark/Ghost/Destructive) |
| `FeatureCard` | Varian A | Game Type, Game Mode (Beranda), Game Page |
| `ContentCard` | Varian B | How It Works |
| `PanelCard` | Varian C | Waiting Room, Rank list, Result Page, Pricing |
| `AccordionItem` | — | FAQ |
| `MicButton` | — | Trying Page, On Game Page |
| `AccountBlock` | — | Topbar (after login) |

---

## 12. Catatan Implementasi

- Definisikan `gradient-hero` dan `gradient-section` sebagai **CSS custom properties** atau utility class Tailwind kustom (`bg-gradient-hero`, `bg-gradient-section`) — jangan tulis ulang nilai radial-gradient di tiap komponen.
- Karena ada **3 gaya shadow berbeda** dalam sistem ini (hard-shadow tombol/Feature Card, soft-shadow Panel Card, shadow tipis Accordion), definisikan masing-masing sebagai token terpisah di `tailwind.config.ts`:
  ```js
  boxShadow: {
    'hard': '0 4px 0 0 #276F27',
    'hard-sm': '0 2px 0 0 #276F27',
    'panel': '0 4px 30px 0 rgba(0,0,0,0.25)',
    'soft': '0 2px 8px 0 rgba(0,0,0,0.08)',
  }
  ```
- Elemen dekoratif (§9.1) sebaiknya dibangun sebagai komponen SVG terpisah (`<DecorativeLetters />`) yang dapat di-reuse jika pola serupa dipakai di halaman lain (mis. Tentang Kami), bukan di-hardcode di dalam komponen Hero.
- Dokumen ini **menggantikan** `design-system.md` v1 sebagai rujukan utama. Simpan v1 sebagai arsip/riwayat keputusan desain jika diperlukan, namun implementasi baru wajib mengacu ke v2 ini.
- Rujuk `Wireframe.md` untuk struktur navigasi/halaman, dan `Prompt-Beranda-UI.md` / `Prompt-Build-Website-UI.md` untuk detail spesifik per halaman yang sudah dibangun berdasarkan sistem ini.
