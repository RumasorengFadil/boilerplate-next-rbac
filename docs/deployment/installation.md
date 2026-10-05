# Instalasi dan clone

1. Buat repository baru dari folder boilerplate ini, lalu ganti `name` pada `package.json` dan identitas di `.env.local`.
2. Salin `.env.example` ke `.env.local`. Jangan commit `.env.local`.
3. Jalankan `npm install` dan siapkan PostgreSQL yang sesuai `DATABASE_URL`.
4. Terapkan migration dengan perintah berikut, lalu `npm run dev`. Prisma CLI tidak otomatis membaca `.env.local`; wrapper ini menggunakan urutan konfigurasi Next.js agar database yang dipilih sama dengan aplikasi.
5. Sebelum deploy jalankan `npm run typecheck` dan `npm run build`.

Production memerlukan `DATABASE_URL` yang dapat dijangkau server aplikasi. `npm run build` menjalankan `prisma generate` sebelum `next build`; output Next.js dibuat standalone. Gunakan secret manager platform untuk semua variabel non-publik.

## VPS Docker staging dan production

Deployment VPS menggunakan image Next.js standalone dan Compose yang dipisahkan per environment. Kontrak container tersedia pada [`deploy/`](../../deploy/): `compose.yml` tidak menyimpan secret dan setiap environment memakai `.env` privat yang tidak dilacak Git. Jangan menjalankan production dan staging dalam Compose project, database, atau volume upload yang sama.

Image aplikasi dan image migration dibuat dari [`Dockerfile`](../../Dockerfile). Image runtime berjalan sebagai user non-root, hanya mengekspos port melalui loopback, dan menerima storage cover melalui volume persisten. Service `migrate` adalah operasi eksplisit; migration tidak boleh dijalankan saat request atau build.

Sebelum deploy ke VPS, gunakan dokumentasi operasi pada [`deploy/README.md`](../../deploy/README.md). Reverse proxy, TLS, DNS, backup/restore PostgreSQL dan koordinasi dengan workload Hermes tetap merupakan task infrastruktur tersendiri dan tidak boleh diasumsikan dari konfigurasi Compose.

## GitHub Actions dan environment deployment

Workflow [Build and deploy](../../.github/workflows/deploy.yml) memvalidasi setiap pull request menuju `develop` atau `main`. Push ke `develop` membangun image staging dan menjalankan job environment `staging`; push ke `main` membangun image production dan menjalankan job environment `production`. Image runtime dan migrator dipublikasikan ke GHCR dengan digest immutable dari commit yang sama. Job deploy menarik image berdasarkan digest, menjalankan `prisma migrate deploy` secara eksplisit, dan baru kemudian memperbarui container aplikasi.

Sebelum workflow dapat men-deploy, buat GitHub Environments `staging` dan `production`. Batasi branch deployment masing-masing ke `develop` dan `main`; untuk production, aktifkan required reviewer bila paket GitHub repository mendukungnya. Simpan konfigurasi berikut sebagai *environment-specific* secret, bukan repository secret:

- `DEPLOY_HOST` — alamat IP/hostname VPS.
- `DEPLOY_USER` — user deploy non-root pada VPS.
- `DEPLOY_SSH_PRIVATE_KEY` — private key khusus deployment.
- `DEPLOY_KNOWN_HOSTS` — baris host key VPS yang telah diverifikasi out-of-band.

Tambahkan `DEPLOY_DIRECTORY` sebagai environment variable (bukan secret), misalnya `/opt/lunabiner/staging` atau `/opt/lunabiner/production`. Direktori itu harus berisi `compose.yml` dan `.env` private yang dibuat pada VPS. `GITHUB_TOKEN` digunakan hanya untuk push image GHCR; jangan ganti dengan personal access token kecuali diperlukan oleh kebijakan registry.

`npm run dev` juga menjalankan `prisma generate` sebelum Next.js. Cache Prisma development membandingkan fingerprint datamodel generated client; schema berubah atau cache lama tanpa fingerprint akan mengganti instance dan melepas pool lama. Production tidak memakai cache global development. Setelah migration/generation, restart dev server jika proses masih memuat modul generated client lama. Error delegate undefined (misalnya consultationBooking.findMany) adalah runtime client/cache, berbeda dari error tabel belum dimigrasikan. Tidak perlu reset database: jalankan generate, deploy migration yang belum diterapkan, lalu restart proses.

