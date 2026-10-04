# Implementation Report — Portfolio production cache regression

**Tanggal:** 2026-10-04

**Classification:** LARGE (lanjutan PRD 003 Task 5B)

**Status:** COMPLETED untuk Task 5B.3

## Rencana dan Tracking

- Current Task: 5B.3 — membuktikan cache, invalidation, streaming dan publication/privacy pada runtime production.
- Progress: suite production baru memakai query execution log dan browser Server Actions, bukan mock cache; semua assertions cache/streaming/lifecycle lulus. Task 5 selesai menggunakan fallback yang disetujui, bukan PPR.
- Next Task: Task 6 final QA; tidak diimplementasikan otomatis.

## Penyebab dan Perubahan

- Penyebab: Task 5B.2 menyediakan implementasi dan unit policy, tetapi belum membuktikan cache hit/miss dan updateTag pada Next runtime production.
- Perubahan: tambah suite `portfolio-cache-production.mjs`. Query PostgreSQL dihitung hanya pada execute (bukan parse/bind), membedakan payload SELECT translations/details dari live revision guard.
- Cold detail/list menjalankan satu query payload; warm request tidak mengulang payload tetapi tetap membaca eligibility. Canary dengan UUID/version/updatedAt yang tidak berubah digunakan untuk membuktikan tag expiry sesudah admin save, bukan sekadar key turnover karena edit.
- Transaction lock pada ContentEntry disposable menahan query. HTTP stream harus mengirim intro/loading sebelum lock dilepas, lalu cards/schema sesudahnya. Tidak mengklaim static HTML/PPR/ISR atau benchmark latency/ranking SEO.
- Browser admin mengedit title/body ID/EN dan slug, mengganti status langsung, lalu arsip/pulihkan. Anonymous/bot dan request dengan cookie admin sama-sama tidak boleh mendapat private detail melalui public route. Schedule diuji melewati UTC minute pada clock nyata tanpa SQL status mutation/job; enum tetap SCHEDULED.
- Initial test harness corrections: PostgreSQL extended protocol mencatat parse/bind/execute terpisah; success notice editor dapat hilang saat router refresh. Observer diperbaiki menghitung execute dan menunggu response POST/DB version, tanpa mengubah aplikasi.

## File Change

- Created: `tests/portfolio-cache-production.mjs`, laporan ini.
- Modified: `docs/features/portfolio.md`, `docs/features/seo.md`, `docs/README.md` untuk hasil/tracking/instruksi test.
- Deleted: None.
- Move/Rename: None.

## Database Change

None untuk schema/tabel/kolom/index/constraint/migration maupun data utama. Fixture sintetis hanya pada lunabiner_portfolio_test, role portfolio_test, loopback port 55441. Log duration query diaktifkan hanya pada server disposable (nilai parameter tidak dicatat). Transaction lock bounded 15 detik dan fixture/session/audit dibersihkan dalam finally. Tidak mengubah konfigurasi logging database utama.

## Architecture Change

None. Tidak ada perubahan production feature/config/dependency/endpoint atau desain. Arsitektur fallback Task 5B.2 dipertahankan; test menunjukkan apa yang benar-benar dilakukan runtime, bukan menambah endpoint instrumentasi publik.

## Verification

- Typecheck/lint/build baseline: PASS.
- Unit contracts/cache/rich/validation: 12 tests PASS.
- Production SQL hit/miss, HTTP streaming dan unchanged-canary Server Action tag expiry: PASS.
- Publication/lifecycle/browser suite: PASS — ID/EN edit/slug, direct draft/review/publish, future→due schedule pada clock nyata, archive/restore DRAFT, bot/browser 404/308, private public route tetap 404 dengan admin cookies, metadata/OG/schema/sitemap, zero page errors/runtime cache errors.
- Pengukuran mencakup fixture lokal: cold payload 1, warm 0, unchanged canary setelah save 1 lalu warm 0. Tidak mengukur throughput, TTL expiry 300 detik atau multi-instance cache propagation.
- Existing cover/browser regression: PASS — private media/no-store, optimizer deny, file upload/thumbnail, permissions, friendly errors, archive/restore dan desktop/mobile overflow assertions. Existing production routing HTTP regression: PASS — empty DB, related entries, ID/EN SEO/OG/sitemap, number/UUID/history aliases serta nonpublic 404 untuk bot/browser.
- Disposable fixtures/session/audit/storage dibersihkan dan server test dihentikan. QA screenshot existing disimpan sementara di `/private/tmp/lunabiner-cover-browser-qa-xRh6oP`, bukan asset production atau bagian commit. Perubahan pengguna AGENTS.md tetap tidak disertakan; tidak melakukan push.
- `git diff --check`: PASS.
- Final QA keseluruhan, penilaian visual lengkap desktop/mobile dan deployment tetap Task 6.
