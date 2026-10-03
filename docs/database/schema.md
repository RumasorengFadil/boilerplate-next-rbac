# Database

Prisma menggunakan PostgreSQL dan schema berada di `prisma/schema.prisma`.

| Tabel | Kolom/constraint utama | Index |
|---|---|---|
| `User` | `id` PK, `email` unique, `passwordHash`, `role` | unique `email` |
| `Session` | `id` PK, `tokenHash` unique, FK `userId` cascade, `expiresAt` | `userId`, `expiresAt` |
| `Project` | `id` PK, FK `ownerId` cascade, `name`, `description` | `ownerId` |
| `AiConfiguration` | UUID PK, settings JSON tervalidasi tanpa secret, core runtime fields, updatedBy | PK |
| `AiConversation` | UUID PK/sessionId, language, summary, summaryMessageCount, busyUntil, status, optional userId | sessionId + updatedAt |
| `AiMessage` | UUID PK, conversation UUID FK cascade, role/content/metadata | conversationId + createdAt |
| `Lead` | UUID PK, contact/challenge/source/score/status, consentAt, optional conversation UUID | status + createdAt |
| `AiKnowledgeChunk` | UUID PK, sourceKey unique, content/hash/model/embedding JSON | sourceKey unique |
| `AiRateBucket` | hashed bucket PK, count, expiry | expiresAt |
| `AiAuditEvent` | UUID PK, actorId/action/timestamp | PK |

Migration `20261003010000_ai_conversations` adds configuration, conversation/message and lead tables. Migration `20261003020000_ai_runtime` adds settings, summary tracking, request leases, consent timestamp, vectors, rate limits and audit events. Only anonymous/new AI-domain identifiers use UUID; existing User/Session/Project CUIDs stay compatible. Lead conversationId/userId/updatedBy are context references, not FK constraints.

Migrasi awal ada di `prisma/migrations/20261003000000_init/migration.sql`. Gunakan `npm run db:migrate` di development. Untuk perubahan schema baru, buat migrasi Prisma, review SQL-nya, lalu perbarui tabel ini dan laporan implementasi.