```sh
node -e 'require("@next/env").loadEnvConfig(process.cwd());require("child_process").execFileSync("npx",["prisma","migrate","deploy"],{stdio:"inherit",env:process.env})'
```

Untuk membuat migration baru saat development, gunakan loader environment yang sama dengan argumen `migrate dev`. Jangan menjalankan reset pada database berisi data yang ingin dipertahankan.

### Unknown argument setelah schema Prisma berubah

Jika query baru gagal `Unknown argument deletedAt`, tetapi `prisma/schema.prisma` dan generated schema `node_modules/.prisma/client/schema.prisma` sudah mempunyai field tersebut, periksa migration lalu restart **proses Next dev**, bukan hanya refresh browser. Client yang telah di-import oleh worker sebelum `prisma generate` dapat tetap memakai runtime datamodel lama. Fingerprint cache development tidak dapat memperbarui modul generated Prisma yang masih tersimpan pada module cache proses tersebut.

Urutan aman: cek migration pada target database aplikasi memakai loader environment di atas; terapkan hanya migration tertunda yang telah direview; jalankan `npm run db:generate`; hentikan proses Next dev proyek yang benar secara graceful; jalankan `npm run dev` kembali pada host/port semula. Pastikan tidak ada duplikat server pada port lain. Verifikasi halaman melalui HTTP, bukan hanya typecheck. Jangan menghapus filter deletedAt, reset database atau menghapus node_modules untuk mengatasi stale runtime ini. Jika muncul missing column/table setelah restart, itu masalah migration yang berbeda dari validation error client.

## Upgrade product foundation — PRD 002 Task 2

### Public product pages — Task 5

Build/restart setelah menambahkan routes /{locale}/products/{slug} dan detail opengraph-image/main; tidak ada migration/seed/data cleanup. Deploy routes, public-data/presentation dan SEO/sitemap helpers bersama. Set NEXT_PUBLIC_APP_URL origin HTTPS resmi sebelum build; local QA localhost bukan origin produksi. Public collection DB-only, empty/error tidak reseed/fallback. ProductRoute foundation wajib sudah diterapkan; unknown/private404, eligible aliases308 ke canonical. Query live membutuhkan DATABASE_URL; tidak menyajikan full-page proxy cache yang mengabaikan publication/locale. Branded OG memerlukan bundled logo/Node tracing seperti bagian SEO existing, tidak fetch demo/cover eksternal. Task6 adds streaming SSR (not PPR/ISR) and guarded public payload cache TTL300/tag products-public. Next cache directory must be writable/private; cache loss only creates cold reads. Inventory/routes/revisions require live DB on every request; synchronize server UTC clock for scheduled publication. Save/archive/restore expire tags after commit; generic PRODUCT save does likewise. No credentials/cache flags/SQL migrations added; private cover remains no-store with live guards. No full-page proxy cache, cached permissions or multi-instance coordination introduced.

QA final Task7: setelah typecheck/lint/build, jalankan scoped tests serial (CMS/product/portfolio/media/migration/SEO/permissions/Prisma), lalu products-browser.mjs3010, products-public-browser.mjs3011, seo-http.mjs55445 dan products-cache-production.mjs3012 secara serial pada disposable55441 yang bersih. Semua target PostgreSQL memakai role portfolio_test/database lunabiner_portfolio_test/127.0.0.1:55441; jangan pakai database utama atau menjalankan prisma generate saat tes Prisma aktif. Browser memakai PLAYWRIGHT_MODULE/PLAYWRIGHT_EXECUTABLE yang tersedia lokal; jangan menginstal runtime hanya untuk QA ini. Cache observer memerlukan PRODUCTS_QUERY_LOG menuju server.log disposable, log_min_duration_statement=0 dan log_parameter_max_length=0 (tanpa parameter). Query logging tidak boleh diaktifkan pada database utama. Suite memakai fixtures/private temporary cover directory; cleanup synthetic records/temp uploads, retain screenshot artifacts. Report/tracking [Products](../features/products.md); local QA bukan deployment/domain/volume/backup production verification.

