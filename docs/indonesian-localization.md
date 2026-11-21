# Rencana dukungan bahasa Indonesia di SignuDoc

Status: **Fase 1 diterapkan, belum dirilis**. Rencana ini menjadi acuan implementasi; terutama pengalaman signer dan emailnya yang sudah diubah.

Dibuat: 2026-11-21

## 1. Temuan saat ini

- SignuDoc belum memiliki lapisan internasionalisasi. Tidak ada dependensi `next-intl`, `react-i18next`, `lingui`, atau sejenisnya di `package.json`.
- `next.config.ts` tidak mengatur locale; `src/app/layout.tsx:30` menuliskan `<html lang="en">` secara tetap.
- Seluruh teks UI, email, dan pesan galat ditulis langsung dalam bahasa Inggris di komponen dan layanan.
- README sendiri mencantumkan keterbatasan ini: `README.md:164` — _"Languages — signing pages in English"_.
- Satu-satunya kode yang membaca preferensi bahasa adalah `src/app/api/signing/[token]/provider/start/route.ts:64`, yang meneruskan `Accept-Language` ke penyedia tanda tangan eksternal (eID Easy / CSC). Ini tidak menerjemahkan SignuDoc.
- Font CJK yang dibundling (`src/assets/fonts/`) hanya untuk mencetak nama signer di PDF, bukan untuk terjemahan antarmuka.

Skala yang terlibat: sekitar 113 file `.tsx` dan 80 file `.ts` di `src/app` + `src/components`, 18 jenis email (`src/lib/types/domain.ts:105-124`), 13 spesifikasi Playwright di `e2e/`, dan 35 migrasi SQL di `db/migrations/`.

## 2. Keputusan desain yang disarankan

### 2.1 Locale

- `en` tetap menjadi default, `id` ditambahkan sebagai locale baru.
- Gunakan kode `id` (bukan `id-ID`) agar sederhana; `id-ID` bisa ditambahkan kemudian sebagai fallback jika diperlukan.
- Kamus bertipe: satu file sumber `en` sebagai kanon, lalu `id` harus memiliki kunci yang persis sama.

### 2.2 Routing: locale lewat cookie, URL tidak berubah

Dokumen Next.js 16 yang terpasang (`node_modules/next/dist/docs/01-app/02-guides/internationalization.md`) merekomendasikan prefiks jalur (`/id/...`), Proxy, dan memindahkan seluruh halaman ke `app/[lang]`. Itu pola yang bersih untuk situs baru, **tetapi berisiko untuk instalasi yang sudah dipakai**:

- Link tanda tangan yang sudah dikirimkan berbentuk `/sign/<token>` dan tidak boleh berubah.
- Callback auth `/api/auth/callback/sso`, webhook, endpoint API v1, cron internal, dan origin embed sudah punya alamat tetap.
- Memindahkan semuanya ke `app/[lang]` memerlukan aturan rewrite untuk menjaga link lama tetap hidup.

Rekomendasi untuk proyek ini: **simpan locale di cookie `NEXT_LOCALE` dan resolusi lewat `src/proxy.ts` yang sudah ada**, tanpa mengubah struktur URL. Urutan resolusi:

1. Nilai eksplisit yang dipilih pengguna (cookie `NEXT_LOCALE`).
2. `Accept-Language` dari browser.
3. Fallback `en`.

Catatan teknis:

- `src/proxy.ts` sudah berisi `applySecurityHeaders(...)` dan matcher; tambahkan resolusi locale di sana tanpa mengubah perilaku CSP, `frame-ancestors`, atau header `no-store` pada rute `/sign/`, `/embed/sign/`, dan `/download/`.
- Membaca `await cookies()` di root layout membuat rute bersifat dinamis (`node_modules/next/dist/docs/01-app/02-guides/streaming.md`). Untuk halaman publik yang ingin tetap statis, opsi lanjutan adalah memakai `app/[lang]` hanya untuk halaman pemasaran/legal sambil menjaga rute aplikasi tetap tanpa prefiks.
- Jika suatu hari diputuskan pindah ke `app/[lang]`, lakukan itu sebagai fase terpisah dengan rewrite untuk path lama.

### 2.3 Bahasa untuk email dan link tanda tangan

Jangan mengandalkan browser signer saja. Sender yang memakai UI Indonesia mengharapkan penerima mendapat email dan halaman tanda tangan berbahasa Indonesia, meskipun browser penerima berbahasa Inggris.

