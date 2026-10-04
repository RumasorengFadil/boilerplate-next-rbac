# Database

## Portfolio foundation

Migration `20261004010000_portfolio_foundation` bersifat additive dan dibungkus transaction PostgreSQL; tidak mengganti UUID ContentEntry atau menghapus konten existing.

- `ContentEntry.deletedAt`: nullable TIMESTAMP(3), default null. Index baru `(kind,deletedAt,status,publishedAt)`; existing unique `(kind,slug)` dan publication index dipertahankan.
- `PortfolioRoute`: UUID PK (Prisma default uuid; insert dari SQL reservation memakai gen_random_uuid), value TEXT unique, contentId UUID NOT NULL FK ContentEntry.id ON DELETE RESTRICT/ON UPDATE CASCADE, createdAt TIMESTAMP(3) default current timestamp. Index contentId. CHECK value 1–120 karakter lowercase alphanumeric/hyphen; nomor lama hanya alias.
- `PortfolioRoute_validate` memastikan pemilik CASE_STUDY dan menolak reassignment value/contentId. `ContentEntry_reserve_portfolio_routes` AFTER INSERT/UPDATE slug/kind memanggil `reserve_portfolio_route` untuk slug dan UUID. Slug lama tetap disimpan ketika slug berubah; perubahan kind dari CASE_STUDY ditolak. Conflict ownership menghasilkan SQLSTATE 23505 dan rollback write, termasuk concurrent generic CMS writes.
- Backfill mencadangkan slug/UUID semua CASE_STUDY existing. Konflik alias atau invalid existing slug menghentikan migration secara atomik; perbaiki data secara terarah, jangan reset.
- Canonical dan alias ada dalam tabel yang sama: tidak ada race cross-table slug-vs-alias. Foreign key mencegah physical delete ketika route masih tercatat. Tidak ada aplikasi yang menghapus reservation saat archive/restore; slug tidak dapat direbut record lain.
- `deletedAt` terpisah dari ARCHIVED workflow. Service archive/restore memeriksa content:publish dan version; restore selalu DRAFT dengan publishedAt null. Shared public query mewajibkan deletedAt null dan status/tanggal layak terbit.
- JSON translations kini mendukung richBody opsional per locale untuk CASE_STUDY; plain body diturunkan dari rich JSON, bukan field SQL baru. Existing JSON plain content tetap valid. Seed tidak overwrite row existing.
- PRD 004: CASE_STUDY save/seed menyimpan richBody dan derived body tanpa key JSON details industry/challenge/approach/solution/impact/before/after/architecture/capabilities/technology. Read adapter mengonversi legacy tanpa writes. Metadata non-narasi dan details ARTICLE/PRODUCT tetap didukung kontrak shared; defaults kosong di parsed objects bukan key database yang diciptakan ulang. Tidak ada migration SQL/tabel/kolom/index/constraint baru. Task 3 data migration CLI telah mengonversi tiga local CASE_STUDY dalam transaksi Serializable dengan private backup: translations/details diperbarui, version +1 dan updatedAt berubah; UUID/slug/status/publishedAt/deletedAt/author/route reservations tetap. Tiga AuditEvent action portfolio.content.migrate (module cms, actorId null, recordId UUID, before/after version/batchId tanpa body) dicatat. Restore memakai portfolio.content.restore, hanya JSON dan version +1, menolak stale/changed rows. Backup berada di ignored .local-backups; apply idempotent dengan structural JSONB comparison. Deployment lain menjalankan langkah upgrade [installation](../deployment/installation.md).

Prisma schema tidak mengekspresikan trigger/CHECK; migration SQL merupakan sumber constraint tersebut. Implementasi service/seed: [Portfolio](../features/portfolio.md).

Migration `20261003060000_phase2_analytics` adds UUID AnalyticsEvent with pseudonymous visitor/session UUID, kind enum, public path/target/language/createdAt; indexes `(createdAt,kind)`, `(visitorId,createdAt)`, `(path,kind,createdAt)`. Lead gains optional visitorId UUID attribution field without FK; existing rows stay null. No raw IP or form/chat payload in event storage.

Migration `20261003050000_phase2_leads` extends Lead with budget/timeline/sourcePage, optional ownerId FK User (SET NULL), optimistic version and `(ownerId,status)` index. `LeadNote`: UUID PK, leadId FK cascade, optional authorId User FK SET NULL, body/createdAt; `LeadActivity`: UUID PK, leadId cascade, optional actorId SET NULL, action/details JSONB/createdAt. Both index `(leadId,createdAt)`. Existing leads remain without fabricated activities. AiRateBucket is reused by shared infrastructure with hashed per-scope/session/IP/minute keys; no duplicate limiter table.

Migration `20261003040000_phase2_cms` adds ContentKind (ARTICLE/CASE_STUDY/PRODUCT), ContentStatus (DRAFT/REVIEW/SCHEDULED/PUBLISHED/ARCHIVED) and `ContentEntry`: UUID PK, kind/slug unique pair, status, translations/details JSONB, optional authorId FK User SET NULL, optional publishedAt, optimistic version, createdAt/updatedAt. Index `(kind, status, publishedAt)` supports public reads. All payloads validate through CMS Zod contracts. Publication requires complete ID/EN, review transition and content:publish permission; due schedules are public by query-time evaluation, not a cron status mutation.

Migration `20261003030000_phase2_roles_audit` adds SUPER_ADMIN, CONTENT_EDITOR, MARKETING and SALES to Role without changing existing rows. `AuditEvent`: UUID PK; nullable actorId FK to User (SET NULL on deletion); action/module/recordId; optional before/after JSONB and ip; createdAt. Indexes `(module, recordId, createdAt)` and `(actorId, createdAt)`. No reset; user IDs remain compatible. Audit excludes credential fields.

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
## Lead scoring

Migration `20261003070000_phase2_scoring` adds nullable Lead.scoreDetails JSONB (reason/observed/config snapshot), companySize TEXT and targetDate timestamp. Existing score values are preserved. UUID LeadScoreConfig contains unique global key, JSON rules, optimistic version and updatedAt; CHECK key=global/version>0, PK UUID, unique key index. No new foreign keys. Config changes do not mass-update leads; explicit recalculation increments Lead.version transactionally with activity/audit. Applied locally without reset.

## Scheduling

Migration `20261003080000_phase2_scheduling` adds BookingStatus CONFIRMED/CANCELLED. ConsultationSlot: UUID PK, unique startsAt UTC timestamp, endsAt, service, enabled, createdAt; index enabled/startsAt, positive duration CHECK and GiST range exclusion for overlapping enabled intervals `[startsAt,endsAt)` (no extension dependency). ConsultationBooking: UUID PK, slotId/leadId UUID FKs RESTRICT, timezone/topic, status, unique tokenHash, optimistic version and createdAt. Partial unique index slotId WHERE status=CONFIRMED permits rebooking after cancellation. Lookup indexes status/createdAt and leadId. Prisma model does not express partial/exclusion constraints; migrations are authoritative. Booking locks slot and creates lead/activity within one transaction; no orphan lead on booking race. Applied to local DB without reset or sample availability.
