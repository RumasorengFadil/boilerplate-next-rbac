import type { Locale } from "../content";
import { seoDocumentSchema, seoLocaleSchema, seoPageKeySchema, type SeoDocument, type SeoPageKey } from "./contracts";

type Copy = { title: string; description: string; keywords: string[]; category: string };
type PageDefinition = { path: string; pageType: SeoDocument["pageType"]; entityType?: SeoDocument["entityType"]; id: Copy; en: Copy };
// Editorial source only. getPageSeo() in index.ts returns the full metadata/schema bundle.
export const seoPages: Record<SeoPageKey, PageDefinition> = {
  home: {
    path: "", pageType: "WebPage",
    id: { title: "Solusi Software, Otomasi, Data & AI", description: "LunaBiner membantu bisnis menghubungkan software, otomasi, data, dan AI. Jelajahi layanan, pendekatan kerja, serta kebutuhan sistem digital Anda.", keywords: ["solusi teknologi bisnis", "software bisnis", "otomasi bisnis", "LunaBiner"], category: "SISTEM BISNIS TERHUBUNG" },
    en: { title: "Software, Automation, Data & AI Solutions", description: "LunaBiner connects software, automation, data and AI for business. Explore our services, approach and solutions for your digital systems.", keywords: ["business technology solutions", "business software", "business automation", "LunaBiner"], category: "CONNECTED BUSINESS SYSTEMS" },
  },
  solutions: {
    path: "/solutions", pageType: "CollectionPage",
    id: { title: "Layanan Software, Otomasi & Integrasi AI", description: "Temukan layanan LunaBiner: pengembangan software, otomasi proses bisnis, solusi AI, serta data dan integrasi untuk sistem yang saling terhubung.", keywords: ["pengembangan software", "otomasi proses bisnis", "solusi AI", "integrasi data"], category: "LAYANAN LUNABINER" },
    en: { title: "Software, Automation & AI Integration Services", description: "Explore LunaBiner's software development, business automation, AI solutions, and data integration services for connected business systems.", keywords: ["software development", "workflow automation", "AI solutions", "data integration"], category: "LUNABINER SERVICES" },
  },
  work: {
    path: "/work", pageType: "CollectionPage",
    id: { title: "Portfolio & Studi Kasus Solusi Bisnis", description: "Jelajahi portfolio dan contoh studi kasus LunaBiner tentang sistem internal, otomasi dokumen, serta solusi knowledge base untuk kebutuhan bisnis.", keywords: ["portfolio LunaBiner", "studi kasus software", "sistem internal", "otomasi dokumen"], category: "PORTFOLIO & STUDI KASUS" },
    en: { title: "Portfolio & Business Solution Case Studies", description: "Explore LunaBiner's portfolio and illustrative case studies of internal systems, document automation and knowledge-base solutions for business needs.", keywords: ["LunaBiner portfolio", "software case studies", "internal systems", "document automation"], category: "PORTFOLIO & CASE STUDIES" },
  },
  products: {
    path: "/products", pageType: "CollectionPage",
    id: { title: "Produk LunaBiner Labs untuk Bisnis", description: "Jelajahi produk LunaBiner Labs, fitur dan kesiapan masing-masing. Kenali arah pengembangan produk dan diskusikan kesesuaiannya dengan kebutuhan bisnis Anda.", keywords: ["LunaBiner Labs", "produk LunaBiner", "produk teknologi bisnis", "pengembangan produk"], category: "LUNABINER LABS" },
    en: { title: "LunaBiner Labs Products for Business", description: "Explore LunaBiner Labs products, features and readiness. Discover product development direction and discuss how it fits your business needs.", keywords: ["LunaBiner Labs", "LunaBiner products", "business technology products", "product development"], category: "LUNABINER LABS" },
  },
  insights: {
    path: "/insights", pageType: "CollectionPage", entityType: "Blog",
    id: { title: "Insights Teknologi & Bisnis", description: "Baca perspektif LunaBiner tentang penerapan AI, otomasi, integrasi sistem, dan data untuk memahami kebutuhan teknologi dalam konteks bisnis.", keywords: ["insights LunaBiner", "AI untuk bisnis", "integrasi sistem", "data bisnis"], category: "INSIGHTS TEKNOLOGI & BISNIS" },
    en: { title: "Technology & Business Insights", description: "Read LunaBiner's perspectives on AI adoption, automation, system integration and data to understand technology needs in a practical business context.", keywords: ["LunaBiner insights", "AI for business", "system integration", "business data"], category: "TECHNOLOGY & BUSINESS INSIGHTS" },
  },
  about: {
    path: "/about", pageType: "AboutPage",
    id: { title: "Tentang LunaBiner & Pendekatan Kami", description: "Kenali LunaBiner, partner teknologi yang menghubungkan software, otomasi, data, dan AI dengan pendekatan bisnis terlebih dahulu dan solusi terintegrasi.", keywords: ["tentang LunaBiner", "partner teknologi", "solusi terintegrasi", "pendekatan bisnis"], category: "TENTANG LUNABINER" },
    en: { title: "About LunaBiner & Our Approach", description: "Meet LunaBiner, a technology partner connecting software, automation, data and AI through a business-first approach and integrated solutions.", keywords: ["about LunaBiner", "technology partner", "integrated solutions", "business-first approach"], category: "ABOUT LUNABINER" },
  },
  contact: {
    path: "/contact", pageType: "ContactPage",
    id: { title: "Hubungi Tim LunaBiner", description: "Hubungi LunaBiner untuk mendiskusikan kebutuhan software, otomasi, data, atau AI. Ceritakan tantangan bisnis Anda melalui form kontak atau WhatsApp.", keywords: ["kontak LunaBiner", "diskusi proyek software", "konsultasi teknologi", "WhatsApp LunaBiner"], category: "MULAI PERCAKAPAN" },
    en: { title: "Contact the LunaBiner Team", description: "Contact LunaBiner to discuss software, automation, data or AI needs. Share your business challenge through the contact form or WhatsApp.", keywords: ["contact LunaBiner", "software project discussion", "technology consultation", "LunaBiner WhatsApp"], category: "START A CONVERSATION" },
  },
  consultation: {
    path: "/consultation", pageType: "WebPage",
    id: { title: "Jadwalkan Konsultasi Bisnis & Teknologi", description: "Lihat ketersediaan konsultasi LunaBiner, pilih slot dan zona waktu, lalu ceritakan kebutuhan bisnis Anda. Booking mengikuti ketersediaan tim.", keywords: ["jadwal konsultasi LunaBiner", "booking konsultasi", "kebutuhan teknologi bisnis", "zona waktu konsultasi"], category: "KONSULTASI LUNABINER" },
    en: { title: "Schedule a Business & Technology Consultation", description: "Check LunaBiner consultation availability, choose a slot and time zone, and describe your business needs. Booking is subject to team availability.", keywords: ["LunaBiner consultation schedule", "consultation booking", "business technology needs", "consultation time zone"], category: "LUNABINER CONSULTATION" },
  },
};

export function getPageSeoDocument(key: SeoPageKey, locale: Locale): SeoDocument {
  const page = seoPages[seoPageKeySchema.parse(key)];
  const language = seoLocaleSchema.parse(locale);
  return seoDocumentSchema.parse({ ...page[language], locale: language, path: page.path, pageType: page.pageType,
    ...(page.entityType ? { entityType: page.entityType } : {}), headline: page[language].title });
}
