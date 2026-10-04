import { AnalyticsTracker } from "@/features/analytics/tracker";
import { SolutionAssistant } from "@/features/assistant/components";
import { Footer, Header } from "@/features/website/components";
import type { Locale } from "@/features/website/content";
import { JsonLd } from "@/features/website/seo/json-ld";
import { buildSiteSchema } from "@/features/website/seo/schema";
import { notFound } from "next/navigation";
export function generateStaticParams() {
  return [{ locale: "id" }, { locale: "en" }];
}
export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "id" && locale !== "en") notFound();
  return (
    <>
      <JsonLd data={buildSiteSchema()} />
      <Header locale={locale as Locale} />
      <main lang={locale}>{children}</main>
      <Footer locale={locale as Locale} />
      <SolutionAssistant locale={locale} />
      <AnalyticsTracker locale={locale} />
    </>
  );
}
