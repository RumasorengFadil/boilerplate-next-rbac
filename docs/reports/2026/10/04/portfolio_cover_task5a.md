# Implementation Report — Portfolio cover Task 5A

**Tanggal:** 2026-10-04

**Classification:** MEDIUM

**Status:** COMPLETED

## Rencana dan Tracking

- Current Task: Task 5A — upload cover/thumbnail dari perangkat, refinement [PRD 005](../../../../products/PRD/PRD_005_portfolio-cover-upload.md).
- Progress: file picker, preview, keep/replace/remove/cancel, UUID persistence, secure media delivery dan public thumbnail/detail tersedia. PRD 003 Task 1–4 dan PRD 004 tetap selesai; tidak mengklaim seluruh Task 5 selesai.
- Next Task: Task 5B — cache/PPR sesuai PRD 003, kemudian Task 6 final QA. Memerlukan konfirmasi pengguna sebelum lanjut.

## Penyebab dan Perubahan

- Penyebab: pengguna meminta create/edit portfolio memilih gambar perangkat, bukan mengisi path. Briefing menyetujui Node/VPS persistent local storage untuk tahap ini.
- Perubahan: multipart Server Action, Zod MIME/size, signature/decoder validation, APNG/animated WebP rejection, 16 MP/8.000 px limit, resize WebP 1.600 px quality 82 tanpa metadata. File maksimal 5 MiB; request envelope 6 MiB.
- File/record UUID dihasilkan server; filename original tidak disimpan. Keep memakai nilai DB, bukan client path. Replace/remove/version/publisher guards dan audit tetap transactional. Newly unattached files dibersihkan bila dapat dipastikan; uncertain commit mempertahankan private orphan. File lama/detached disimpan tetapi tidak disajikan.
- Browser QA menemukan React mereset teks uncontrolled setelah gagal upload. Portfolio fields kini controlled dan pilihan File disimpan di client state; upload invalid tetap mempertahankan teks/rich content. Generic article/product editor tidak diubah menjadi uploader.
- Cover detail dan work/home thumbnail memakai current image; no-cover fallback gradient, logo, warna, spacing, typography dan CTA LunaBiner existing tetap dipertahankan. Tidak menambahkan inline Tiptap/gallery/crop/media-library/object storage atau fitur PRD lainnya.

## File Change

### Created

- `docs/products/PRD/PRD_005_portfolio-cover-upload.md` — snapshot requirement sebelum implementation.
- `src/features/portfolio/cover-schema.ts` — shared pure contracts UUID/path/File/operation.
- `src/features/portfolio/cover-storage.ts` — private Node storage/Sharp validation/normalization/cleanup.
- `src/features/portfolio/cover-input.tsx` — picker/preview/error/keep/remove/cancel UI.
- `src/app/media/portfolio/[contentId]/[assetId]/route.ts` — publication/permission-aware binary GET.
- `tests/portfolio-cover.test.mjs` — raster/path/storage/generic-content validation.
- `tests/portfolio-cover-integration.test.mjs` — actions/DB/authorization/conflict/media lifecycle.
- `tests/portfolio-cover-browser.mjs` — production multipart/browser/desktop/mobile QA.
- `docs/reports/2026/10/04/portfolio_cover_task5a.md` — laporan ini.

### Modified

- `src/features/cms/editor.tsx` — portfolio picker dan form state recovery.
- `src/features/cms/form.ts` — abaikan portfolio client image path.
- `src/features/cms/schema.ts` — valid internal uploaded path, portfolio-only.
- `src/features/cms/service.ts` — trusted UUID/cover options, ownership, preservation/audit.
- `src/features/cms/public.tsx` — thumbnail dan direct uploaded-cover rendering.
- `src/features/portfolio/actions.ts`, `service.ts` — upload orchestration/cleanup/options.
- `next.config.ts` — 6 MiB actions, optimizer allowlist existing `/images/**` saja.
- `package.json`, `package-lock.json` — Sharp 0.35.5 dependency langsung; tidak upgrade versi transitif.
- `.env.example`, `.gitignore` — optional server-only persistent storage dan upload ignore.
- `tests/portfolio-actions.test.mjs` — keep ignores forged image path regression.
- `docs/features/portfolio.md`, `phase2.md`, `seo.md`, `docs/database/schema.md`, `docs/deployment/installation.md`, `docs/README.md` — kontrak aktual, storage/backup/deploy/SEO/tracking.