### Summary cleanup — Task 3c

Deploy runtime Task 3b/3c sebelum cleanup; install/rebuild/restart seperti biasa. Tidak ada SQL migration baru. Hindari admin editing saat apply; reopen form setelah version berubah. Jalankan dari root project dengan Node registerHooks>=22.15/full TypeScript install dan environment loader existing, tidak mencetak credential. CLI hanya menerima database loopback dan confirmation eksplisit:

```sh
npm run db:migrate:product-summary -- --preview --database lunabiner
npm run db:migrate:product-summary -- --apply --database lunabiner
```

Ganti database confirmation sesuai target sebenarnya. Preview hanya IDs/version/conflict flags, no writes. Apply PRODUCT saja (termasuk draft/arsip/schedule), transaction Serializable/advisory lock/version/audit, maksimal10.000 rows. Distinct legacy body/rich format atau invalid/oversized content menahan seluruh apply; tidak ada force/truncation. Backup before/after JSON maksimal10MB dibuat exclusive 0600 pada private non-symlink directory0700, fsync/read-back/schema validated sebelum DB commit. Backup retained walaupun transaction rollback; jangan commit/upload backup. Cleanup menghapus translations.body/richBody dan details.features; metadata/workflow/routes tetap. Known example translation hanya UUID+English-array exact match dan belum ada localized config. Arbitrary features literal, configured lists preserved. Seeder baru bilingual/summary-only; repeat tidak overwrite.

Pemulihan: `npm run db:migrate:product-summary -- --restore <absolute-backup-json> --database lunabiner` memakai path backup nyata di `.local-backups/product-summary/`. File/root harus private; target/kind/version/current after JSON diverifikasi. Stale edit/archive/restore menahan seluruh restore; version bertambah, workflow tidak di-rewind. Backup bukan script untuk overwrite perubahan admin. Restore hanya diuji pada disposable.

Lokal 2026-10-05: dua produk dimigrasikan version1→2; backup `.local-backups/product-summary/eb53b1ab-b8fb-4db8-b342-c5c378e9f57a.json` retained. Repeat preview0changes, seed0created/2preserved. Task 3c tidak reset DB atau menjalankan restore utama. Regression `tests/products-content-migration.test.mjs` guarded disposable55441 menguji rollback/conflicts/concurrency/backup/restore dan unrelated records; browser QA3010 memverifikasi legacy keys tidak muncul kembali setelah save. Public payload cache kini aktif sejak Task6; reload setelah CLI, version/updatedAt berubah sehingga live guard memilih key revisi baru. CLI tidak memanggil updateTag karena bukan Server Action.

Task 3b refinement: install/build/restart application seperti biasa, tanpa SQL migration baru. Admin produk kini Ringkasan-only dan daftar fitur ID/EN; produk baru tidak menyimpan body/richBody, record existing masih menyimpan legacy narrative aman sampai backup/migration Task 3c. Public card membaca localized features lebih dahulu (termasuk empty array), lalu fallback single-array legacy. Jangan menghapus JSON legacy manual atau reseed untuk menerjemahkan existing; seed idempotent tidak overwrite. Summary minimum publication 10/maksimum150, fitur12x100/bahasa. Deploy editor/action/service/optional CMS reader bersama, bukan sebagian. Loader test/browser tetap hanya memakai database disposable.

Foundation/menu admin, upload perangkat, public detail/SEO dan guarded cache tersedia (Task1–6). Task2 menguji migration/seed pada PostgreSQL disposable; Task3 menerapkannya ke database lokal lunabiner setelah backup. Gunakan editor produk khusus Ringkasan/features IDEN, bukan generic plain editor untuk menimpa legacy rich data.

Activation lokal 2026-10-05: migration `20261005010000_product_foundation`, dua seed PRODUCT dan empat route reservations; non-PRODUCT unchanged. Backup custom PostgreSQL sebelum activation disimpan privat pada `.local-backups/products-task3-ZvGScv/before.dump` (0700 directory/0600 file, archive list verified, restore utama tidak dijalankan). Retain backup; jangan commit/upload atau menghapusnya otomatis. Deployment lain tetap mengikuti langkah upgrade di bawah.

