import { Footer, Header } from "@/features/website/components";
import { SolutionAssistant } from "@/features/assistant/components";
import { AnalyticsTracker } from "@/features/analytics/tracker";
import type { Locale } from "@/features/website/content";
import { notFound } from "next/navigation";
export function generateStaticParams() { return [{ locale: "id" }, { locale: "en" }]; }
export default async function PublicLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) { const { locale } = await params; if (locale !== "id" && locale !== "en") notFound(); return <><Header locale={locale as Locale} /><main>{children}</main><Footer locale={locale as Locale} /><SolutionAssistant locale={locale} /><AnalyticsTracker locale={locale} /></>; }
