import type { Metadata } from "next";
import { Toaster } from "sonner";
import { APP_CONFIG } from "@/config/app-config";
import { ReactQueryProvider } from "@/context/providers/react-query-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: APP_CONFIG.name, template: `%s | ${APP_CONFIG.name}` },
  description: APP_CONFIG.description,
  metadataBase: new URL(APP_CONFIG.url),
  robots: { index: true, follow: true },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body><ReactQueryProvider>{children}<Toaster richColors /></ReactQueryProvider></body></html>;
}
