# Portfolio — penghapusan panel Detail studi kasus

**Tanggal:** 2026-10-04

**Classification:** SMALL

**Status:** COMPLETED

## Rencana dan Tracking

- Current Task: Refinement editor portfolio setelah Task 3, sebelum Task 4.
- Progress: Seluruh panel Detail studi kasus dihapus; narasi cukup Tiptap ID/EN.
- Next Task: Task 4 — public database-only work/list/detail, canonical slug, rich renderer dan SEO/links. Belum dimulai; membutuhkan konfirmasi pengguna. Task 5 rendering/cache/PPR dan Task 6 final QA juga tersisa.

## Penyebab dan Perubahan

- Penyebab: Field narasi terstruktur menduplikasi editor bilingual, dan pengguna meminta seluruh panel dihapus tanpa panel pengganti.
- Perubahan: Portfolio hanya menampilkan metadata dasar/workflow, title/excerpt, Tiptap dan SEO ID/EN. Panel generic artikel/produk tidak diubah.
- Save portfolio hanya menerima category, tags, authorName dan image untuk details. Field legacy diambil dari database di dalam transaction; input palsu untuk field yang dihapus diabaikan. Existing client, verifiedProject, overview, narasi, technology, capabilities, relasi dan CTA tidak dikosongkan.
- Record baru mempertahankan schema defaults, termasuk verifiedProject=false. Service langsung tanpa opsi preservation tetap kompatibel dengan kontrak detail lengkap.
- Tidak mengubah renderer public, metadata/schema public, slug routing, desain merek atau strategi rendering. Public existing masih membaca legacy details; penggunaan rich renderer public adalah Task 4.

## File Change

- Created: `docs/reports/2026/10/04/portfolio_detail_panel_removal.md`.
- Modified: `src/features/cms/editor.tsx`, `form.ts`, `service.ts`; `src/features/portfolio/actions.ts`, `service.ts`; `tests/portfolio-actions.test.mjs`, `tests/portfolio-browser.mjs`; `docs/features/portfolio.md`, `docs/features/phase2.md`, `docs/README.md`.
- Deleted: None. Hanya panel UI dihapus, bukan file atau data tersimpan.
- Move/Rename: None.

## Database Change

None. Tidak ada migration, perubahan tabel/kolom/index/constraint atau penghapusan data utama.

## Architecture Change

Boundary existing dipertahankan. Opsi internal server-only `preservePortfolioDetails` menggabungkan detail tersimpan dan empat metadata dasar di dalam transaksi CMS yang sudah menjalankan RBAC, optimistic version dan audit. Opsi bukan payload client; tidak ada endpoint baru.

## Verification

- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS, production webpack build Next 16.3.8.
- CMS/portfolio/permissions/SEO regression: 18/18 PASS pada database uji terpisah `lunabiner_portfolio_test`.
- Portfolio actions/integration: 7/7 PASS. Termasuk legacy details preservation, metadata update, untrusted removed fields, verifiedProject default, version/RBAC/lifecycle.
- Chrome headless production QA: PASS create/edit/reload Tiptap, heading/list/link, unsafe-link rejection, publication/archive/restore, authorization, absence of panel/removed inputs, generic panel retained, mobile overflow.
- Inspeksi screenshot desktop dan mobile: form tetap konsisten, toolbar membungkus sesuai viewport. Artefak sementara: `/private/tmp/lunabiner-portfolio-admin-qa-a1vSVO`.
- Percobaan awal regresi SEO tanpa DATABASE_URL eksplisit gagal koneksi localhost:5432; dijalankan ulang dengan database disposable dan seluruh tes lolos. Tidak ada mutation utama dari percobaan gagal.
- Tidak memanggil LLM/embedding atau mengubah kredensial. Perubahan pengguna pada AGENTS.md dan public work detail tidak dimasukkan dalam commit ini.
