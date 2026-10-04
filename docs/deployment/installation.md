# Instalasi dan clone

1. Buat repository baru dari folder boilerplate ini, lalu ganti `name` pada `package.json` dan identitas di `.env.local`.
2. Salin `.env.example` ke `.env.local`. Jangan commit `.env.local`.
3. Jalankan `npm install` dan siapkan PostgreSQL yang sesuai `DATABASE_URL`.
4. Terapkan migration dengan perintah berikut, lalu `npm run dev`. Prisma CLI tidak otomatis membaca `.env.local`; wrapper ini menggunakan urutan konfigurasi Next.js agar database yang dipilih sama dengan aplikasi.
5. Sebelum deploy jalankan `npm run typecheck` dan `npm run build`.

Production memerlukan `DATABASE_URL` yang dapat dijangkau server aplikasi. `npm run build` menjalankan `prisma generate` sebelum `next build`; output Next.js dibuat standalone. Gunakan secret manager platform untuk semua variabel non-publik.

`npm run dev` juga menjalankan `prisma generate` sebelum Next.js. Cache Prisma development membandingkan fingerprint datamodel generated client; schema berubah atau cache lama tanpa fingerprint akan mengganti instance dan melepas pool lama. Production tidak memakai cache global development. Setelah migration/generation, restart dev server jika proses masih memuat modul generated client lama. Error delegate undefined (misalnya consultationBooking.findMany) adalah runtime client/cache, berbeda dari error tabel belum dimigrasikan. Tidak perlu reset database: jalankan generate, deploy migration yang belum diterapkan, lalu restart proses.

```sh
node -e 'require("@next/env").loadEnvConfig(process.cwd());require("child_process").execFileSync("npx",["prisma","migrate","deploy"],{stdio:"inherit",env:process.env})'
```

Untuk membuat migration baru saat development, gunakan loader environment yang sama dengan argumen `migrate dev`. Jangan menjalankan reset pada database berisi data yang ingin dipertahankan.

### Unknown argument setelah schema Prisma berubah

Jika query baru gagal `Unknown argument deletedAt`, tetapi `prisma/schema.prisma` dan generated schema `node_modules/.prisma/client/schema.prisma` sudah mempunyai field tersebut, periksa migration lalu restart **proses Next dev**, bukan hanya refresh browser. Client yang telah di-import oleh worker sebelum `prisma generate` dapat tetap memakai runtime datamodel lama. Fingerprint cache development tidak dapat memperbarui modul generated Prisma yang masih tersimpan pada module cache proses tersebut.

Urutan aman: cek migration pada target database aplikasi memakai loader environment di atas; terapkan hanya migration tertunda yang telah direview; jalankan `npm run db:generate`; hentikan proses Next dev proyek yang benar secara graceful; jalankan `npm run dev` kembali pada host/port semula. Pastikan tidak ada duplikat server pada port lain. Verifikasi halaman melalui HTTP, bukan hanya typecheck. Jangan menghapus filter deletedAt, reset database atau menghapus node_modules untuk mengatasi stale runtime ini. Jika muncul missing column/table setelah restart, itu masalah migration yang berbeda dari validation error client.

## Upgrade portfolio foundation

Terapkan migration `20261004010000_portfolio_foundation` dengan loader environment pada contoh di atas, kemudian generate client/restart dev server. Migration additive: jangan reset database atau menghapus route reservations untuk mengatasi conflict. Jika migration gagal karena namespace slug/UUID bertabrakan, audit record konflik dan koreksi secara terarah sebelum retry sesuai workflow Prisma.

Opsional untuk memasukkan tiga contoh ilustratif yang sudah disetujui:

```sh
npm run db:seed:portfolio
```

Runner memerlukan Node.js dengan `module.registerHooks` (>=22.15; diuji 25.9) dan TypeScript dev dependency terpasang. Jalankan dari root repository dengan full install, bukan standalone artifact yang hanya berisi production dependencies. Runner membaca konfigurasi Next `.env.local` sebelum mengimpor Prisma agar target sama dengan aplikasi; tidak mencetak credential. Pada server produksi, set DATABASE_URL secara eksplisit melalui secret manager sebelum menjalankan.

