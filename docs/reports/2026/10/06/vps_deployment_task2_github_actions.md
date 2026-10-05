# Implementation Report

**Tanggal:** 2026-10-06
**Classification:** LARGE
**Status:** PARTIALLY COMPLETED

## Rencana dan Tracking

- Current Task: Task 2 — GitHub Actions CI/CD.
- Progress: Selesai. Workflow dibuat, tetapi belum diaktifkan melalui push atau konfigurasi GitHub Environment.
- Next Task: Task 3 — Audit dan persiapan VPS/Hermes/Nginx.

## Penyebab dan Perubahan

- Penyebab: Tidak ada mekanisme CI/CD untuk memvalidasi aplikasi, membangun image, atau mempromosikan rilis ke staging dan production secara terpisah.
- Perubahan: Menambah workflow GitHub Actions dengan PR verification, build dua image target Docker ke GHCR, tag digest immutable, dan deploy SSH yang menggunakan GitHub Environment per target.

## File Change

- Created: `.github/workflows/deploy.yml`, `docs/reports/2026/10/06/vps_deployment_task2_github_actions.md`.
- Modified: `docs/deployment/installation.md`, `docs/products/PRD/PRD_007_vps-docker-cicd-deployment.md`, `docs/README.md`.
- Deleted: None.

## Database Change

- None. Workflow hanya mendefinisikan perintah `prisma migrate deploy` untuk dijalankan kelak pada host yang sudah disiapkan; tidak menjalankannya sekarang.

## Architecture Change

- CI/CD layer: pull request ke `develop`/`main` menjalankan typecheck dan build. Push ke `develop` menargetkan GitHub Environment `staging`; push ke `main` menargetkan `production`.
- Supply chain: aplikasi dan migrator dibangun sebagai image berbeda dari commit sama, dipilih berdasarkan digest dan ditarik oleh VPS melalui SSH dengan host key yang dipasangkan.
- Secrets: workflow menuntut secret per Environment (`DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_PRIVATE_KEY`, `DEPLOY_KNOWN_HOSTS`) serta variable `DEPLOY_DIRECTORY`; workflow tidak membuat atau menyimpan nilai secret tersebut.

## Verifikasi

- YAML workflow dapat diparse.
- `npm run typecheck` — berhasil.
- `npm run build` — berhasil.
- Workflow tidak dijalankan karena belum dipush dan GitHub Environment/secret belum dibuat; tidak ada akses VPS atau database.
