export type Locale = "id" | "en";

const services = [
  { icon: "01", title: { id: "Pengembangan Software", en: "Software Development" }, body: { id: "Aplikasi web, sistem internal, portal pelanggan, dan produk SaaS yang mengikuti cara bisnis Anda bekerja.", en: "Web apps, internal systems, customer portals, and SaaS products designed around how your business works." }, capabilities: ["Web application", "Enterprise system", "Customer portal"] },
  { icon: "02", title: { id: "Otomasi Bisnis", en: "Business Automation" }, body: { id: "Kurangi pekerjaan berulang dan hubungkan proses bisnis dengan alur kerja yang dapat diandalkan.", en: "Reduce repetitive work and connect business processes with reliable workflows." }, capabilities: ["Workflow automation", "Approval flows", "API integration"] },
  { icon: "03", title: { id: "Solusi AI", en: "AI Solutions" }, body: { id: "Terapkan AI pada use case yang menghasilkan nilai bisnis yang terukur.", en: "Apply AI where it creates measurable business value." }, capabilities: ["AI assistant", "Document intelligence", "AI workflow"] },
  { icon: "04", title: { id: "Data & Integrasi", en: "Data & Integration" }, body: { id: "Ubah sistem dan data yang terpisah menjadi informasi yang siap digunakan.", en: "Turn fragmented systems and data into useful information." }, capabilities: ["Data integration", "Dashboards", "System integration"] },
] as const;

const projects = [
  { title: { id: "Platform operasi untuk perusahaan energi", en: "Operations platform for an energy company" }, industry: { id: "Energi", en: "Energy" }, problem: { id: "Proses operasional dan data lapangan terpisah.", en: "Operational processes and field data were disconnected." }, solution: { id: "Sistem internal terpadu untuk alur kerja dan visibilitas data.", en: "A unified internal system for workflows and data visibility." }, impact: { id: "Operasi lebih terstruktur dan siap untuk pengambilan keputusan.", en: "More structured operations, ready for better decisions." }, capabilities: ["Internal system", "Integration", "Analytics"], tone: "from-[#08747A] via-[#0F8F95] to-[#18B7B3]" },
  { title: { id: "Alur dokumen untuk bisnis distribusi", en: "Document workflow for a distribution business" }, industry: { id: "Distribusi", en: "Distribution" }, problem: { id: "Dokumen dan persetujuan berjalan manual.", en: "Documents and approvals moved manually." }, solution: { id: "Otomasi alur dokumen dan notifikasi proses.", en: "Automated document flows and process notifications." }, impact: { id: "Tim memiliki proses yang lebih jelas untuk ditindaklanjuti.", en: "The team gained a clearer process to follow up." }, capabilities: ["Automation", "Approvals", "Notifications"], tone: "from-[#132A32] via-[#08747A] to-[#63CEC9]" },
  { title: { id: "Pusat pengetahuan untuk tim layanan", en: "Knowledge hub for a service team" }, industry: { id: "Layanan Bisnis", en: "Business Services" }, problem: { id: "Informasi penting sulit ditemukan saat dibutuhkan.", en: "Critical information was hard to find when needed." }, solution: { id: "Pencarian dan asisten berbasis knowledge base.", en: "Knowledge-base search and assistant experience." }, impact: { id: "Akses informasi yang lebih konsisten untuk tim.", en: "More consistent access to information for the team." }, capabilities: ["AI assistant", "Search", "Knowledge base"], tone: "from-[#0F8F95] via-[#18B7B3] to-[#F5A033]" },
] as const;

const articles = [
  { slug: "ai-untuk-operasi-bisnis", category: "Artificial Intelligence", title: { id: "Memulai AI dari masalah operasional yang nyata", en: "Starting AI with real operational problems" }, excerpt: { id: "Cara memilih use case AI yang relevan, terukur, dan siap diterapkan.", en: "How to select AI use cases that are relevant, measurable, and ready to apply." } },
  { slug: "menghubungkan-sistem-bisnis", category: "Automation", title: { id: "Menghubungkan sistem sebelum menambah pekerjaan", en: "Connect systems before adding more work" }, excerpt: { id: "Mengapa integrasi sederhana sering memberi dampak lebih cepat daripada membangun ulang semuanya.", en: "Why simple integration often delivers impact faster than rebuilding everything." } },
  { slug: "data-untuk-keputusan", category: "Data & Analytics", title: { id: "Data yang siap dipakai untuk keputusan sehari-hari", en: "Data that is ready for everyday decisions" }, excerpt: { id: "Dari data yang tersebar menuju informasi yang benar-benar membantu tim bekerja.", en: "From scattered data to information that genuinely helps teams work." } },
] as const;

export const website = { services, projects, articles,
  companyDescription: "LunaBiner is a technology partner connecting software, automation, data and AI into practical business solutions. Partner teknologi untuk sistem digital terintegrasi.",
  faq: [{ question: "How can I contact LunaBiner?", answer: "Contact LunaBiner through the website contact page or WhatsApp +62 815-9370-857. Pricing, delivery timelines, and project experience require direct confirmation from the team." }],
  products: [
    { name: "Enterprise Chat", text: { id: "Platform komunikasi privat untuk organisasi yang membutuhkan kontrol, keamanan, dan fleksibilitas deployment.", en: "A private communications platform for organizations that need control, security, and deployment flexibility." }, items: ["Private company chat", "Self-hosted / on-premise", "Admin control"] },
    { name: "AI Cashflow", text: { id: "Pengelolaan arus kas cerdas yang membantu mengubah dokumen dan transaksi menjadi insight yang dapat ditindaklanjuti.", en: "Intelligent cashflow management that turns documents and transactions into actionable insight." }, items: ["Receipt & invoice extraction", "Auto categorization", "Cashflow insight"] },
  ],
};
export const t = (locale: Locale, id: string, en: string) => locale === "id" ? id : en;
