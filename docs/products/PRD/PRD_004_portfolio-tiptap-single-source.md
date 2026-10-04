# PRD 004 — Portfolio Tiptap single source

Tanggal: 2026-10-04.
Sumber: refinement pengguna setelah penghapusan panel Detail studi kasus; disetujui melalui “oke eksekusi” dengan syarat data database yang tidak dipakai dihapus.
Mengubah requirement structured narrative PRD 003 tanpa menimpa arsip PRD tersebut.

## Requirement

- Narasi detail portfolio menggunakan Tiptap ID/EN sebagai sumber utama dan dirender aman di server.
- Pindahkan isi legacy ke richBody sebagai konten awal; jangan menimpa tulisan/format admin atau menggandakan isi yang sudah tercakup.
- Hapus representasi legacy yang sudah tidak dipakai setelah migrasi konten berhasil, bukan sekadar menyembunyikan field UI.
- Field yang disebut pengguna berada di JSON ContentEntry.details, bukan kolom SQL terpisah. Kolom details dan data ARTICLE/PRODUCT tetap dipertahankan.
- Target key narasi: industry, challenge, approach, solution, impact, before, after, architecture, capabilities, technology. Audit pemakaian sebelum menghapus; jangan memutus kartu, SEO atau seeder.
- Field metadata, workflow, verifikasi dan data yang masih digunakan bukan target penghapusan otomatis.
- Migrasi meliputi seluruh CASE_STUDY termasuk draft dan arsip; UUID, slug, status, publication date dan route reservations tidak diubah.
- Preview dahulu, backup sebelum apply, validasi kedua bahasa dan batas rich content; kesalahan tidak boleh menghasilkan penghapusan parsial.
- Migrasi idempotent, mempertahankan optimistic version protection dan tidak memanggil LLM/embedding.
- Tidak sekaligus mengubah slug routing atau mengaktifkan PPR. Task public routing/cache PRD 003 tetap terpisah.

## Acceptance

1. Isi ID/EN lama tersedia di editor, existing rich nodes/marks tetap utuh dan konten identik tidak diduplikasi.
2. Public menampilkan rich document, bukan blok legacy berulang; metadata tetap valid dan konsisten.
3. Save/seeder tidak menciptakan kembali key narasi legacy pada CASE_STUDY.
4. Setelah apply, database tidak menyimpan key target tersebut pada CASE_STUDY; artikel/produk tidak berubah.
5. Unit/integration, typecheck/build dan desktop/mobile QA lolos.

## Tracking

Implementasi bertahap: konverter/preview → runtime integration → backup/apply/QA. Kondisi aktual dicatat di [Portfolio](../../features/portfolio.md), bukan disimpulkan dari requirement ini.