- Simpan locale pilihan saat envelope dikirim, misalnya kolom `locale` pada baris signer/penerima, melalui migrasi SQL baru di `db/migrations/`.
- Saat email dan link dibuat, baca locale yang tersimpan; fallback ke `en` untuk baris lama.
- Link yang sudah terbit tetap valid: token, hash, dan URL `/sign/<token>` tidak diubah.

### 2.4 Struktur kamus yang diusulkan

```text
src/lib/i18n/
  locales/en.ts          # sumber kanon
  locales/id.ts          # terjemahan, kunci sama persis
  types.ts               # Locale, MessageKey, tipe turunan
  get-dictionary.ts      # resolusi locale -> kamus, hanya di server
  format.ts              # pembungkus Intl untuk tanggal, waktu, angka
  messages-provider.tsx  # pengirim kamus ke Client Component
```

- Client Component tidak bisa memanggil `cookies()` / `next/root-params`; kamus diserialisasi sekali di layout lalu diberikan lewat provider.
- Gunakan `Intl.DateTimeFormat` dan `Intl.NumberFormat` untuk tanggal, waktu, dan angka. Jangan menyusun tanggal dengan konkatenasi string.
- Tambah tes paritas kunci `en` vs `id` supaya terjemahan yang belum ada langsung gagal di CI.

## 3. Cakupan teks yang perlu diterjemahkan

| Area                                          | Lokasi utama                                                                                                                                                                                                                                                       | Catatan                                                                                                      |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Halaman tanda tangan & persetujuan elektronik | `src/app/sign/[token]`, `src/components/signing/*`, `src/lib/electronic-records-disclosure.ts`, `src/lib/consent-disclosure-notice.ts`                                                                                                                             | Prioritas tertinggi. Teks disclosure adalah teks legal; perlu tinjauan manusia, bukan terjemahan mesin saja. |
| Email transaksional                           | `src/lib/services/signing-invitation-email.ts`, `src/lib/services/reminders.ts`, `src/lib/signing.ts`, `src/lib/envelope-schedule.ts`, `src/lib/envelope-deletion.ts`, `src/lib/retention.ts`, `src/lib/auth/server.ts`, `src/lib/part11.ts`, `src/lib/account.ts` | 18 jenis email. Subjek, isi HTML, isi teks, dan footer legal semuanya perlu diterjemahkan.                   |
| Dashboard & wizard envelope                   | `src/components/dashboard/*`, `src/components/envelopes/*`, `src/components/templates/*`                                                                                                                                                                           | Termasuk label status (`Draft`, `Sent`, `Signed`), tombol, validasi, dan teks bantuan.                       |
| Autentikasi, setup, pengaturan                | `src/components/auth/*`, `src/components/setup/*`, `src/components/settings/*`, `src/lib/password-messages.ts`, `src/lib/legal.ts`                                                                                                                                 | Pesan galat Better Auth perlu dipetakan ke pesan Indonesia.                                                  |
| Halaman publik & legal                        | `src/app/verify`, `src/app/contact`, `src/app/terms`, `src/app/privacy`, `src/app/accessibility`, `src/app/electronic-signatures`, `src/app/signer-privacy`, `src/components/landing/*`                                                                            | Cantumkan bahwa versi Inggris tetap kanonik untuk hal hukum.                                                 |
| PDF, sertifikat, dan jejak audit              | `src/lib/services/pdf-finalize.ts`, `src/lib/services/seal-identity.ts`, `src/lib/audit-export.ts`, `src/lib/signature-meanings.ts`                                                                                                                                | Terjemahkan saat ditampilkan/dicatatkan, jangan menulis ulang baris audit lama.                              |
| Pesan API & galat server                      | `src/lib/api/*`, `src/app/api/**`                                                                                                                                                                                                                                  | Teks untuk pengguna diterjemahkan; kode galat tetap stabil.                                                  |

## 4. Yang sengaja tidak diterjemahkan

- Nama event webhook, `EmailTemplateKind`, `AuditEventType`, `FieldType`, nama field API, dan kode galat — ini kontrak untuk aplikasi pihak ketiga.
- Nilai yang tersimpan di database dan dipakai sebagai kunci, termasuk `disclosureVersion`.
- Token, URL, hash, nama header, kunci JSON log, dan string internal PAdES/ASN.1.
- Identitas produk/organisasi yang memang diisi sendiri oleh administrator.

## 5. Tahapan pengerjaan

**Fase 0 — Keputusan & inventarisasi**

- Setujui daftar cakupan di atas dan pilih cakupan minimum untuk rilis pertama.
- Ekstrak daftar string UI menjadi kunci; tentukan pemilik terjemahan bahasa Indonesia.

**Fase 1 — Fondasi + pengalaman signer (nilai terbesar)**

