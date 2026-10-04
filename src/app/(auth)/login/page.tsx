import { AuthForm } from "@/components/auth-form";
import Link from "next/link";
export default function LoginPage() { return <main className="auth-page"><section className="auth-card"><h1 className="text-2xl font-semibold">Masuk</h1><p className="mb-6 mt-2 text-sm text-slate-600">Gunakan akun yang telah terdaftar.</p><AuthForm mode="login" /><p className="mt-5 text-sm text-slate-600">Belum punya akun? <Link className="font-medium underline" href="/register">Daftar</Link></p></section></main>; }