Sebelum aktivasi, backup database, audit PRODUCT existing untuk slug/UUID conflicts dan gunakan loader Next environment pada contoh instalasi untuk `prisma migrate deploy`. Migration `20261005010000_product_foundation` tidak reset/mengubah JSON/status/version; konflik membatalkan DDL/backfill. Generate client/rebuild/restart proses setelah migration agar delegate productRoute tersedia. Jangan menghapus reservations untuk memaksa konflik selesai.

Opsional memasukkan contoh konsep yang telah disetujui pada target database yang benar:

```sh
npm run db:seed:products
```

Runner membutuhkan Node registerHooks >=22.15/full install TypeScript, membaca Next .env.local sebelum Prisma, tidak mencetak credential. DATABASE_URL dari secret manager yang sudah diset tetap dipakai. Tidak seed saat build/GET/deploy. Dua contoh Enterprise Chat/AI Cashflow dibuat PUBLISHED+COMING_SOON dengan Ringkasan ID/EN maksimal150 dan fitur bilingual tanpa body/richBody/features duplikat, CTA konsultasi dan fixed UUID. Existing UUID/route owner PRODUCT dipertahankan (termasuk rename/arsip); UUID beda kind/race/insert conflict membatalkan transaction. Tidak membuat ulang produk atau overwrite konten admin. Seed berulang melaporkan created/preserved. Readiness bukan klaim produk LIVE.

QA product: `tests/products.test.mjs` (contracts/adapter), `tests/products-integration.test.mjs` (transaction/RBAC/status/seed), `tests/products-migration.test.mjs` (backfill valid/conflict/invalid rollback pada schema sintetis UUID). Integration/migration dan suite SEO memakai guard loopback 127.0.0.1 port 55441/role portfolio_test/database lunabiner_portfolio_test. Jalankan serial pada disposable bersih dengan DATABASE_URL eksplisit, tanpa seed CLI bersamaan atau prisma generate selama tes Prisma aktif. Jangan memakai database utama untuk cleanup tests. Lihat [Products](../features/products.md).

Task3 menambah `tests/products-textarea.test.mjs` dan `tests/products-actions.test.mjs` (150/151, hostile payload, preserved fields/legacy format, RBAC, version/slug, schedule/CTA, arsip/restore). `tests/products-browser.mjs` membutuhkan DATABASE_URL disposable yang sama, PLAYWRIGHT_MODULE dan PLAYWRIGHT_EXECUTABLE lokal; self-spawn production Next di port3010, cleanup synthetic fixtures/server dalam finally. Jalankan setelah production build tanpa proses lain pada3010. Tidak menyentuh server utama3000. Editor saat ini Ringkasan-only dengan maxLength/counter150 dan server enforcement, fitur12x100/bahasa; tidak ada field Detail/Tiptap produk. Legacy narrative dipertahankan sampai cleanup backed-up; jangan truncate/cleanup manual. Hasil screenshots aktual tercatat pada report Task7, bukan artifact tahap editor lama.

## Upgrade portfolio foundation

Terapkan migration `20261004010000_portfolio_foundation` dengan loader environment pada contoh di atas, kemudian generate client/restart dev server. Migration additive: jangan reset database atau menghapus route reservations untuk mengatasi conflict. Jika migration gagal karena namespace slug/UUID bertabrakan, audit record konflik dan koreksi secara terarah sebelum retry sesuai workflow Prisma.

Opsional untuk memasukkan tiga contoh ilustratif yang sudah disetujui:

```sh
npm run db:seed:portfolio
```

Runner memerlukan Node.js dengan `module.registerHooks` (>=22.15; diuji 25.9) dan TypeScript dev dependency terpasang. Jalankan dari root repository dengan full install, bukan standalone artifact yang hanya berisi production dependencies. Runner membaca konfigurasi Next `.env.local` sebelum mengimpor Prisma agar target sama dengan aplikasi; tidak mencetak credential. Pada server produksi, set DATABASE_URL secara eksplisit melalui secret manager sebelum menjalankan.

Seed memakai UUID tetap, create-if-missing dan satu transaction. Tidak memperbarui tulisan/status/slug existing, tidak restore/publish ulang record deleted, dan tidak membuat akun. Konflik slug/alias menghentikan seluruh seed tanpa hasil parsial. Label verifiedProject=false tetap ilustratif; jangan menampilkan sebagai klaim klien nyata. Seed ulang aman dan melaporkan created/preserved. Lihat [Portfolio](../features/portfolio.md).

