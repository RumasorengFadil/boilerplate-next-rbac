# Implementation Report — Portfolio rendering/cache

**Tanggal:** 2026-10-04

**Classification:** LARGE (lanjutan Task 5B)

**Status:** COMPLETED untuk Task 5B.2; Task 5B keseluruhan PARTIALLY COMPLETED

## Rencana dan Tracking

- Current Task: 5B.2 — fallback streaming SSR + cache data publik sesuai PRD 003 dan persetujuan setelah audit PPR.
- Progress: list streaming, live revision/eligibility guards, persistent payload cache dan immediate Server Action invalidation tersedia.
- Next Task: 5B.3 — production cache hit/miss/invalidation, HTTP timing/privacy/lifecycle regression; kemudian Task 6 final QA. Belum dikerjakan sebagai task lengkap pada laporan ini.

## Penyebab dan Perubahan

- Penyebab: Work page sebelumnya menunggu schema/list sebelum intro; full payload selalu dibaca DB. PPR flag memerlukan migrasi lintas aplikasi (hasil Task 5B.1), sehingga fallback yang diperbolehkan digunakan.
- Work intro tidak menunggu query daftar. Loading state bilingual memakai warna, border, radius dan spacing existing; cards/collection JSON-LD berada di Suspense. Metadata Work memakai registry editorial lengkap tanpa DB; description/keywords schema collection tetap konsisten. Artikel/produk tidak berubah.
- Cache hanya payload CASE_STUDY yang eligible saat query, menggunakan unstable_cache (fallback aplikasi tanpa Cache Components), TTL 300 detik/tag portfolio-public. UUID/version/updatedAt batch dan hash konfigurasi DB membentuk key; tanggal disimpan ISO dan dihidrasi Date. Raw credentials tidak menjadi key/response/log.
- Inventory/revision/route ownership tetap live per request sebelum mengambil cache. Draft, review, arsip/deleted dan future schedule tidak diteruskan ke payload cache; due schedule langsung eligible tanpa menunggu TTL. Warm cache tidak dipakai ketika guard DB gagal. Shared cache tidak menyimpan session/cookie atau keputusan authorization. Payload yang pernah public dapat tetap berada di cache sampai expiry/invalidation, bukan sumber kelayakan publik.
- Mutasi save/archive/restore memakai updateTag sesudah commit dan tetap revalidatePath. Ordinary CASE_STUDY save melalui generic CMS action juga invalidate tag; perubahan ini diperlukan untuk meliputi mutation entry point existing. Version/updatedAt keys tetap melindungi normal save meskipun invalidation terlewat; external SQL harus menjaga keduanya.
- Detail tetap menyelesaikan live guard, payload dan canonical sebelum metadata/404/308; tidak menambah loading boundary di atas guard. Related queries memiliki Suspense terpisah agar body/CTA tidak tertahan. Sitemap/media cover tetap live/no-store. Bukan static HTML, PPR, ISR atau klaim peningkatan ranking SEO.
- Cache batch dapat berbagi payload antar surface dengan revisi identik; singleton detail dan list adalah keys berbeda. Cache tidak menghilangkan semua DB query dan tidak menjanjikan kapasitas/hit ratio tertentu sebelum pengukuran production.

## File Change

- Created: `src/features/portfolio/public-data.ts`, `tests/portfolio-cache.test.mjs`, laporan ini.
- Modified: `src/features/cms/service.ts` (CASE_STUDY adapter), `src/features/portfolio/service.ts` (live slim guards/cache), `src/features/portfolio/actions.ts` dan `src/features/cms/actions.ts` (tag invalidation), `src/features/cms/public.tsx` (related boundary), `src/app/(public)/[locale]/work/page.tsx` (metadata/shell/Suspense), `src/features/website/seo/routes.ts` (stable Work collection description), `tests/server-loader.mjs` (Next cache adapter test), `docs/features/portfolio.md`, `docs/features/seo.md`, `docs/README.md`.
- Deleted: None.
- Move/Rename: None.

## Database Change

None untuk tabel, kolom, index, constraint, relations dan migrations. Tidak ada mutation database utama. Synthetic integration/HTTP fixtures ditulis dan dibersihkan hanya pada disposable lunabiner_portfolio_test, role portfolio_test, loopback port 55441, sesuai guard test. Disposable server dihentikan setelah pengujian.

## Architecture Change

Public data loader khusus portfolio memisahkan live eligibility/revision lookup dari persistent payload cache. Root layout, Cache Components flag, server authorization dan route ownership tetap existing. React request memoization tetap digunakan agar list UI/schema dan detail metadata/page konsisten dalam satu RSC request. Tidak menambah endpoint/cache webhook/provider/dependency baru.

## Verification

- `npm run typecheck`, `npm run lint`, `npm run build`: PASS; route Work tetap dynamic SSR.
- 12 Node tests: PASS — revision reuse, withdrawal semua status, soft deletion, future/due schedule, version/updatedAt refresh, tag expiry adapter, alias guards, date hydration, DB outage, safe rich rendering, friendly validation dan schema contracts.
- Streaming test: React server stream dengan query DB sengaja ditahan mengirim intro/loading sebelum title card; setelah release menghasilkan card slug dan JSON-LD. Ini component-level proof, bukan pengukuran HTTP latency produksi.
- 3 disposable DB-backed action/status tests: PASS — permissions, direct publication, optimistic version, archive/restore, rich preservation dan workflow artikel/produk existing.
- Production routing HTTP suite: PASS — empty DB/home/list/detail/related, ID/EN, canonical/schema/OG/sitemap, number/UUID/history aliases 308 untuk bot/browser, nonpublic 404 tanpa disclosure, due schedules. Production cache API terpakai, tetapi belum mengukur hit ratio atau membuktikan updateTag melalui browser action di production.
- Unit cache tests memakai adapter terkontrol, bukan implementasi persistent cache Next; full production invalidation/privacy/timing regression dan desktop/mobile tetap Task 5B.3/6.
- `git diff --check`: PASS. Commit focused, tanpa push; AGENTS.md milik pengguna tidak disertakan.
