"use client";
import { useActionState, useState } from "react";
import { portfolioLifecycleAction } from "./actions";

export function PortfolioLifecycleControls({ id, version, deleted }: { id: string; version: number; deleted: boolean }) {
  const [confirmed, setConfirmed] = useState(false);
  const [state, action, pending] = useActionState(portfolioLifecycleAction, { message: "" });
  if (state.success) return <p role="status" className="text-sm text-teal-700">{state.message}</p>;
  return <form action={action} className="space-y-3">
    <input type="hidden" name="id" value={id} /><input type="hidden" name="version" value={version} />
    <input type="hidden" name="operation" value={deleted ? "restore" : "archive"} />
    {!confirmed ? <button type="button" className="min-h-11 rounded-md border px-4 py-2 text-sm" onClick={() => setConfirmed(true)}>{deleted ? "Pulihkan" : "Arsipkan"}</button>
      : <div className="space-y-3 rounded-md border bg-slate-50 p-4"><p className="text-sm">{deleted ? "Pulihkan sebagai DRAFT? Konten tidak otomatis terbit kembali." : "Arsipkan portfolio ini? Konten akan ditarik dari publikasi dan dapat dipulihkan."}</p><div className="flex flex-wrap gap-2">
        <button disabled={pending} className="min-h-11 rounded-md bg-[#08747A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Memproses…" : deleted ? "Ya, pulihkan" : "Ya, arsipkan"}</button>
        <button type="button" disabled={pending} className="min-h-11 rounded-md border px-4 py-2 text-sm" onClick={() => setConfirmed(false)}>Batal</button>
      </div></div>}
    {state.message && <p role="status" className="text-sm text-red-700">{state.message}</p>}
  </form>;
}
