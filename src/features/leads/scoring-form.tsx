"use client";
import { useActionState } from "react";
import { scoreSignals, type scoringRulesSchema } from "./scoring-schema";
import type { z } from "zod";
import { saveScoringAction, recalculateScoringAction } from "./scoring-actions";
const labels = {enterprise:"Ukuran enterprise (dinyatakan visitor)",clearProblem:"Deskripsi masalah cukup lengkap",budgetProvided:"Anggaran diisi (bukan verifikasi nilai)",nearTimeline:"Target tanggal dalam rentang",serviceSelected:"Layanan dipilih (bukan unsure)",consultation:"Konsultasi dibuat",caseViewed:"Case study dilihat dengan consent",aiEngaged:"Ada pesan AI terkait"};
export function ScoringForm({version,rules}:{version:number;rules:z.infer<typeof scoringRulesSchema>}) {
  const [state,action,pending]=useActionState(saveScoringAction,{message:""});
  return <form action={action} className="card mt-6 space-y-5"><input type="hidden" name="version" value={version}/><label className="flex min-h-11 items-center gap-3"><input type="checkbox" name="enabled" defaultChecked={rules.enabled}/>Aktifkan scoring</label>
    <div className="grid gap-4 sm:grid-cols-2">{scoreSignals.map(signal=><label key={signal} className="grid gap-2 text-sm">{labels[signal]}<input type="number" required name={signal} defaultValue={rules.weights[signal]} min={0} max={100} className="input"/></label>)}</div>
    <div className="grid gap-4 sm:grid-cols-3">{[["problemMinChars","Minimum karakter masalah",20,2000],["timelineDays","Rentang target (hari)",1,365],["behaviorDays","Riwayat perilaku (hari)",1,90]].map(([name,label,min,max])=><label key={name} className="grid gap-2 text-sm">{label}<input type="number" required name={String(name)} min={Number(min)} max={Number(max)} defaultValue={rules[name as "problemMinChars"|"timelineDays"|"behaviorDays"]} className="input"/></label>)}</div>
    <p className="text-sm text-slate-600">Score dibatasi 100. Tidak ada inferensi ukuran perusahaan dari nama atau tanggal dari teks bebas. Aturan baru berlaku pada lead baru dan perhitungan ulang yang dipilih operator.</p><p role="status" className="text-sm">{state.message}</p><button disabled={pending} className="min-h-11 rounded-lg bg-[#08747A] px-5 py-3 font-semibold text-white disabled:opacity-50">Simpan aturan</button>
  </form>;
}
export function RecalculateScore({id,version}:{id:string;version:number}) {
  const [state,action,pending]=useActionState(recalculateScoringAction,{message:""});
  return <form action={action} className="mt-4"><input type="hidden" name="id" value={id}/><input type="hidden" name="version" value={version}/><button disabled={pending} className="min-h-11 rounded-lg border px-4 py-3">Hitung ulang score</button><p role="status" className="mt-2 text-sm">{state.message}</p></form>;
}
