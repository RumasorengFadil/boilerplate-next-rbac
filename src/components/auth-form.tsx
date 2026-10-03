"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Mode = "login" | "register";
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter(); const [error, setError] = useState<string>(); const [busy, setBusy] = useState(false);
  async function submit(formData: FormData) {
    setBusy(true); setError(undefined);
    const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(formData)) });
    const body = await response.json(); setBusy(false);
    if (!response.ok) return setError(body.error ?? "Permintaan tidak dapat diproses.");
    router.replace("/dashboard"); router.refresh();
  }
  return <form action={submit} className="grid gap-4"><label className="grid gap-1 text-sm font-medium">{mode === "register" && <>Nama<input name="name" required minLength={2} className="input" autoComplete="name" /></>}</label><label className="grid gap-1 text-sm font-medium">Email<input name="email" type="email" required className="input" autoComplete="email" /></label><label className="grid gap-1 text-sm font-medium">Kata sandi<input name="password" type="password" required minLength={8} className="input" autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<Button disabled={busy}>{busy ? "Memproses…" : mode === "login" ? "Masuk" : "Buat akun"}</Button></form>;
}
