# Authentication dan RBAC

## Phase 2 roles

SUPER_ADMIN, ADMIN, CONTENT_EDITOR, MARKETING, SALES and MEMBER have explicit permissions. Existing ADMIN access remains compatible, including the read-only user list; only SUPER_ADMIN has `users:manage`. Public registration cannot set roles. CONTENT_EDITOR edits but cannot publish/read leads; MARKETING publishes/manages leads/reads analytics; SALES manages leads/reads analytics, not CMS. MEMBER retains project access. Server guards protect reads/writes; summaries do not query projects for specialist roles. This stage does not implement 2FA or account mutation UI.

Shared `AuditEvent` supports transactional actor/action/module/record, selected before/after JSON and optional trusted IP. Services must exclude credentials and full contact/transcript payloads. Existing AI-specific audit remains compatible.

Register dan login memvalidasi input dengan Zod, menyimpan password dengan bcrypt, dan membuat token acak 32-byte. Database hanya menyimpan SHA-256 token tersebut. Token asli berada pada cookie `session` yang `HttpOnly`, `SameSite=Lax`, scoped ke `/`, memiliki expiry tujuh hari, dan memakai `Secure` di production. Logout menghapus session database dan cookie.

`src/proxy.ts` tidak memvalidasi token; ia hanya memperbaiki pengalaman redirect berdasarkan cookie. Akses sebenarnya divalidasi di server melalui `getSessionUser`, `requireUser`, dan `requirePermission`. Permission didefinisikan sekali di `src/lib/permissions.ts`. Menu sidebar hanya presentasi dan bukan kontrol keamanan.

Untuk SEO bilingual, proxy juga menangani page requests (kecuali API/Next/assets/sitemap/robots) dan menimpa header internal x-lunabiner-locale berdasarkan pathname. Root layout memvalidasi ID/EN dengan Zod; header bukan identitas, role, sumber terjemahan atau otorisasi. Default metadata non-public adalah noindex/nofollow; robots melarang crawl dashboard/API. Ini hanya kebijakan crawler, bukan perlindungan akses. Guard server dan behavior redirect cookie tetap dipertahankan.

Semua route handler mutasi harus memvalidasi body dan semua server action harus memanggil guard yang relevan sebelum mengubah data. Tambahkan rate limit untuk endpoint autentikasi ketika infrastruktur deployment tersedia.
