# Portfolio Tiptap single source — Task 2

**Tanggal:** 2026-10-04

**Classification:** MEDIUM

**Status:** COMPLETED (Task 2; bulk cleanup belum selesai)

## Rencana dan Tracking

- Current Task: PRD 004 Task 2 — editor/public/save/seed/SEO memakai rich content.
- Progress: Legacy muncul sebagai default Tiptap ID/EN saat membaca, public merender rich JSON tanpa blok legacy tambahan, save/seed tidak membuat kembali sepuluh key narasi.
- Next Task: PRD 004 Task 3 — backup, atomic bulk migration/cleanup dan QA semua record database. Menunggu konfirmasi pengguna. PRD 003 slug/redirect/DB-only fallback removal, cache/PPR dan final QA masih tersisa; belum diklaim selesai.

## Penyebab dan Perubahan

- Penyebab: Panel admin telah dihapus tetapi public masih menampilkan details legacy secara terpisah dari body.
- `presentContent` CASE_STUDY menggunakan pure converter Task 1 tanpa writes. Shared read adapter memberikan dokumen awal yang sama ke editor dan public, termasuk plain legacy records. ARTICLE/PRODUCT tetap kontrak/renderer existing.
- Renderer React memvalidasi rich JSON, menggunakan semantic H2/H3/H4/paragraf/list/quote/code/link, meng-escape text dan menolak node/URL/attribute tidak aman. Tidak memakai raw HTML atau memuat Tiptap client di public.
- Detail desktop overview metadata kiri dan rich document kanan; mobile vertikal. Narasi industry/challenge/approach/solution/impact/before/after/architecture/capabilities/technology tidak dirender ulang sebagai blok legacy. Metadata category/tags/credit/verified client, cover/features/gallery/related services/CTA yang masih digunakan tetap dipertahankan.
- Save CASE_STUDY mengonversi input legacy direct service untuk compatibility; form editor menggunakan submitted richBody sebagai tulisan final dan hanya mempertahankan non-narrative metadata dari previous. Text yang sengaja dihapus tidak dipaksakan kembali. Empty defaults dalam Zod parsed objects tidak disimpan sebagai key narasi JSON.
- Seed baru menyimpan rich content termasuk industry/capabilities dan metadata category/tags; seed ulang tetap tidak menimpa record existing.
- Kartu CMS memakai category; SEO memakai category/tags/domain label, bukan legacy capabilities. Numeric aliases terpetakan membaca DB record eligible dan berbagi canonical/metadata/schema/OG UUID. Mapped draft/archived/deleted menghasilkan null/404, bukan fallback statis. Unmapped numeric static compatibility tetap sampai PRD 003 Task 4.
- Scope tambahan yang diperlukan: sitemap membuang mapped numeric aliases agar tidak menduplikasi UUID canonical atau menyertakan URL 404. Test loader menambahkan resolusi next/link.js dan next/image.js untuk direct Node render tests. Typing output converter dipersempit ke validated non-narrative JSON subset agar kompatibel dengan Prisma tanpa cast JsonValue yang tidak tervalidasi.

## File Change

- Created: `src/features/cms/rich-text-renderer.tsx`, `tests/portfolio-public-content.test.mjs`, laporan ini.
- Modified: `src/features/cms/public.tsx`, `src/features/cms/service.ts`, `src/features/portfolio/legacy-content.ts`, `src/features/portfolio/seed.ts`, `src/features/website/seo/content.ts`, `src/features/website/seo/sitemap.ts`; `tests/portfolio-actions.test.mjs`, `tests/portfolio-integration.test.mjs`, `tests/portfolio-browser.mjs`, `tests/server-loader.mjs`; `docs/features/portfolio.md`, `docs/features/phase2.md`, `docs/features/seo.md`, `docs/database/schema.md`, `docs/README.md`.
- Deleted: None.
- Move/Rename: None.

## Database Change

- Tables/Columns/Indexes/Constraints/Migrations: None.
- CASE_STUDY save/seed kini menghapus sepuluh key narasi pada payload yang disimpan, setelah narasi terwakili richBody; non-narrative metadata tetap ada. UUID/routes/status/publication workflow tidak berubah.
- Database utama hanya dibaca untuk preview dan HTTP: masih 3 rows, 3 with legacy keys, 3 convertible changes, 0 invalid. Tidak ada bulk mutation utama. Fixture writes/cleanup hanya pada disposable `lunabiner_portfolio_test`.
- Bulk removal seluruh record termasuk draft/arsip/deleted dan backup belum dilakukan (Task 3). Ini cleanup key JSON, bukan DROP COLUMN details.

## Architecture Change

Shared presentation adapter menormalkan CASE_STUDY di server dan renderer pure React menggantikan plain/legacy case-study rendering. Authorization, transactions, audit, optimistic versions, publication predicate dan revalidatePath existing dipertahankan. Tidak ada endpoint baru, provider call, cross-request cache, PPR flag atau framework upgrade.

## Verification

- Typecheck/lint/build: PASS (Next 16.3.8 webpack).
- Pure CMS/portfolio/legacy/permissions suite: 12/12 PASS.
- Serial DB/render suite: 21/21 PASS, mencakup actions, persistence/seed/lifecycle/RBAC, nonmutating read adapter, safe HTML, article/product regression, mapped alias/canonical/sitemap, SEO/OG PNG. Total 33 tests PASS.
- Production Chrome headless QA: PASS editor legacy defaults ID/EN, rich heading/list/link save/reload, intentional deletion, absent legacy keys after save, REVIEW/PUBLISHED, archive/restore, RBAC, public UUID/numeric ID/EN, no duplicate legacy headings, desktop/mobile no document overflow.
- Screenshot desktop/mobile public dan editor diperiksa: `/private/tmp/lunabiner-portfolio-admin-qa-qBlkxz`; artefak tidak di-commit. Viewport captures mobile menggantikan full-page compositing Chrome yang sempat mengulang fixed layers; DOM tetap satu H1 dan no overflow. Visitor QA menolak analytics melalui localStorage profil disposable agar overlay tidak menghalangi konten. Existing LunaBiner logo/teal/orange, typography/card spacing dan responsive patterns dipertahankan.
- Read-only main dev HTTP: `/id/work/2`, `/en/work/2`, `/id/work/9b7b418a-6bf3-40d2-9576-1b7fbed5d3e7` HTTP 200, rich renderer aktif, raw legacy industry heading tidak ada.
- Percobaan awal direct Node test memerlukan loader Next component resolution; diperbaiki. Typecheck awal menemukan JSON output typing dan unreachable CASE_STUDY branch; diperbaiki dan final build lolos. Regresi awal parallel DB sempat bentrok seed alias dengan static SEO fixture; final suite dijalankan serial sesuai docs dan seluruhnya lolos.
- User edits AGENTS.md/public work detail tidak disentuh atau di-commit. Tidak ada secrets, LLM/embedding calls atau push.