- Pasang resolver locale di `src/proxy.ts`, helper `getDictionary`, dan `Intl` formatting.
- Ubah `<html lang>` mengikuti locale.
- Migrasi SQL untuk locale per penerima; fallback untuk data lama.
- Terjemahkan halaman tanda tangan, disclosure, Verify, dan email yang dikirim ke signer.
- Uji: alur kirim dari UI Indonesia → email Indonesia → tanda tangan → PDF selesai.

**Fase 2 — Pengguna internal**

- Dashboard, wizard, template, pengaturan, login/signup/setup, dan pesan galat.
- Pemilih bahasa di Settings atau menu akun. Pemilih di footer publik sudah tersedia lebih awal (lihat Fase 1); ini baru perlu jika ingin kontrol terpisah untuk pengguna internal.

**Fase 3 — Bukti & legal**

- Label sertifikat, tampilan jejak audit, arti tanda tangan untuk mode Part 11, dan halaman legal.
- Perbarui `README.md:164` setelah dukungan bahasa Indonesia benar-benar tersedia.

**Fase 4 — Mutu & rilis**

- Tes paritas kamus, tes format tanggal, snapshot email, dan skenario Playwright berbahasa Indonesia.
- Verifikasi link lama, callback SSO, embed, dan cron tetap bekerja.
- Rilis bertahap; siapkan rollback melalui fallback `en`.

## 6. Risiko dan mitigasi

| Risiko                                                                | Mitigasi                                                                                   |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Link tanda tangan yang sudah dikirim rusak karena perubahan URL       | URL tidak diubah; locale disimpan di sisi server/cookie.                                   |
| Teks legal kurang tepat                                               | Terjemahan oleh penutur asli + tinjauan hukum; versi Inggris tetap kanonik.                |
| Jejak audit hash-chain berubah                                        | Gunakan kode audit sebagai nilai tersimpan; terjemahkan hanya di lapisan tampilan.         |
| Kata bahasa Indonesia lebih panjang dan memengaruhi tata letak PDF/UI | Uji rendering dengan font yang sudah ada; sesuaikan wrapping di sertifikat dan tombol.     |
| Rute menjadi dinamis karena `cookies()`                               | Terima untuk area aplikasi; pertahankan static generation untuk halaman publik jika perlu. |
| Test yang mengekspektasi teks Inggris gagal                           | Ubah assertion menjadi kunci kamus atau jalankan test dengan locale `en` sebagai default.  |
| Signer menerima bahasa yang tidak sesuai browser                      | Simpan locale saat pengiriman; gunakan `Accept-Language` hanya sebagai fallback.           |

## 7. Kriteria selesai

- [ ] Kunci `en` dan `id` sama persis; tidak ada string UI yang tertinggal hardcoded di area yang disepakati.
- [ ] Email dan halaman `/sign/<token>` konsisten dalam satu bahasa untuk envelope yang dikirim dari UI Indonesia.
- [ ] `<html lang>` mengikuti locale aktif.
- [ ] Link lama, API v1, webhook, cron, SSO callback, dan embed tetap berfungsi.
- [ ] `npm test`, `npm run test:db`, `npm run test:e2e`, `npm run typecheck`, dan `npm run lint` lulus.
- [ ] README tidak lagi menyatakan bahwa halaman tanda tangan hanya berbahasa Inggris.

## 8. Perkiraan

Cakupan penuh (Fase 1–4) sekitar 2–4 minggu kerja satu orang, dengan asumsi terjemahan dan tinjauan legal sudah tersedia. Fase 1 saja biasanya menjadi rilis pertama yang paling terasa manfaatnya.

## 9. Status implementasi Fase 1

Sudah terpasang:

