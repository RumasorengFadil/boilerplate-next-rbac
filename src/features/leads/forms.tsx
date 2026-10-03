"use client";
import { useActionState } from "react";
import { leadStatuses } from "./schema";
import { updateLeadAction, addNoteAction } from "./actions";
export function LeadControls({ id, version, status, ownerId, owners }: { id: string; version: number; status: typeof leadStatuses[number]; ownerId: string | null; owners: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(updateLeadAction, { message: "" });
  return <form action={action} className="card space-y-4"><h2 className="font-semibold">Tindak lanjut</h2><input name="id" type="hidden" value={id} /><input name="version" type="hidden" value={version} />
    <label className="grid gap-2 text-sm">Status<select name="status" className="input" defaultValue={status}>{leadStatuses.map(value => <option key={value}>{value}</option>)}</select></label>
    <label className="grid gap-2 text-sm">Owner<select name="ownerId" className="input" defaultValue={ownerId ?? ""}><option value="">Belum ditugaskan</option>{owners.map(owner => <option value={owner.id} key={owner.id}>{owner.name}</option>)}</select></label>
    <p role="status" className="text-sm">{state.message}</p><button disabled={pending} className="min-h-11 rounded-lg bg-[#08747A] px-4 py-3 font-semibold text-white disabled:opacity-50">{pending ? "Menyimpan…" : "Simpan tindak lanjut"}</button></form>;
}
export function LeadNoteForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(addNoteAction, { message: "" });
  return <form action={action} className="card space-y-4"><input name="id" type="hidden" value={id} /><label className="grid gap-2 text-sm">Catatan internal<textarea name="body" required minLength={2} maxLength={4000} className="input min-h-24" /></label><p role="status" className="text-sm">{state.message}</p><button disabled={pending} className="min-h-11 rounded-lg border px-4 py-3">Tambah catatan</button></form>;
}
