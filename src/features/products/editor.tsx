"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { saveProductAction, type ProductState } from "./actions";
import { PRODUCT_TEXT_MAX, productStatuses, productReadiness, type ProductInput } from "./schema";
import { PRODUCT_FEATURE_MAX, PRODUCT_FEATURE_COUNT_MAX } from "./summary-content";

export function ProductEditor({ initial, canPublish, readOnly = false }: { initial?: ProductInput; canPublish: boolean; readOnly?: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveProductAction, { message: "" } as ProductState);
  const [values, setValues] = useState<Record<string, string>>({});
  const [features, setFeatures] = useState(() => Object.fromEntries((["id", "en"] as const).map(locale => [locale,
    (initial?.details.productFeatures?.[locale] ?? initial?.details.features ?? []).map((text, index) => ({ key: `${locale}-existing-${index}`, text })),
  ])) as Record<"id" | "en", { key: string; text: string }[]>);
  const value = (name: string, fallback = "") => values[name] ?? fallback;
  const update = (name: string, content: string) => setValues(previous => ({ ...previous, [name]: content }));
  useEffect(() => { if (state.success && state.id) { router.replace(`/dashboard/products/${state.id}`); router.refresh(); } }, [state, router]);
  const field = (name: string, label: string, fallback = "", max = 180, textarea = false, required = false) => {
    const content = value(name, fallback), error = state.fieldErrors?.[name];
    const legacy = textarea && fallback.length > max && content === fallback;
    const props = { name, value: content, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update(name, event.target.value), maxLength: max, required,
      "aria-invalid": Boolean(error), "aria-describedby": `${name}-help${error ? ` ${name}-error` : ""}`, className: `input min-w-0 ${error ? "border-red-500" : ""}` };
    return <label className="grid min-w-0 gap-2 text-sm" key={name}>{label}
      {textarea ? <textarea {...props} rows={3} /> : <input {...props} />}
      <span id={`${name}-help`} className={`text-xs ${legacy ? "text-amber-700" : "text-slate-500"}`}>{content.length}/{max} karakter{legacy ? " · Konten lama dipertahankan. Jika diedit, batasi hingga 150 karakter." : ""}</span>
      {error && <span id={`${name}-error`} className="text-xs text-red-700">{error}</span>}
    </label>;
  };
  const status = initial?.status === "REVIEW" || initial?.status === "ARCHIVED" ? "DRAFT" : initial?.status ?? "DRAFT";
  const cta = initial?.details.productCta;
  const ctaType = value("ctaType", cta?.type ?? "internal");
  const internalPath = cta?.type === "internal" ? cta.path : "/consultation";
  const error = (name: string) => state.fieldErrors?.[name] && <span id={`${name}-error`} className="text-xs text-red-700">{state.fieldErrors[name]}</span>;
  return <form action={action} className="mt-6 min-w-0 space-y-6">
    {initial?.status === "REVIEW" && <p className="card text-sm">Status REVIEW lama tidak dipublish otomatis. Pilih status baru; default DRAFT saat menyimpan.</p>}
    {readOnly && <p className="card text-sm">Produk sudah dipublikasikan/dijadwalkan. Akun Anda hanya dapat mengedit draft; hubungi publisher untuk perubahan.</p>}
    <fieldset disabled={pending || readOnly} className="min-w-0 space-y-6">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}<input type="hidden" name="version" value={state.version ?? initial?.version ?? 1} />
      <section className="card grid min-w-0 gap-4 sm:grid-cols-2">
        {field("slug", "Slug produk", initial?.slug, 120, false, true)}
        <label className="grid gap-2 text-sm">Status publikasi<select name="status" className="input" value={value("status", status)} onChange={event => update("status", event.target.value)} aria-invalid={Boolean(state.fieldErrors?.status)} aria-describedby={state.fieldErrors?.status ? "status-error" : undefined}>{productStatuses.filter(item => canPublish || item === "DRAFT" || readOnly && item === status).map(item => <option key={item}>{item}</option>)}</select>{error("status")}</label>
        <label className="grid gap-2 text-sm">Kesiapan produk<select name="productStatus" className="input" value={value("productStatus", initial?.details.productStatus ?? "COMING_SOON")} onChange={event => update("productStatus", event.target.value)} aria-invalid={Boolean(state.fieldErrors?.productStatus)} aria-describedby={state.fieldErrors?.productStatus ? "productStatus-error" : undefined}>{productReadiness.map(item => <option key={item} value={item}>{({ COMING_SOON: "Segera hadir", BETA: "Beta", LIVE: "Tersedia" })[item]}</option>)}</select>{error("productStatus")}</label>
        <label className="grid gap-2 text-sm">Jadwal publikasi (UTC)<input type="datetime-local" name="publishedAt" className="input" value={value("publishedAt", initial?.publishedAt?.slice(0, 16) ?? "")} onChange={event => update("publishedAt", event.target.value)} aria-invalid={Boolean(state.fieldErrors?.publishedAt)} aria-describedby={state.fieldErrors?.publishedAt ? "publishedAt-error" : undefined} />{error("publishedAt")}</label>
        {field("category", "Kategori", initial?.details.category, 100)}{field("tags", "Tags (pisahkan koma)", initial?.details.tags.join(", "), 1000)}
        {field("authorName", "Kredit / nama penulis", initial?.details.authorName, 100)}
      </section>
      <section className="grid min-w-0 gap-5 lg:grid-cols-2">{(["id", "en"] as const).map(locale => <fieldset key={locale} className="card min-w-0 space-y-4"><legend className="font-semibold">{locale === "id" ? "Bahasa Indonesia" : "English"}</legend>
        {field(`${locale}.title`, `Nama produk (${locale.toUpperCase()})`, initial?.translations[locale].title, 180, false, true)}
        {field(`${locale}.excerpt`, `Ringkasan (${locale.toUpperCase()})`, initial?.translations[locale].excerpt, PRODUCT_TEXT_MAX, true)}
        <p className="text-xs text-slate-500">Ringkasan menjadi deskripsi produk. Teks biasa tanpa HTML/Markdown; minimal 10 karakter untuk publikasi.</p>
        <div className="space-y-3"><h2 className="font-semibold">Fitur produk ({locale.toUpperCase()})</h2>
          <p className="text-xs text-slate-500">{features[locale].length}/{PRODUCT_FEATURE_COUNT_MAX} poin · maksimal {PRODUCT_FEATURE_MAX} karakter per poin.</p>
          {features[locale].map((item, index) => <div key={item.key} className="space-y-2">
            <label className="grid gap-2 text-sm">Fitur {locale.toUpperCase()} {index + 1}<input className="input min-w-0" name={`${locale}.feature`} value={item.text} maxLength={PRODUCT_FEATURE_MAX} aria-invalid={Boolean(state.fieldErrors?.[`${locale}.features.${index}`])} aria-describedby={state.fieldErrors?.[`${locale}.features.${index}`] ? `${locale}.features.${index}-error` : undefined} onChange={event => setFeatures(previous => ({ ...previous, [locale]: previous[locale].map(feature => feature.key === item.key ? { ...feature, text: event.target.value } : feature) }))} />
              <span className="text-xs text-slate-500">{item.text.length}/{PRODUCT_FEATURE_MAX} karakter</span>
            </label>
            {error(`${locale}.features.${index}`)}
            <button type="button" className="min-h-11 rounded-md border px-3 text-sm" aria-label={`Hapus fitur ${locale.toUpperCase()} ${index + 1}`} onClick={() => setFeatures(previous => ({ ...previous, [locale]: previous[locale].filter(feature => feature.key !== item.key) }))}>Hapus poin</button>
          </div>)}
          {error(`${locale}.features`)}
          <button type="button" className="min-h-11 rounded-md border px-3 text-sm disabled:opacity-50" disabled={features[locale].length >= PRODUCT_FEATURE_COUNT_MAX} onClick={() => setFeatures(previous => ({ ...previous, [locale]: [...previous[locale], { key: crypto.randomUUID(), text: "" }] }))}>Tambah fitur {locale.toUpperCase()}</button>
        </div>
        {field(`${locale}.seoTitle`, `Judul SEO (${locale.toUpperCase()})`, initial?.translations[locale].seoTitle, 70)}
        {field(`${locale}.seoDescription`, `Deskripsi SEO (${locale.toUpperCase()})`, initial?.translations[locale].seoDescription, 180)}
      </fieldset>)}</section>
      {(initial?.translations.id.body || initial?.translations.en.body) && <p className="text-xs text-slate-500">Detail lama tetap disimpan untuk keamanan data hingga migrasi Task 3c. Deskripsi yang ditampilkan memakai Ringkasan.</p>}
      <section className="card min-w-0 space-y-4"><h2 className="font-semibold">CTA produk</h2>
        <label className="grid gap-2 text-sm">Tujuan CTA<select className="input" name="ctaType" value={ctaType} onChange={event => update("ctaType", event.target.value)} aria-invalid={Boolean(state.fieldErrors?.productCta)} aria-describedby={state.fieldErrors?.productCta ? "productCta-error" : undefined}><option value="internal">{internalPath === "/consultation" ? "Konsultasi internal" : `Halaman internal existing (${internalPath})`}</option><option value="external">Aplikasi / demo eksternal (HTTPS)</option></select></label>
        <input type="hidden" name="ctaInternalPath" value={internalPath} />
        {ctaType === "external" && field("ctaUrl", "URL aplikasi / demo (HTTPS)", cta?.type === "external" ? cta.url : "", 2000)}
        {error("productCta")}
        <div className="grid gap-4 sm:grid-cols-2">{field("ctaLabel.id", "Label CTA (ID)", initial?.details.ctaLabel.id, 120)}{field("ctaLabel.en", "Label CTA (EN)", initial?.details.ctaLabel.en, 120)}</div>
      </section>
      <section className="card space-y-3"><h2 className="font-semibold">Cover produk</h2>
        {initial?.details.image && <Image src={initial.details.image} alt="Cover produk saat ini" width={400} height={225} unoptimized className="max-h-48 w-auto max-w-full rounded-md object-contain" />}
        <p className="text-sm text-slate-600">Cover existing dipertahankan saat menyimpan. Upload dari perangkat tersedia pada Task 4; tidak perlu menulis path gambar.</p>
      </section>
    </fieldset>
    <p className="text-sm text-slate-600">DRAFT tidak tampil public; PUBLISHED langsung terbit; SCHEDULED sesuai tanggal UTC. Kesiapan produk tidak mempublish otomatis. Arsip menggunakan tombol terpisah.</p>
    {state.message && <p role="status" className={state.success ? "text-teal-700" : "text-red-700"}>{state.message}</p>}
    <button disabled={pending || readOnly} className="min-h-11 rounded-lg bg-[#08747A] px-5 py-3 font-semibold text-white disabled:opacity-50">{pending ? "Menyimpan…" : "Simpan produk"}</button>
  </form>;
}
