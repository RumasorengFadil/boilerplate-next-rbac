# Implementation Report

**Tanggal:** 2026-10-06
**Classification:** LARGE
**Status:** PARTIALLY COMPLETED

## Rencana dan Tracking

- Current Task: Task 3c.1 — Firewall edge VPS.
- Progress: Selesai dan diverifikasi.
- Next Task: Task 3c.2 — Persiapan akses deploy, direktori host, dan GHCR pada VPS.

## Penyebab dan Perubahan

- Penyebab: Audit menemukan tidak ada firewall Hostinger, sementara Hermes memiliki port container yang dipublikasikan langsung ke internet.
- Perubahan: Membuat dan mengaktifkan firewall `lunabiner-edge` pada VPS. Firewall hanya menerima SSH 22, HTTP 80, dan HTTPS 443 dari internet.

## File Change

- Created: `docs/reports/2026/10/06/vps_deployment_task3c1_firewall.md`.
- Modified: `docs/products/PRD/PRD_007_vps-docker-cicd-deployment.md`, `docs/deployment/installation.md`, `docs/README.md`.
- Deleted: None.

## Database Change

- None.

## Architecture Change

- Network edge: Traefik remains the web entry point on HTTP/HTTPS. Direct inbound access to unpublished container ports, including the Hermes ephemeral port, is blocked by the VPS firewall.
- SSH: port 22 remains reachable globally because a stable operator CIDR has not yet been configured; key-only authentication remains required and IP restriction can be added later.

## Verifikasi

- Firewall action `ct_firewall` completed with state `success`.
- VPS firewall attachment matches `lunabiner-edge`.
- Rules verified: SSH 22, HTTP 80, HTTPS 443, each from `any`.
- Traefik and Hermes Docker projects remain `running` after activation.
