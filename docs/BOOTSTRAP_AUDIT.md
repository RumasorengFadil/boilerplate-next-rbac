# Audit ekstraksi boilerplate

Audit dilakukan terhadap rute aktif, konfigurasi, dokumentasi, dan implementasi autentikasi Bisadev sebelum boilerplate dibuat. Kode yang tidak dapat dipastikan dipakai tidak disalin.

## Reusable Core

| Area | Pola yang dipertahankan | Bentuk pada boilerplate |
|---|---|---|
| Struktur | Next App Router dengan route group public/auth/main dan batas server/client | `(public)`, `(auth)`, `(dashboard)`, `features/`, `lib/`, `context/`, `config/`, `server/` |
| Data & validasi | Domain feature memisahkan schema, action/API, hook/komponen; Zod untuk input | `features/auth`, `features/projects` |
| UI | Tailwind, helper `cn`, provider global, dashboard sidebar/navbar | primitive `Button`, `Sidebar`, `Header`, `ReactQueryProvider` |
| Routing | Proxy untuk redirect awal; guard final di server | `src/proxy.ts`, `requireUser`, `requirePermission` |
| RBAC | Navigasi difilter role dan akses tidak semata-mata bergantung pada tampilan | role/permission eksplisit serta guard page/action |
| Konfigurasi | app config, alias `@/*`, strict TS, standalone build | `app-config.ts`, `tsconfig.json`, `next.config.ts` |
| Dokumentasi | index docs, dokumen hidup, laporan implementasi bertanggal | struktur `docs/` yang sama dalam skala template |

## Project-Specific

| Area | Mengapa tidak disalin |
|---|---|
| Nama, logo, alamat, WhatsApp, Google Analytics, SEO organisasi Bisadev | Identitas dan operasional Bisadev |
| Blog, category, Novel/Tiptap, sitemap artikel, portfolio, service, contact, dan chat OpenAI | Domain agensi dan konten khusus produk |
| Endpoint API eksternal `/auth/*`, cookie refresh token/CSRF, image host, Google Picker | Kontrak backend dan integrasi deployment Bisadev |
| Role `SUPER_ADMIN`, `INSTRUCTOR`, `STUDENT` serta menu blog/category | Kosakata dan aturan bisnis Bisadev |
| Preference sidebar lama, user mock, design-system lama | Terikat implementasi dashboard dan data lama |

## Harus Dihapus atau Diubah

| Temuan | Keputusan |
|---|---|
| `NEXT_PUBLIC_OPENAI_API_KEY` mengekspos pola kunci pada client | Tidak dibawa; secret server tidak boleh memakai prefix `NEXT_PUBLIC_`. |
| Proxy awal hanya memeriksa keberadaan cookie | Dipertahankan hanya sebagai optimasi redirect, lalu dilengkapi validasi session/permission di server. |
| Backend utama tidak punya schema/migrasi lokal | Boilerplate menyediakan schema dan migrasi PostgreSQL mandiri agar batas data jelas. |
| Implementasi lama/duplikat (`Layouts`, `store`, `tailwind`, util Axios lama) | Tidak dibawa; boilerplate hanya memasukkan satu jalur aktif per tanggung jawab. |
| `CLAUDE.md` serta `docs/governance/ARCHITECTURE_BLUEPRINT.md` dan `DESIGN.md` dirujuk tetapi tidak ada pada checkout audit | Tidak diklaim sebagai sumber yang dibaca; boilerplate membuat versi generik dan mencatat referensi yang tersedia. |

## Keputusan ekstraksi

Template beralih dari backend HTTP eksternal ke database lokal hanya untuk membuat starter benar-benar dapat berdiri sendiri. Batas ini disengaja: pola feature, server/client, guard, config, dan dokumentasi tetap sama; endpoint, token, serta model data Bisadev tidak disalin.