Menu Portfolio/Tiptap tersedia pada PRD 003 Task 3; install dependency dari lockfile dan rebuild sebelum restart. `/dashboard/content/[UUID]` case study mengarahkan ke editor khusus. Foundation migration tetap wajib. Public renderer dua kolom aktif lewat PRD 004; PRD 003 Task 4 memakai route /{locale}/work/{slug}. Rebuild/restart setelah upgrade route folder [id] → [slug] agar generated route types/manifests diperbarui. Numeric/UUID/slug historis terpetakan redirect 308 hanya bagi record layak terbit; unknown/nonpublic 404. Tidak ada seed otomatis pada GET atau fallback statis saat DB kosong/gagal. Migration foundation/route reservations tetap wajib; tidak ada SQL migration baru pada Task 4. Task 5 memakai fallback streaming SSR + public payload cache, bukan PPR/ISR.

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

Gunakan path UUID backup yang nyata, bukan placeholder literal. Restore hanya menerima file JSON di dalam folder backup lokal, memvalidasi manifest/conversion/target host-port-database-schema dan current JSON/version. Record yang telah diedit, dipublikasikan/diarsipkan melalui workflow versioned, atau dipulihkan sebelumnya membuat restore ditolak secara atomik; tidak ada flag force. Restore menulis JSON before dan menambah version, bukan rewind version/status/routes. Reopen form sesudah apply/restore. Runtime masih kompatibel dengan legacy yang dipulihkan melalui read adapter. Public portfolio kini memakai request memoization dan persistent payload cache di belakang live revision guards. Apply/restore CLI menambah version/updatedAt sehingga request berikutnya memakai key baru, tanpa CLI memanggil Server Action updateTag. Reload halaman setelah operasi; jangan mengedit SQL tanpa menjaga version/updatedAt.

Database lokal `lunabiner`: batch `f5223b97-3cc5-475b-bcbb-ffeb2ec920b1` memigrasikan 3 record pada 2026-10-04; backup disimpan lokal dan belum dihapus. Restore telah diuji hanya pada database disposable, bukan dijalankan pada data utama.

QA admin memakai `tests/portfolio-actions.test.mjs` dan `tests/portfolio-browser.mjs` pada database disposable bernama `lunabiner_portfolio_test`, bukan database aplikasi. Browser script menerima PORTFOLIO_TEST_ORIGIN loopback, PLAYWRIGHT_MODULE jika package di luar repository, serta PLAYWRIGHT_EXECUTABLE opsional untuk Chrome terpasang. Jalankan preview dengan DATABASE_URL test yang sama; fixtures/session/browser context dibersihkan setelah tes. Jangan menjalankan destructive cleanup tests menggunakan database produksi.

## Portfolio cover storage — PRD 005 Task 5A

### Product cover — PRD 002 Task 4

Deploy runtime editor/action/service/read schema/media route bersama; install dari lockfile, build dan restart aplikasi. Tidak ada SQL migration/seed/data cleanup/upload otomatis. `PRODUCT_UPLOAD_DIR` optional server-only absolute persistent directory di luar public/build artifacts, default `storage/product-covers` (ignored Git). Gunakan volume Node/VPS, root/subdir UUID0700 dan file0600 milik proses; storage validation menolak relative path/symlink/permissions terbuka. Production/standalone wajib set absolute path agar cwd/redeploy tidak memutus file. Jangan mengubah .env real ke contoh atau mengunggah secret.

Kontrak file/normalisasi/body envelope/retention mengikuti portfolio di bawah:5MiB JPG/PNG/WebP statis,16MP/per sisi8000, normalized WebP1600, request6MiB. Product storage wrapper mereuse normalizer/private filesystem factory, dengan env/default directory/namespace terpisah; authorization route tetap khusus PRODUCT. `/media/products/{content UUID}/{asset UUID}` selalu cek current reference dan live eligibility/permission; private/no-store/noindex/nosniff. Thumbnail unoptimized, Next optimizer menolak `/media/**`. Jangan static-map/cache disk/route pada proxy/CDN; kirim cookie preview admin.

