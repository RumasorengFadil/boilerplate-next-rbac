"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { contentKinds, contentStatuses, detailsSchema, type ContentInput } from "./schema";
import { saveContentAction } from "./actions";

export function ContentEditor({ initial, canPublish }: { initial?: ContentInput; canPublish: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveContentAction, { message: "" });
  const [kind, setKind] = useState(initial?.kind ?? "ARTICLE");
  const details = initial?.details ?? detailsSchema.parse({});
  useEffect(() => { if (state.success && state.id) { router.replace(`/dashboard/content/${state.id}`); router.refresh(); } }, [state, router]);
  const field = (name: string, label: string, value = "", multiline = false, required = false) => <label className="grid gap-2 text-sm" key={name}>{label}{multiline ? <textarea className="input min-h-24" name={name} defaultValue={value} required={required} maxLength={30000} /> : <input className="input" name={name} defaultValue={value} required={required} maxLength={500} />}</label>;
  return <form action={action} className="mt-6 space-y-6">
    {initial?.id && <input type="hidden" name="id" value={initial.id} />}<input type="hidden" name="version" value={initial?.version ?? 1} />
    <section className="card grid gap-4 sm:grid-cols-2">
      <label className="grid gap-2 text-sm">Jenis konten<select name="kind" className="input" value={kind} onChange={event => setKind(event.target.value as typeof kind)} disabled={Boolean(initial?.id)}>{contentKinds.map(value => <option key={value}>{value}</option>)}</select></label>
      {initial?.id && <input type="hidden" name="kind" value={kind} />}
      {field("slug", "Slug (huruf kecil dan tanda hubung)", initial?.slug, false, true)}
      <label className="grid gap-2 text-sm">Workflow<select name="status" className="input" defaultValue={initial?.status ?? "DRAFT"}>{contentStatuses.filter(value => canPublish || ["DRAFT", "REVIEW"].includes(value)).map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="grid gap-2 text-sm">Jadwal publikasi (UTC)<input className="input" type="datetime-local" name="publishedAt" defaultValue={initial?.publishedAt?.slice(0,16) ?? ""} /></label>
      {field("category", "Kategori", details.category)}{field("tags", "Tags, pisahkan koma", details.tags.join(", "))}
      {field("authorName", "Nama penulis / kredit publik", details.authorName)}{field("image", "Cover: path asset /images/", details.image)}
    </section>
    <section className="grid gap-5 lg:grid-cols-2">{(["id", "en"] as const).map(locale => <fieldset key={locale} className="card space-y-4"><legend className="font-semibold">{locale === "id" ? "Bahasa Indonesia" : "English"}</legend>
      {field(`${locale}.title`, "Judul / Title", initial?.translations[locale].title, false, true)}
      {field(`${locale}.excerpt`, "Ringkasan / Excerpt", initial?.translations[locale].excerpt, true)}
      {field(`${locale}.body`, "Konten (teks biasa; paragraf dipisahkan baris kosong)", initial?.translations[locale].body, true)}
      {field(`${locale}.seoTitle`, "SEO title", initial?.translations[locale].seoTitle)}{field(`${locale}.seoDescription`, "SEO description", initial?.translations[locale].seoDescription)}
    </fieldset>)}</section>
    <details className="card" open={kind !== "ARTICLE"}><summary className="min-h-11 cursor-pointer font-semibold">Detail {kind === "CASE_STUDY" ? "studi kasus" : "produk dan relasi"}</summary><div className="mt-4 grid gap-4 sm:grid-cols-2">
      {field("client", "Klien (hanya jika izin publikasi tersedia)", details.client)}
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="verifiedProject" defaultChecked={details.verifiedProject} />Proyek nyata terverifikasi, bukan ilustrasi</label>
      {(["industry", "challenge", "approach", "solution", "impact", "before", "after", "architecture", "ctaLabel"] as const).flatMap(name => (["id", "en"] as const).map(locale => field(`${name}.${locale}`, `${name} (${locale.toUpperCase()})`, details[name][locale], name !== "industry" && name !== "ctaLabel")))}
      {(["features", "capabilities", "technology", "gallery", "relatedServices", "relatedCaseStudies"] as const).map(name => field(name, `${name} — satu item per baris${name === "relatedServices" ? " (software, automation, ai, data)" : ""}`, details[name].join("\n"), true))}
      <label className="grid gap-2 text-sm">Status produk<select className="input" name="productStatus" defaultValue={details.productStatus}>{["COMING_SOON", "BETA", "LIVE"].map(value => <option key={value}>{value}</option>)}</select></label>
      {field("ctaPath", "CTA path internal /id/… atau /en/…", details.ctaPath)}
    </div></details>
    <p className="text-sm text-slate-600">Simpan DRAFT → kirim REVIEW → publisher memilih PUBLISHED atau SCHEDULED. Publikasi memerlukan konten lengkap ID/EN. Gambar memakai asset yang sudah tersedia; upload media belum tersedia.</p>
    {state.message && <p role="status" className={state.success ? "text-teal-700" : "text-red-700"}>{state.message}</p>}
    <button disabled={pending} className="min-h-11 rounded-lg bg-[#08747A] px-5 py-3 font-semibold text-white disabled:opacity-50">{pending ? "Menyimpan…" : "Simpan konten"}</button>
  </form>;
}
