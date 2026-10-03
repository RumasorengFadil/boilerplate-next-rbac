import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { APP_CONFIG } from "@/config/app-config";
import { seoDocumentSchema, type SeoDocument } from "./contracts";
import { siteOrigin } from "./metadata";

export const ogImageSize = { width: 1200, height: 630 } as const;
export const ogImageContentType = "image/png";
let logoData: Promise<string> | undefined;
function logoSource() {
  logoData ??= readFile(join(process.cwd(), "public/images/lunabiner-logo.png"), "base64");
  return logoData.then(data => `data:image/png;base64,${data}`);
}

export async function renderOgImage(input: SeoDocument) {
  const document = seoDocumentSchema.parse(input);
  const logo = await logoSource();
  const variant = [...document.path].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 3;
  const colors = ["#08747A", "#0F8F95", "#132A32"];
  const description = document.description.length > 170 ? document.description.slice(0, 167).replace(/\s+\S*$/, "") + "…" : document.description;
  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "48px 60px", background: "#F4F9F8", color: "#132A32", position: "relative", overflow: "hidden" }}>
      <div style={{ display: "flex", position: "absolute", right: -100, top: variant === 1 ? -160 : 240, width: 440, height: 440, borderRadius: 220, border: `56px solid ${colors[variant]}`, opacity: 0.14 }} />
      <div style={{ display: "flex", position: "absolute", right: variant === 2 ? 135 : 80, top: 120, width: 70, height: 70, borderRadius: 35, background: "#F5A033" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* ImageResponse renders this local data URI; next/image is not used in OG JSX. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} width={64} height={64} alt="" />
        <div style={{ display: "flex", fontSize: 30, fontWeight: 700 }}>{APP_CONFIG.name}</div>
      </div>
      <div style={{ display: "flex", marginTop: 36, fontSize: 18, letterSpacing: 2, color: "#08747A" }}>{document.category}</div>
      <div style={{ display: "flex", marginTop: 20, maxWidth: 990, fontSize: document.headline.length > 100 ? 40 : 56, lineHeight: 1.12, fontWeight: 700 }}>{document.headline}</div>
      <div style={{ display: "flex", marginTop: 24, maxWidth: 880, fontSize: 23, lineHeight: 1.4, color: "#42565B" }}>{description}</div>
      <div style={{ display: "flex", marginTop: "auto", paddingTop: 20, justifyContent: "space-between", fontSize: 18, color: "#42565B" }}>
        <div style={{ display: "flex" }}>{new URL(siteOrigin()).host}</div>
        <div style={{ display: "flex" }}>{document.locale.toUpperCase()}</div>
      </div>
    </div>, ogImageSize,
  );
}
