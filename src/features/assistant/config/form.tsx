"use client";
import { useActionState } from "react";
import { saveAiSettings, indexKnowledge, purgeExpired } from "./actions";
import type { AssistantRuntimeConfig } from "./schema";
export function AiSettingsForm({ config }: { config: AssistantRuntimeConfig }) {
  const [state, action, pending] = useActionState(saveAiSettings, { message: "" });
  const [indexState, indexAction, indexing] = useActionState(indexKnowledge, { message: "" });
  const [cleanupState, cleanupAction, cleaning] = useActionState(purgeExpired, { message: "" });
  return <div className="space-y-6">
    <form action={action} className="card"><label className="block font-medium">Pengaturan runtime AI (JSON)<textarea name="settings" className="input mt-3 min-h-[560px] font-mono" defaultValue={JSON.stringify(config,null,2)} /></label><p className="mt-2 text-sm text-slate-600">API key dan base URL diatur melalui environment server. Pengaturan tak dikenal atau di luar rentang akan ditolak.</p><button disabled={pending} className="mt-4 min-h-11 rounded-md bg-[#08747A] px-5 text-white">Simpan konfigurasi</button><p role="status" className="mt-3">{state.message}</p></form>
    <form action={indexAction} className="card"><p className="text-sm">Bangun ulang index dari konten website yang dipublikasikan setelah konten berubah. Embedding API harus sudah dikonfigurasi.</p><button disabled={indexing} className="mt-4 min-h-11 rounded-md border px-5">Reindex knowledge</button><p role="status">{indexState.message}</p></form>
    <form action={cleanupAction} className="card"><p className="text-sm">Hapus percakapan yang telah melewati masa retensi sesuai konfigurasi.</p><button disabled={cleaning} className="mt-4 min-h-11 rounded-md border px-5">Jalankan retention cleanup</button><p role="status">{cleanupState.message}</p></form>
  </div>;
}
