# Authentication dan RBAC

Register dan login memvalidasi input dengan Zod, menyimpan password dengan bcrypt, dan membuat token acak 32-byte. Database hanya menyimpan SHA-256 token tersebut. Token asli berada pada cookie `session` yang `HttpOnly`, `SameSite=Lax`, scoped ke `/`, memiliki expiry tujuh hari, dan memakai `Secure` di production. Logout menghapus session database dan cookie.

`src/proxy.ts` tidak memvalidasi token; ia hanya memperbaiki pengalaman redirect berdasarkan cookie. Akses sebenarnya divalidasi di server melalui `getSessionUser`, `requireUser`, dan `requirePermission`. Permission didefinisikan sekali di `src/lib/permissions.ts`. Menu sidebar hanya presentasi dan bukan kontrol keamanan.

Semua route handler mutasi harus memvalidasi body dan semua server action harus memanggil guard yang relevan sebelum mengubah data. Tambahkan rate limit untuk endpoint autentikasi ketika infrastruktur deployment tersedia.
