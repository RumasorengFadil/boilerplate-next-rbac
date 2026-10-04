# PRD 005 — Portfolio cover upload

Tanggal: 2026-10-04. Requirement disetujui pengguna setelah briefing upload dari perangkat dan penyimpanan lokal server.

## Scope

- Form create/edit portfolio memakai input file, bukan path manual, dengan preview, penggantian, penghapusan referensi cover dan batal perubahan.
- Cover existing dipertahankan jika tidak diganti; input file kosong tidak berarti hapus. Validasi/gagal simpan tidak menghapus gambar tersimpan.
- JPG/JPEG, PNG atau WebP, maksimal 5 MiB; validasi bytes/format/dimensi server, menolak SVG/animasi/file palsu. Output dinormalisasi WebP tanpa metadata; filename asset UUID dan record UUID.
- Cover detail dan thumbnail work/homepage memakai gambar yang sama; tanpa cover tetap memakai tampilan brand existing.
- Upload memerlukan content:write dan workflow/version guards existing. Draft image preview hanya pengguna berizin content:read; anonymous hanya current cover record layak terbit.
- Local storage persisten di luar public/build, configurable server-only; file tidak di-commit. Deploy VPS/Node memerlukan writable persistent volume. Serverless/object storage tidak diimplementasikan.
- URL disimpan pada ContentEntry.details.image; tidak membuat tabel media atau permanent-delete fitur baru. Gambar lama yang diganti/detached dipertahankan di disk tetapi tidak otomatis disajikan. File baru dari gagal simpan dibersihkan jika tidak pernah terpasang pada record.
- Atomic database save/audit tetap digunakan; kegagalan storage tidak menyebabkan success palsu. Cover path terikat pemilik record untuk mencegah cross-record reuse input palsu.
- Tidak menambahkan upload inline Tiptap, gallery upload, crop tool, image library, cloud integration, CMS→RAG atau image OG baru.

## Tracking

Task 5A adalah refinement ini; Task 5B tetap cache/PPR PRD 003, lalu Task 6 final QA. Eksekusi satu task lalu report/review. Kondisi aktual dicatat pada docs/features/portfolio.md dan laporan bertanggal.