Seed memakai UUID tetap, create-if-missing dan satu transaction. Tidak memperbarui tulisan/status/slug existing, tidak restore/publish ulang record deleted, dan tidak membuat akun. Konflik slug/alias menghentikan seluruh seed tanpa hasil parsial. Label verifiedProject=false tetap ilustratif; jangan menampilkan sebagai klaim klien nyata. Seed ulang aman dan melaporkan created/preserved. Lihat [Portfolio](../features/portfolio.md).

Menu Portfolio/Tiptap tersedia pada PRD 003 Task 3; install dependency dari lockfile dan rebuild sebelum restart. `/dashboard/content/[UUID]` case study mengarahkan ke editor khusus. Foundation migration tetap wajib. Public renderer dua kolom aktif lewat PRD 004, tetapi public slug redirects dan PPR belum aktif. Selama transisi, public masih memakai route existing; jangan menganggap slug redirect telah terpasang hanya karena lookup table tersedia.

### Upgrade portfolio Tiptap single source (PRD 004)

Deploy runtime PRD 004 Task 2 sebelum cleanup agar editor/public/save/seed memakai rich content dan tidak menciptakan ulang key legacy. Gunakan full install Node/TypeScript seperti runner seed, dari root project. Hindari operator/admin editing selama operasi; form lama akan gagal version check setelah migrasi. Tidak ada Prisma SQL migration baru untuk cleanup JSON ini.

```sh
npm run db:preview:portfolio-content
npm run db:migrate:portfolio-content -- --apply --database lunabiner
npm run db:preview:portfolio-content
```

Ganti `lunabiner` dengan nama database target yang benar; nama harus sama dengan DATABASE_URL dan current_database(). Schema URL (default public) juga diperiksa. Runner ini hanya mengizinkan loopback PostgreSQL localhost/127.0.0.1/[::1], bukan mutation remote diam-diam. Untuk deployment lain jalankan pada host/database local yang sesuai melalui proses operasi yang disetujui; jangan menghapus guard. Environment mengikuti Next precedence, tanpa mencetak credential. Command tanpa explicit operation/database atau unknown arguments gagal tanpa writes.

Apply mencakup seluruh CASE_STUDY termasuk draft/deleted, memvalidasi ID/EN dan rich limits, membuat backup `.local-backups/portfolio-content/<batch-uuid>.json`, lalu update JSON/version/audit atomik. Directory 0700, file 0600 exclusive-create, fsync dan read-back verification. Directory harus privat dan bukan symlink ke lokasi lain. Backup berisi konten sebelum/sesudah, UUID/version dan non-secret target identity; jangan mengunggahnya, memasukkannya ke Git atau melonggarkan permissions. `.local-backups/` diabaikan Git. CLI membatasi backup/restore 10 MB dan 10.000 changed rows; untuk inventory lebih besar rancang batching/backup terpisah sebelum perluasan, bukan truncation. Sediakan storage dan backup retention sesuai kebijakan operator.

Serializable transaction, advisory lock dan version guards melindungi race. Invalid data/backup failure/conflict membatalkan seluruh DB mutation; backup yang sudah tertulis tetap ada meskipun transaksi rollback. Tidak ada auto-retry/forced overwrite. Preview setelah sukses harus menunjukkan 0 legacy keys/changes/invalid rows; repeat apply menghasilkan 0 migrated dan tidak membuat backup/audit/version baru.

Pemulihan eksplisit hanya jika diperlukan:

```sh
npm run db:migrate:portfolio-content -- --restore ".local-backups/portfolio-content/<batch-uuid>.json" --database lunabiner
```