Backup DB+product volume konsisten, retain old covers untuk manual recovery; replace/remove membuat old URL404 meski file retained. Archive/restore mempertahankan cover. Belum ada GC, cloud storage atau multi-instance sharing/coordination. Failed new assets dibersihkan hanya jika DB memastikan tidak attached; private orphan dapat tertinggal pada kegagalan ambigu. Quota/retention/production persistence perlu ditangani operator. Jangan menghapus seluruh storage untuk mengatasi error.

QA tambahan: `tests/products-cover.test.mjs`, `products-cover-integration.test.mjs`, dan diperluas `products-browser.mjs` dengan multipart nyata >1MiB, retained File retry, replace/cancel/remove, thumbnail/eligibility/optimizer. Browser self-spawn production3010 dengan PRODUCT_UPLOAD_DIR temporary; PostgreSQL loopback55441 disposable. Fixtures/temp upload dibersihkan, server3000/database utama tidak ditulis. Lihat [Products](../features/products.md) untuk API/behavior dan report.

Install lockfile dependencies, rebuild dan restart; Sharp kini dependency langsung server untuk decode/re-encode. Tidak ada SQL migration/seed/upload otomatis. `PORTFOLIO_UPLOAD_DIR` opsional **server-only**, harus path absolut persistent di luar `public/` dan artifact build. Default `storage/portfolio-covers` relatif cwd development diabaikan Git. Untuk production/standalone set path absolut agar restart/redeploy/perubahan cwd tidak kehilangan akses file. Sediakan writable persistent volume VPS/Node; ephemeral/serverless filesystem atau beberapa instance dengan disk terpisah belum didukung.

Root dan subdirektori UUID harus private 0700, file WebP 0600, dimiliki user proses. Symlink atau permissions yang terlalu terbuka ditolak. Jangan memetakan folder ini sebagai static directory di reverse proxy: akses melalui `/media/portfolio/{content UUID}/{asset UUID}` memeriksa referensi current dan publication/permission tiap request. Jangan cache route media atau melewatkan auth cookies untuk preview admin. App mengirim private/no-store/noindex/nosniff; optimizer Next hanya menerima `/images/**`, upload langsung unoptimized. Salinan yang telah diunduh tidak dapat ditarik kembali.

Server Action body limit 6 MiB termasuk multipart/field editor; reverse proxy perlu mengizinkan setidaknya 6 MiB request. File maksimal 5 MiB, JPG/PNG/WebP statis hingga 16 juta pixel/per sisi 8.000; output WebP maksimal 1.600 per sisi. Kombinasi file mendekati limit dengan rich JSON besar masih bisa melewati envelope 6 MiB dan harus dikurangi, bukan menaikkan limit file diam-diam.

Backup database **dan** upload volume secara konsisten. Replace/remove hanya mengubah referensi; file lama tetap privat tetapi tidak disajikan. Archive/restore menjaga current cover. Belum ada auto garbage collection; sediakan retention/quota disk dan proses recovery manual yang ditinjau operator. File baru dari failed mutation dihapus hanya jika database memastikan belum terpasang; private orphan bisa dipertahankan saat commit/cleanup ambigu. Jangan menghapus seluruh storage untuk menyelesaikan error. Jangan commit asset uploads/backups atau log filename asli/content.

QA: `tests/portfolio-cover.test.mjs`, `portfolio-cover-integration.test.mjs`, `portfolio-cover-browser.mjs`. Integration/browser hanya database disposable `lunabiner_portfolio_test`; browser membatasi role/port loopback 55441 dan menjalankan production server sendiri 3008. Jalankan serial setelah build/Prisma generate selesai, karena generate saat Prisma test aktif dapat merusak shared native engine load. Browser memerlukan bundled Playwright/Chrome dan menguji multipart nyata >1 MiB. Fixtures/temp upload directories dibersihkan; database utama tidak disentuh.

## Public SEO dan standalone assets

### Portfolio rendering/cache deployment

