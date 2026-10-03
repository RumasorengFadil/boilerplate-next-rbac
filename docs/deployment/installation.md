# Instalasi dan clone

1. Buat repository baru dari folder boilerplate ini, lalu ganti `name` pada `package.json` dan identitas di `.env.local`.
2. Salin `.env.example` ke `.env.local`. Jangan commit `.env.local`.
3. Jalankan `npm install` dan siapkan PostgreSQL yang sesuai `DATABASE_URL`.
4. Terapkan migration dengan perintah berikut, lalu `npm run dev`. Prisma CLI tidak otomatis membaca `.env.local`; wrapper ini menggunakan urutan konfigurasi Next.js agar database yang dipilih sama dengan aplikasi.
5. Sebelum deploy jalankan `npm run typecheck` dan `npm run build`.

Production memerlukan `DATABASE_URL` yang dapat dijangkau server aplikasi. `npm run build` menjalankan `prisma generate` sebelum `next build`; output Next.js dibuat standalone. Gunakan secret manager platform untuk semua variabel non-publik.

```sh
node -e 'require("@next/env").loadEnvConfig(process.cwd());require("child_process").execFileSync("npx",["prisma","migrate","deploy"],{stdio:"inherit",env:process.env})'
```

Untuk membuat migration baru saat development, gunakan loader environment yang sama dengan argumen `migrate dev`. Jangan menjalankan reset pada database berisi data yang ingin dipertahankan.

## LunaBiner AI

Apply reviewed migrations with `npx prisma migrate deploy` before enabling the assistant. Configure the six infrastructure variables in `.env.example` through the secret manager; runtime tuning belongs to the database. Follow [AI activation and troubleshooting](../ai-assistant.md). Reverse proxies must overwrite forwarded IP headers for rate limiting. Reindex knowledge after changing published content.

OpenAI chat and embedding URLs are separate endpoints. Use plain URLs, not Markdown links: `https://api.openai.com/v1/chat/completions` and `https://api.openai.com/v1/embeddings`, respectively ([official embedding API reference](https://developers.openai.com/api/reference/resources/embeddings/methods/create)). Restart the app after infrastructure environment changes. Keys remain in ignored environment files; models and streaming settings remain in database runtime configuration.
