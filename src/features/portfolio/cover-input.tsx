"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { coverMimeTypes, MAX_COVER_BYTES } from "./cover-schema";

export function CoverInput({ initial = "", onFileChange }: { initial?: string; onFileChange: (file: File | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [operation, setOperation] = useState<"keep" | "replace" | "remove">("keep");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const clear = (next: "keep" | "remove") => {
    if (input.current) input.current.value = "";
    setFile(null); setPreview(""); onFileChange(null); setOperation(next); setError("");
  };
  const image = operation === "keep" ? initial : operation === "replace" ? preview : "";
  return <div className="min-w-0 space-y-3 sm:col-span-2">
    <input type="hidden" name="coverOperation" value={operation} />
    <label className="grid gap-2 text-sm" htmlFor="portfolio-cover">Cover / thumbnail<input ref={input} id="portfolio-cover" name="coverFile" type="file" accept="image/jpeg,image/png,image/webp" className="input min-w-0 max-w-full file:mr-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-teal-800" aria-describedby="cover-help" onChange={event => {
      const selected = event.target.files?.[0];
      if (!selected) return;
      if (selected.size === 0 || selected.size > MAX_COVER_BYTES || !coverMimeTypes.some(type => type === selected.type)) {
        event.target.value = ""; setError("Gunakan JPG, PNG atau WebP dengan ukuran maksimal 5 MB."); return;
      }
      setFile(selected); setPreview(URL.createObjectURL(selected)); onFileChange(selected); setOperation("replace"); setError("");
    }} /></label>
    <p id="cover-help" className="text-xs leading-5 text-slate-600">Pilih gambar dari perangkat. JPG, PNG atau WebP · maksimal 5 MB / 16 megapiksel. Gambar diunggah saat portfolio disimpan.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {image && <div className="max-w-lg overflow-hidden rounded-xl border bg-slate-50"><Image unoptimized src={image} alt="Preview cover portfolio" width={1200} height={675} className="aspect-video w-full object-contain" /></div>}
    {file && operation === "replace" && <p className="break-words text-xs text-slate-600">Dipilih: {file.name}</p>}
    {operation === "remove" && <p role="status" className="text-sm text-slate-600">Cover akan dilepas saat simpan. File lama tetap disimpan.</p>}
    <div className="flex flex-wrap gap-3">
      {(image || file) && <button type="button" className="min-h-11 rounded-lg border px-4 py-2 text-sm text-red-700" onClick={() => clear("remove")}>Hapus cover</button>}
      {operation !== "keep" && <button type="button" className="min-h-11 rounded-lg border px-4 py-2 text-sm" onClick={() => clear("keep")}>Batal ganti/hapus</button>}
    </div>
  </div>;
}
