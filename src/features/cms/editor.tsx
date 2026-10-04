"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { contentKinds, contentStatuses, detailsSchema, type ContentInput } from "./schema";
import { saveContentAction, type ContentState } from "./actions";
import { savePortfolioAction } from "@/features/portfolio/actions";
import { RichTextEditor } from "./rich-text-editor";
import Link from "next/link";
import { CoverInput } from "@/features/portfolio/cover-input";

export function ContentEditor({ initial, canPublish, portfolio = false, readOnly = false }: { initial?: ContentInput; canPublish: boolean; portfolio?: boolean; readOnly?: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(portfolio ? savePortfolioAction : saveContentAction, { message: "" } as ContentState);
  const [kind, setKind] = useState(initial?.kind ?? (portfolio ? "CASE_STUDY" : "ARTICLE"));
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [portfolioValues, setPortfolioValues] = useState<Record<string, string>>({});
  const details = initial?.details ?? detailsSchema.parse({});
  const initialStatus = portfolio && initial?.status === "ARCHIVED" ? "DRAFT" : initial?.status ?? "DRAFT";
  useEffect(() => { if (state.success && state.id) { router.replace(`/dashboard/${portfolio ? "portfolio" : "content"}/${state.id}`); router.refresh(); } }, [state, router, portfolio]);
  // Controlled portfolio fields survive React's form reset after a rejected upload.
  const valueProps = (name: string, initialValue: string) => portfolio
    ? { value: portfolioValues[name] ?? initialValue, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setPortfolioValues(previous => ({ ...previous, [name]: event.target.value })) }
    : { defaultValue: initialValue };
  const field = (name: string, label: string, value = "", multiline = false, required = false) => {
    const error = state.fieldErrors?.[name];
    const props = { "aria-invalid": Boolean(error), "aria-describedby": error ? `error-${name}` : undefined };
    return <label className="grid gap-2 text-sm" key={name}>{label}{multiline ? <textarea className={`input min-h-24 ${error ? "border-red-500" : ""}`} name={name} {...valueProps(name, value)} {...props} required={required} maxLength={30000} /> : <input className={`input ${error ? "border-red-500" : ""}`} name={name} {...valueProps(name, value)} {...props} required={required} maxLength={500} />}{error && <span id={`error-${name}`} className="text-xs text-red-700">{error}</span>}</label>;
  };
  return <form action={form => { if (portfolio && coverFile) form.set("coverFile", coverFile); action(form); }} className="mt-6 space-y-6">
    {readOnly && <p className="rounded-lg border bg-amber-50 p-4 text-sm">Konten sudah dipublikasikan/dijadwalkan. Hubungi publisher untuk perubahan; akun ini hanya dapat mengedit draft/review.</p>}
    {!portfolio && !initial && <p className="text-sm">Untuk studi kasus, gunakan <Link href="/dashboard/portfolio/new" className="font-semibold text-[#08747A] underline">Tambah portfolio</Link>.</p>}
    <fieldset disabled={pending || readOnly} className="min-w-0 space-y-6">
    {initial?.id && <input type="hidden" name="id" value={initial.id} />}<input type="hidden" name="version" value={state.version ?? initial?.version ?? 1} />
    <section className="card grid gap-4 sm:grid-cols-2">
      {portfolio ? <><input type="hidden" name="kind" value="CASE_STUDY" /><p className="text-sm font-semibold">Studi kasus / Portfolio</p></> : <label className="grid gap-2 text-sm">Jenis konten<select name="kind" className="input" value={kind} onChange={event => setKind(event.target.value as typeof kind)} disabled={Boolean(initial?.id)}>{contentKinds.filter(value => value !== "CASE_STUDY").map(value => <option key={value}>{value}</option>)}</select></label>}
      {!portfolio && initial?.id && <input type="hidden" name="kind" value={kind} />}
      {field("slug", "Slug (huruf kecil dan tanda hubung)", initial?.slug, false, true)}
      <label className="grid gap-2 text-sm">{portfolio ? "Status portfolio" : "Workflow"}<select name="status" className="input" {...valueProps("status", initialStatus)}>{contentStatuses.filter(value => (!portfolio || value !== "ARCHIVED") && (canPublish || ["DRAFT", "REVIEW"].includes(value) || readOnly && initial?.status === value)).map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="grid gap-2 text-sm">Jadwal publikasi (UTC)<input className="input" type="datetime-local" name="publishedAt" {...valueProps("publishedAt", initial?.publishedAt?.slice(0,16) ?? "")} /></label>
      {field("category", "Kategori", details.category)}{field("tags", "Tags, pisahkan koma", details.tags.join(", "))}
      {field("authorName", "Nama penulis / kredit publik", details.authorName)}{portfolio ? <CoverInput initial={details.image} onFileChange={setCoverFile} /> : field("image", "Cover: path asset /images/", details.image)}
    </section>
    <section className="grid gap-5 lg:grid-cols-2">{(["id", "en"] as const).map(locale => <fieldset key={locale} className="card space-y-4"><legend className="font-semibold">{locale === "id" ? "Bahasa Indonesia" : "English"}</legend>
      {field(`${locale}.title`, "Judul / Title", initial?.translations[locale].title, false, true)}
      {field(`${locale}.excerpt`, "Ringkasan / Excerpt", initial?.translations[locale].excerpt, true)}
      {portfolio && <p className="text-xs text-slate-500">Untuk publikasi: ringkasan minimal 10 karakter dan konten detail minimal 30 karakter teks pada masing-masing bahasa.</p>}
      {portfolio ? <RichTextEditor name={`${locale}.richBody`} label={`Konten detail (${locale.toUpperCase()})`} initial={initial?.translations[locale].richBody} body={initial?.translations[locale].body} disabled={pending || readOnly} error={state.fieldErrors?.[`${locale}.richBody`]} /> : field(`${locale}.body`, "Konten (teks biasa; paragraf dipisahkan baris kosong)", initial?.translations[locale].body, true)}
      {field(`${locale}.seoTitle`, "SEO title", initial?.translations[locale].seoTitle)}{field(`${locale}.seoDescription`, "SEO description", initial?.translations[locale].seoDescription)}
    </fieldset>)}</section>
    {!portfolio && <details className="card" open={kind !== "ARTICLE"}><summary className="min-h-11 cursor-pointer font-semibold">Detail {kind === "CASE_STUDY" ? "studi kasus" : "produk dan relasi"}</summary><div className="mt-4 grid gap-4 sm:grid-cols-2">
      {field("client", "Klien (hanya jika izin publikasi tersedia)", details.client)}
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="verifiedProject" defaultChecked={details.verifiedProject} />Proyek nyata terverifikasi, bukan ilustrasi</label>
      {(["industry", "challenge", "approach", "solution", "impact", "before", "after", "architecture", "ctaLabel"] as const).flatMap(name => (["id", "en"] as const).map(locale => field(`${name}.${locale}`, `${name} (${locale.toUpperCase()})`, details[name][locale], name !== "industry" && name !== "ctaLabel")))}
      {(["features", "capabilities", "technology", "gallery", "relatedServices", "relatedCaseStudies"] as const).map(name => field(name, `${name} — satu item per baris${name === "relatedServices" ? " (software, automation, ai, data)" : ""}`, details[name].join("\n"), true))}
      {!portfolio && <label className="grid gap-2 text-sm">Status produk<select className="input" name="productStatus" defaultValue={details.productStatus}>{["COMING_SOON", "BETA", "LIVE"].map(value => <option key={value}>{value}</option>)}</select></label>}
      {field("ctaPath", "CTA path internal /id/… atau /en/…", details.ctaPath)}
    </div></details>}
    </fieldset>
    <p className="text-sm text-slate-600">{portfolio ? "Pilih status langsung: DRAFT/REVIEW tidak tampil public, PUBLISHED langsung terbit, dan SCHEDULED terbit sesuai jadwal UTC. Arsipkan melalui tombol Arsipkan, bukan pilihan status." : "Simpan DRAFT → kirim REVIEW → publisher memilih PUBLISHED atau SCHEDULED."} Publikasi memerlukan konten lengkap ID/EN. {portfolio ? "Cover dapat dipilih dari perangkat dan tetap dipertahankan jika tidak diganti." : "Gambar memakai asset /images/ yang sudah tersedia."}</p>
    {state.message && <p role="status" className={state.success ? "text-teal-700" : "text-red-700"}>{state.message}</p>}
    <button disabled={pending || readOnly} className="min-h-11 rounded-lg bg-[#08747A] px-5 py-3 font-semibold text-white disabled:opacity-50">{pending ? "Menyimpan…" : portfolio ? "Simpan portfolio" : "Simpan konten"}</button>
  </form>;
}
