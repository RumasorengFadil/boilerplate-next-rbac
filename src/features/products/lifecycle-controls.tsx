"use client";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { productLifecycleAction, type ProductState } from "./actions";

export function ProductLifecycleControls({ id, version, deleted }: { id: string; version: number; deleted: boolean }) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [state, action, pending] = useActionState(async (previous: ProductState, form: FormData) => {
    const result = await productLifecycleAction(previous, form);
    // RSC revalidation can remount these controls. Navigate from the original
    // operation's continuation, not an effect on a replaced component.
    if (result.success) { router.replace(deleted ? `/dashboard/products/${id}` : "/dashboard/products?view=archived"); router.refresh(); }
    return result;
  }, { message: "" } as ProductState);
  return <form action={action} className="space-y-3">
    <input type="hidden" name="id" value={id} /><input type="hidden" name="version" value={version} /><input type="hidden" name="operation" value={deleted ? "restore" : "archive"} />
    {!confirmed ? <button type="button" className="min-h-11 rounded-md border px-4 py-2 text-sm" onClick={() => setConfirmed(true)}>{deleted ? "Pulihkan" : "Arsipkan"}</button>
      : <div className="space-y-3 rounded-md border bg-slate-50 p-4"><p className="text-sm">{deleted ? "Pulihkan sebagai DRAFT? Produk tidak otomatis terbit kembali." : "Arsipkan produk ini? Produk ditarik dari publikasi dan dapat dipulihkan."}</p><div className="flex flex-wrap gap-2">
        <button disabled={pending || state.success} className="min-h-11 rounded-md bg-[#08747A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Memproses…" : deleted ? "Ya, pulihkan" : "Ya, arsipkan"}</button>
        <button type="button" disabled={pending} className="min-h-11 rounded-md border px-4 py-2 text-sm" onClick={() => setConfirmed(false)}>Batal</button>
      </div></div>}
    {state.message && <p role="status" className={`text-sm ${state.success ? "text-teal-700" : "text-red-700"}`}>{state.message}</p>}
  </form>;
}