Gunakan path UUID backup yang nyata, bukan placeholder literal. Restore hanya menerima file JSON di dalam folder backup lokal, memvalidasi manifest/conversion/target host-port-database-schema dan current JSON/version. Record yang telah diedit, dipublikasikan/diarsipkan melalui workflow versioned, atau dipulihkan sebelumnya membuat restore ditolak secara atomik; tidak ada flag force. Restore menulis JSON before dan menambah version, bukan rewind version/status/routes. Reopen form sesudah apply/restore. Runtime masih kompatibel dengan legacy yang dipulihkan melalui read adapter. Restart runtime/cache hanya sesuai deployment; saat ini public data memakai request-scoped React cache, bukan shared cache yang perlu dipurge oleh CLI.

Database lokal `lunabiner`: batch `f5223b97-3cc5-475b-bcbb-ffeb2ec920b1` memigrasikan 3 record pada 2026-10-04; backup disimpan lokal dan belum dihapus. Restore telah diuji hanya pada database disposable, bukan dijalankan pada data utama.

QA admin memakai `tests/portfolio-actions.test.mjs` dan `tests/portfolio-browser.mjs` pada database disposable bernama `lunabiner_portfolio_test`, bukan database aplikasi. Browser script menerima PORTFOLIO_TEST_ORIGIN loopback, PLAYWRIGHT_MODULE jika package di luar repository, serta PLAYWRIGHT_EXECUTABLE opsional untuk Chrome terpasang. Jalankan preview dengan DATABASE_URL test yang sama; fixtures/session/browser context dibersihkan setelah tes. Jangan menjalankan destructive cleanup tests menggunakan database produksi.

## Public SEO dan standalone assets

Set `NEXT_PUBLIC_APP_URL` ke origin HTTPS production yang benar sebelum `npm run build` (tanpa subpath, query atau fragment), agar canonical, hreflang, schema dan OG URL tidak menunjuk localhost/preview. Variabel ini publik dan bukan tempat menyimpan credential.

Halaman HTML kini request-rendered agar lang pada root sesuai ID/EN dari proxy. Jangan mengubahnya menjadi export statis atau menghilangkan proxy request-header forwarding. Sitemap dibaca saat request sehingga membutuhkan koneksi database read-only yang tersedia; publication/withdrawal tidak memerlukan rebuild. Pastikan reverse proxy meneruskan request ke Next dan tidak menyajikan cache HTML lintas path/locale. Setelah deploy, periksa /id/about dan /en/about untuk lang/canonical, /sitemap.xml untuk published URLs/hreflang, /robots.txt serta endpoint OG. Search Console/domain verification/submission merupakan langkah operasional terpisah setelah origin resmi benar.

Endpoint OG berjalan pada Node dan membaca `public/images/lunabiner-logo.png`. Output tracing saat ini menyertakan logo; deployment tetap perlu menyertakan seluruh `public/` dan `.next/static/` untuk logo/font/aset halaman. Untuk standalone, salin assets ke `.next/standalone/public/` dan `.next/standalone/.next/static/`, lalu jalankan `node .next/standalone/server.js` sesuai konfigurasi host/port platform. Jangan menghapus aset dari artifact. Setelah upgrade, rebuild dan restart app; tidak ada migration baru untuk SEO. Lihat [Public SEO](../features/seo.md).

## LunaBiner AI

Apply reviewed migrations with `npx prisma migrate deploy` before enabling the assistant. Configure the six infrastructure variables in `.env.example` through the secret manager; runtime tuning belongs to the database. Follow [AI activation and troubleshooting](../ai-assistant.md). Reverse proxies must overwrite forwarded IP headers for rate limiting. Reindex knowledge after changing published content.

OpenAI chat and embedding URLs are separate endpoints. Use plain URLs, not Markdown links: `https://api.openai.com/v1/chat/completions` and `https://api.openai.com/v1/embeddings`, respectively ([official embedding API reference](https://developers.openai.com/api/reference/resources/embeddings/methods/create)). Restart the app after infrastructure environment changes. Keys remain in ignored environment files; models and streaming settings remain in database runtime configuration.