- Fondasi di `src/lib/i18n/`: tipe locale, resolver `Accept-Language` dan cookie, kamus `en`/`id`, `formatMessage`, `getRequestLocale`, dan provider Client Component.
- `src/proxy.ts` meneruskan `x-signudoc-locale` ke Server Component dan menetapkan `NEXT_LOCALE` untuk halaman tanpa mengubah URL.
- `src/app/layout.tsx` memakai `<html lang={locale}>` dan membungkus aplikasi dengan provider pesan.
- Pemilih bahasa di footer publik (`src/components/layout/locale-switcher.tsx`) menulis cookie `NEXT_LOCALE` lewat Server Action dan menyegarkan halaman tanpa menyentuh URL. Bendera `src/components/flags/` dipakai sebagai penanda locale. Pemilih ini sengaja disembunyikan di `/sign/<token>` dan `/embed/sign/<token>` karena bahasa envelope yang menang di sana.
- Permukaan signer: halaman status, verifikasi, shell proses, layar selesai, dan footer publik.
- Teks persetujuan elektronik memiliki versi terpisah untuk bahasa Indonesia, sehingga jejak audit mencatat kata-kata yang benar-benar dibaca.
- Email undangan (termasuk setelah koreksi signer), pengingat, kode akses, pemberitahuan penyelesaian, penolakan, pembatalan, dan tautan unduhan baru mengikuti locale yang dipilih saat envelope dikirim (`db/migrations/20261121000000_signer_locales.sql`).
- Halaman Verify, halaman landing publik (`src/components/landing/landing-shell.tsx` beserta tombol sesinya dan metadata halaman), dan email signer diterjemahkan; string internal (event webhook, tipe email, kode galat, token, hash, URL, `disclosureVersion`, dan teks PDF/PAdES) sengaja tidak diubah.
- Halaman harga publik (`/pricing`) memakai kamus yang sama; teksnya ada di `pricingPage`, sedangkan angka dan batas paket ada di `src/lib/pricing.ts`. Harga dan batas paket tersebut masih usulan bisnis, bukan batas teknis aplikasi, dan belum ada alur pembayaran.
- Logo hosted memakai `public/img/logo.svg` di header web dan `public/img/logo.png` di email. Keduanya aset statis yang dipercaya; jalur upload logo organisasi tetap hanya menerima PNG/JPEG/WebP karena SVG berisiko sebagai konten pengguna dan sering tidak tampil di klien email. `HOSTED_BRANDING.logoUrl` dipakai `<Brand />`, sementara `emailLogoUrl` dipakai `buildLogoHeader()`.
- Halaman `/terms` tetap satu URL; seluruh teksnya berasal dari `legal.terms` di kedua kamus. Isinya ditulis ulang untuk konteks Indonesia (UU ITE, PP 71/2019, UU PDP 27/2022, UU Perlindungan Konsumen), bukan sekadar diterjemahkan. Tanggal efektif tunggal ada di `src/lib/legal-date.ts` dan diformat memakai `Intl.DateTimeFormat` sesuai locale; label "Terakhir diperbarui" ada di `common.lastUpdated`. Versi ini masih menunggu tinjauan penasihat hukum Indonesia.
- Pratinjau dasbor di halaman landing bersifat dekoratif (`aria-hidden`) dan masih memakai data contoh berbahasa Inggris; menu akun publik juga belum diterjemahkan karena dipakai bersama permukaan lain.
- README tidak lagi menyatakan halaman tanda tangan hanya berbahasa Inggris.

Hasil verifikasi pada mesin pengembangan:

- `bun run typecheck`: lulus.
- `bun run test`: 508 test; 507 lulus. Satu test palet gagal hanya karena nilai `--accent` lokal yang diubah di luar cakupan lokalisasi dan belum di-commit; test terkait lokalisasi dan hukum lolos semua.
- `bun run test:db`: 393 dari 393 lulus.
- `bun run format:check` dan `git diff --check`: bersih.
- `bun run test:e2e -- e2e/localization.spec.ts`: 3 dari 3 lulus; `Accept-Language: id-ID` menghasilkan `<html lang="id">`, teks Indonesia, dan cookie `NEXT_LOCALE=id` yang bertahan setelah reload. Pemilih di footer mengganti bahasa tanpa mengubah URL.

Kegagalan e2e penuh yang semula terlihat berasal dari lingkungan, bukan lokalisasi: `SUPPORT_EMAIL` di `.env` lokal membuat langkah validasi setup dilewati, dan aset worker PDF.js 5.5.207 tidak cocok dengan `pdfjs-dist` 6.5.438 yang dipakai aplikasi, sehingga unggahan PDF gagal dirender di editor. Keduanya dibersihkan lewat environment test dan perbaikan aset di luar cakupan lokalisasi. Tidak ada kegagalan yang menyentuk teks atau rute lokalisasi.

Masih perlu sebelum rilis: tinjauan hukum/penutur asli atas terjemahan disclosure dan Syarat Layanan baru, serta konfirmasi akhir e2e penuh setelah perbaikan aset worker. `bun run lint` kini memakai Biome dan dapat berjalan dengan TypeScript 7.

## 10. Referensi

- Panduan i18n Next.js 16: `node_modules/next/dist/docs/01-app/02-guides/internationalization.md`
- Proxy yang sudah ada: `src/proxy.ts`
- Root layout: `src/app/layout.tsx`
- Jenis email: `src/lib/types/domain.ts:105-124`
- Konfigurasi deploy dan cron: `vercel.json`
