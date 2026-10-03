import type { Metadata } from "next";
import { headers } from "next/headers";
import { seoLocaleSchema } from "@/features/website/seo/contracts";
import { Toaster } from "sonner";
import { APP_CONFIG } from "@/config/app-config";
import { ReactQueryProvider } from "@/context/providers/react-query-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: APP_CONFIG.name, template: `%s | ${APP_CONFIG.name}` },
  description: APP_CONFIG.description,
  metadataBase: new URL(APP_CONFIG.url),
  // Public pages explicitly opt into indexing through their contextual metadata.
  robots: { index: false, follow: false },
};
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = seoLocaleSchema.catch("id").parse((await headers()).get("x-lunabiner-locale"));
  return <html lang={locale}><body><ReactQueryProvider>{children}<Toaster richColors /></ReactQueryProvider></body></html>;
}
