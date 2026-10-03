# Implementation Report — LunaBiner-only Assistant, Task 1

Tanggal: 2026-10-03. Classification: MEDIUM. Status: Task 1 selesai; keseluruhan permintaan masih PARTIALLY COMPLETED sampai review/konfirmasi Task 2.

## Rencana dan tracking

- [x] Task 1 — Pembatasan konteks di server, pemeriksaan pertanyaan/jawaban, pengujian dan dokumentasi.
- [ ] Task 2 — Penjelasan batas konteks dan contoh pertanyaan pada UI assistant, dilanjutkan pemeriksaan browser; belum dikerjakan, menunggu konfirmasi pengguna sesuai Tasks Management AGENTS.md.

## Penyebab dan perubahan

Konfigurasi dan prompt sebelumnya mengizinkan pertanyaan teknologi umum. Sekarang `allowGeneralTechQuestions` hanya menerima `false`, termasuk override nilai `true` konfigurasi lama tanpa mengubah row database. Prompt tetap hanya mengizinkan fakta LunaBiner dan kebutuhan bisnis terkait penawaran LunaBiner; editorial prompt tidak dapat membuka konteks umum.

Guardrail server pada `src/features/assistant/orchestration/scope.ts` memeriksa intent pertanyaan terbaru sebelum retrieval/generasi, kemudian memeriksa draft jawaban terhadap sumber/tool read-only. Klasifikasi menggunakan provider/model aktif dengan temperature 0 dan maksimum 64 output token, hasil JSON divalidasi Zod. Error, tool call classifier dan hasil tidak valid menghasilkan klarifikasi aman. Tidak adanya evidence juga mencegah pelepasan jawaban generatif.

Jawaban di luar scope mendapat penolakan statis Indonesia/Inggris tanpa rekomendasi atau tawaran lead. Penyebutan nama brand, roleplay, instruksi mengganti scope atau pertanyaan campuran tidak membuat permintaan umum menjadi sesuai scope menurut policy classifier.

NDJSON tetap tersedia, tetapi jawaban ditahan sampai pemeriksaan selesai lalu dikirim sebagai satu delta terverifikasi. Tidak ada token draft yang dikirim sebelum pemeriksaan. Desain, layout dan warna UI tidak diubah pada Task 1, sehingga tampilan referensi BisaDev/identitas LunaBiner tetap dipertahankan.

## API, data dan keamanan

- `POST /api/assistant/chat`: payload/input, kepemilikan UUID, rate limit dan consent tetap. Response JSON dan NDJSON `done` menambahkan `scope`: `ALLOW`, `OUT_OF_SCOPE` atau `CLARIFY`.
- `AiMessage.metadata`: jawaban assistant menyimpan `scope`. Penolakan konteks tetap respons selesai normal, bukan error HTTP. Tidak ada tabel, kolom, index, constraint atau migration baru.
- Konfigurasi admin yang mencoba mengaktifkan pertanyaan umum ditolak schema. Nilai lama diabaikan saat runtime load.
- Tidak ada perubahan RBAC, credential, integrasi provider atau model default. Tidak ada secret yang dicatat dalam laporan maupun commit.
- Dokumentasi hidup diperbarui pada `docs/ai-assistant.md`; index laporan ditambahkan ke `docs/README.md`.

## Verifikasi

- `npm run typecheck`: lulus.
- `npm run lint`: lulus.
- `npm run build`: lulus.
- `node --test tests/*.test.mjs`: 37 tes lulus pada PostgreSQL sementara terisolasi (port 55439), bukan database pengguna.
- `NODE_ENV=production node tests/assistant-http.mjs`: lulus; provider mock lokal memverifikasi chat/history/ownership, consent, NDJSON yang telah diperiksa, penolakan di percakapan existing, metadata scope dan perlindungan secret.
- Tes khusus scope memverifikasi strict/fail-closed verdict, isolasi intent dari jawaban lama, short-circuit input ditolak, penahanan draft output, bahasa respons dan konfigurasi legacy.
- Tidak ada panggilan LLM berbayar atau evaluasi semantik model aktif. Mock verdict menguji wiring/enforcement, bukan kualitas classifier live. Pemeriksaan UI/browser dijadwalkan pada Task 2.

## Batasan dan biaya

Pertanyaan yang diizinkan biasanya menambah dua panggilan classifier kecil. Input yang ditolak melewati retrieval dan generasi jawaban, tetapi summarization percakapan panjang yang existing masih dapat berjalan sebelumnya. Pemeriksaan meningkatkan latency/biaya dan bergantung pada model; tidak menjamin semua prompt adversarial akan selalu terklasifikasi tepat. Transcript lama tidak ditulis ulang. CMS belum menjadi sumber RAG; retrieval tetap menggunakan corpus website statis.

Guardrail berlapis dengan scope sempit, evidence dan pemeriksaan input/output mengikuti [OpenAI safety best practices](https://developers.openai.com/api/docs/guides/safety-best-practices), menggunakan skill OpenAI Docs. Task 2 belum dimulai dan tidak ada perluasan fitur PRD lainnya.