### Deleted

None. Tidak menghapus konten/file user. Cleanup otomatis hanya synthetic fixtures dan temporary upload files dari QA disposable; file lama aplikasi tidak disentuh.

## Database Change

- Tables/columns/indexes/constraints/SQL migrations: None.
- `ContentEntry.details.image` existing menyimpan current UUID media URL atau string kosong. ID tetap UUID. Audit CASE_STUDY before/after mencakup image path; tidak menyimpan bytes/original filename.
- Database utama `lunabiner` tidak diberi fixture atau diubah pada task ini. Pengujian memakai database disposable `lunabiner_portfolio_test` port 55441; fixtures/session/assets dibersihkan. Backup PRD 004 tetap dipertahankan.

## Architecture Change

- Local persistent filesystem di luar public/build; optional absolute `PORTFOLIO_UPLOAD_DIR`, default ignored `storage/portfolio-covers`. Directories 0700/files 0600, no symlink, exclusive create/fsync. Production memerlukan persistent volume serta DB+media backup/retention; bukan solusi ephemeral/serverless/multi-instance separate disks.
- `GET /media/portfolio/{contentId}/{assetId}`: UUID Zod; only exact referenced CASE_STUDY asset. Public hanya nondeleted PUBLISHED/due SCHEDULED. Preview selain itu memerlukan content:read. Invalid/missing/unauthorized/detached 404; storage/DB error 503; success binary WebP 200. Headers no-store/private, nosniff, noindex; tidak login redirect untuk anonymous.
- Upload dirender unoptimized; optimizer menolak `/media/**` supaya cache publik tidak melewati withdrawal/auth. OG branded endpoints/metadata/schema tidak berubah. Cache Components/PPR/ISR belum diaktifkan oleh Task 5A.

## Verification

- `npm run lint`, `npm run typecheck`, `npm run build`: PASS.
- 36 Node tests: PASS (24 storage/actions/integration/public-content/SEO + 12 CMS/portfolio/legacy/permission contracts), termasuk invalid bytes/size/animation, owner binding, safe file modes, symlinks, failed-version cleanup, draft/read permissions, replacement/remove/archive/restore dan audit.
- `tests/portfolio-cover-browser.mjs`: PASS — actual >1 MiB multipart create/upload, invalid file recovery, retained text, preview/keep/cancel/replace/remove, draft/published image access, optimizer rejection, editor publisher guard, public work/home/detail images, desktop/mobile no horizontal overflow dan zero pageerrors.
- Screenshots reviewed: desktop/mobile work dan editor di `/private/tmp/lunabiner-cover-browser-qa-Pdj9uD/` (local QA artifacts, bukan committed assets). Fixture cover teal sederhana untuk memeriksa layout, bukan karya portofolio nyata.
- `tests/portfolio-routing-http.mjs`: PASS — empty DB/list/home/detail/related, canonical/OG/sitemap, 308 aliases, nonpublic 404, due schedules.
- `tests/seo-http.mjs`: PASS — 22 public ID/EN pages, metadata/schema/real OG PNG, canonical crawl/hreflang, publication changes, private directives dan bot/browser user agents.
- `git diff --check`: PASS. Secrets/generated/assets/backup dan perubahan user pada AGENTS.md tidak disertakan task commit.

## Remaining Tasks

- Task 5B — feasibility PPR/cache, public rendering/invalidation/publication timing tanpa melanggar locale/private/SEO invariants.
- Task 6 — final end-to-end lifecycle dan production readiness review.
- Operational: production storage volume/backup/retention harus dikonfigurasi saat deployment. Auto garbage collection dan serverless/object storage di luar scope; tidak diimplementasikan diam-diam.
