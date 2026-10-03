import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
export default function RegisterPage() { return <main className="auth-page"><section className="auth-card"><h1 className="text-2xl font-semibold">Buat akun</h1><p className="mb-6 mt-2 text-sm text-slate-600">Akun pertama dibuat sebagai member. Ubah peran melalui database atau modul administrasi Anda.</p><AuthForm mode="register" /><p className="mt-5 text-sm text-slate-600">Sudah punya akun? <Link className="font-medium underline" href="/login">Masuk</Link></p></section></main>; }
