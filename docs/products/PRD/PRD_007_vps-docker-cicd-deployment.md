# PRD 007 — VPS Docker CI/CD deployment

Tanggal: 2026-10-06
Status: IN PROGRESS

## Tujuan

Men-deploy LunaBiner Next.js ke VPS Hostinger Ubuntu 24.04 secara aman dan dapat diulang, dengan lingkungan staging dan production yang terisolasi.

## Requirement yang dikonfirmasi

- Runtime menggunakan Docker Compose pada VPS Hostinger Ubuntu 24.04.
- `lunabiner.com` adalah origin production utama.
- `lunabiner.tech` mengalihkan permanen ke `lunabiner.com`.
- `staging.lunabiner.com` adalah origin staging.
- PostgreSQL dipindahkan dari lokal ke instance terpisah untuk setiap environment.
- Media cover portfolio dan product memakai volume persisten terpisah dari image aplikasi dan dibackup bersama database.
- Hermes sudah berjalan dengan Docker pada VPS dan tidak boleh terganggu.
- Source berasal dari GitHub repository; GitHub Actions membangun, memvalidasi, dan men-deploy image Docker.
- Push ke `develop` men-deploy staging. Perubahan yang telah ditinjau masuk `main` untuk production, dengan GitHub Environment dan approval production.
- Secret environment dan akses deploy staging/production dipisahkan; tidak ada credential di repository atau image Docker.

## Keputusan desain

- Satu Docker image yang immutable diberi tag commit SHA dan dipromosikan ke environment terkait; rollback memakai tag image sebelumnya.
- Setiap environment memiliki project Compose, network internal, PostgreSQL, upload volume, file environment, dan service aplikasi sendiri.
- Nginx pada VPS menjadi satu reverse proxy untuk Hermes dan LunaBiner. Hanya Nginx yang mengekspos port 80/443; container aplikasi/database tidak membuka port publik.
- Aplikasi dijalankan sebagai Next.js standalone dengan health check. Migration Prisma hanya diterapkan sebagai tahap deploy yang eksplisit, bukan saat build atau request.
- Staging dan production dimulai pada satu VPS, dengan batas sumber daya dan isolasi yang memungkinkan staging dipindahkan ke host terpisah nanti.

## Di luar scope

- Memasang Codex pada VPS production.
- Mengubah perilaku fitur aplikasi di luar kebutuhan deployment.
- Membeli domain atau VPS baru.
- Mengganti, menghentikan, atau memodifikasi Hermes selain integrasi reverse-proxy yang diperlukan dan telah ditinjau.

## Acceptance criteria

- Build Docker berhasil dan tidak menyertakan `.env`, source development, atau credential dalam runtime image.
- Staging dan production memiliki database, upload storage, secrets, dan nama project Compose terpisah.
- `https://staging.lunabiner.com` dan `https://lunabiner.com` melayani environment yang tepat dengan TLS valid.
- `https://lunabiner.tech` melakukan redirect HTTPS permanen ke canonical URL pada `.com`.
- Deploy `develop` dan `main` berjalan melalui GitHub Actions dengan approval production dan dapat di-rollback ke image SHA sebelumnya.
- Hermes tetap tersedia setelah konfigurasi reverse proxy diterapkan.
- Backup dan prosedur restore PostgreSQL + volume upload terdokumentasi dan diverifikasi secara terukur.

## Tracking

- Task 1 — Container runtime dan Compose: COMPLETED.
- Task 2 — GitHub Actions CI/CD: COMPLETED.
- Task 3a — Audit Traefik, Hermes, dan port publik: COMPLETED.
- Task 3b — Integrasi Traefik dan persiapan host: COMPLETED (repository contract only).
- Task 3c.1 — Firewall edge VPS: COMPLETED.
- Task 3c.2 — Akses deploy, direktori host, dan GHCR: PENDING.
- Task 3c.3 — Rotasi credential Hermes: PENDING CONFIRMATION.