Rebuild/restart setelah upgrade Task 5; tidak ada migration atau environment cache baru. Cache Components tetap nonaktif: Work adalah streaming SSR, bukan static/PPR/ISR. Payload eligible memakai cache internal Next (default `.next/cache`) dengan TTL 300 detik dan tag portfolio-public. Jangan menyajikan folder cache sebagai aset publik. Directory/artifact runtime perlu mendukung cache writes agar reuse bertahan sesuai deployment; inventory/route/revision guards selalu membutuhkan DB live. Kehilangan cache pada redeploy hanya membuat payload cold, bukan mengaktifkan portfolio nonpublic.

Server Actions save/archive/restore segera expire tag; ordinary CASE_STUDY CMS save juga invalidate. Scheduled publication mengevaluasi timestamp UTC pada setiap request, tidak memerlukan cron/status flip atau menunggu TTL. Gunakan clock server yang tersinkronisasi. Payload versi yang pernah public dapat tetap berada pada cache storage, tetapi guard live menentukan akses; cache bukan mekanisme backup. Multi-instance tag propagation, shared cache backend, load/kapasitas dan serverless storage belum diverifikasi/diimplementasikan. Untuk beberapa instance, rancang cache/storage coordination sebelum mengklaim immediate cross-instance behavior.

Reverse proxy tidak boleh menyajikan full-page public/private cache yang mengabaikan publication/locale/auth. Verifikasi streaming setelah reverse proxy; buffering seluruh response dapat menunda intro walaupun aplikasi mengirimnya lebih awal. Route detail sengaja menyelesaikan guard/metadata/canonical sebelum mengirim response agar HTTP 404/308 benar. Media cover tetap private/no-store sesuai bagian storage.

Final QA lokal menggunakan disposable DB saja. Hasil acceptance dan batas operasional dicatat pada [Laporan final QA portfolio](../reports/2026/10/04/portfolio_final_qa.md); deployment production, origin/domain, Search Console dan backup volume nyata tetap memerlukan verifikasi operator.

Set `NEXT_PUBLIC_APP_URL` ke origin HTTPS production yang benar sebelum `npm run build` (tanpa subpath, query atau fragment), agar canonical, hreflang, schema dan OG URL tidak menunjuk localhost/preview. Variabel ini publik dan bukan tempat menyimpan credential.

Halaman HTML kini request-rendered agar lang pada root sesuai ID/EN dari proxy. Jangan mengubahnya menjadi export statis atau menghilangkan proxy request-header forwarding. Sitemap dibaca saat request sehingga membutuhkan koneksi database read-only yang tersedia; publication/withdrawal tidak memerlukan rebuild. Pastikan reverse proxy meneruskan request ke Next dan tidak menyajikan cache HTML lintas path/locale. Setelah deploy, periksa /id/about dan /en/about untuk lang/canonical, /sitemap.xml untuk published URLs/hreflang, /robots.txt serta endpoint OG. Search Console/domain verification/submission merupakan langkah operasional terpisah setelah origin resmi benar.

Endpoint OG berjalan pada Node dan membaca `public/images/lunabiner-logo.png`. Output tracing saat ini menyertakan logo; deployment tetap perlu menyertakan seluruh `public/` dan `.next/static/` untuk logo/font/aset halaman. Untuk standalone, salin assets ke `.next/standalone/public/` dan `.next/standalone/.next/static/`, lalu jalankan `node .next/standalone/server.js` sesuai konfigurasi host/port platform. Jangan menghapus aset dari artifact. Setelah upgrade, rebuild dan restart app; tidak ada migration baru untuk SEO. Lihat [Public SEO](../features/seo.md).

## LunaBiner AI

Apply reviewed migrations with `npx prisma migrate deploy` before enabling the assistant. Configure the six infrastructure variables in `.env.example` through the secret manager; runtime tuning belongs to the database. Follow [AI activation and troubleshooting](../ai-assistant.md). Reverse proxies must overwrite forwarded IP headers for rate limiting. Reindex knowledge after changing published content.

OpenAI chat and embedding URLs are separate endpoints. Use plain URLs, not Markdown links: `https://api.openai.com/v1/chat/completions` and `https://api.openai.com/v1/embeddings`, respectively ([official embedding API reference](https://developers.openai.com/api/reference/resources/embeddings/methods/create)). Restart the app after infrastructure environment changes. Keys remain in ignored environment files; models and streaming settings remain in database runtime configuration.
