import { z } from "zod";
import { APP_CONFIG } from "@/config/app-config";
import { seoDocumentSchema, schemaItemSchema, type SeoDocument, type SchemaItem } from "./contracts";
import { brandedTitle, ogImageUrl, pageUrl, siteOrigin } from "./metadata";

export type JsonLdObject = Record<string, unknown>;
export function buildSiteSchema(): JsonLdObject {
  const origin = siteOrigin();
  return { "@context": "https://schema.org", "@graph": [
    { "@type": "Organization", "@id": `${origin}/#organization`, name: APP_CONFIG.name, url: origin,
      description: APP_CONFIG.description, logo: `${origin}/images/lunabiner-logo.png` },
    { "@type": "WebSite", "@id": `${origin}/#website`, name: APP_CONFIG.name, url: origin,
      inLanguage: ["id", "en"], publisher: { "@id": `${origin}/#organization` } },
  ] };
}
export function buildPageSchema(input: SeoDocument, rawItems: SchemaItem[] = []): JsonLdObject {
  const document = seoDocumentSchema.parse(input);
  const items = z.array(schemaItemSchema).max(200).parse(rawItems);
  if (items.length && document.pageType !== "CollectionPage") throw new Error("ItemList requires a collection page.");
  const url = pageUrl(document.locale, document.path);
  const organization = { "@id": `${siteOrigin()}/#organization` };
  const image = { "@type": "ImageObject", "@id": `${url}#primaryimage`, url: ogImageUrl(document), width: 1200, height: 630 };
  const page: JsonLdObject = { "@type": document.pageType, "@id": `${url}#webpage`, url,
    name: brandedTitle(document.title), description: document.description, inLanguage: document.locale,
    isPartOf: { "@id": `${siteOrigin()}/#website` }, publisher: organization,
    primaryImageOfPage: { "@id": image["@id"] },
  };
  const graph: JsonLdObject[] = [page, image];
  if (document.entityType) {
    const entityId = `${url}#content`;
    page.mainEntity = { "@id": entityId };
    graph.push({ "@type": document.entityType, "@id": entityId, headline: document.headline, name: document.headline,
      description: document.description, url, inLanguage: document.locale, image: { "@id": image["@id"] },
      mainEntityOfPage: { "@id": `${url}#webpage` }, publisher: organization,
      ...(document.authorName ? { author: { "@type": "Person", name: document.authorName } } : {}),
      ...(document.publishedAt ? { datePublished: document.publishedAt } : {}),
      ...(document.modifiedAt ? { dateModified: document.modifiedAt } : {}),
      ...(document.illustrative ? { genre: document.locale === "id" ? "Contoh ilustratif" : "Illustrative example" } : {}),
    });
  }
  if (items.length) {
    const itemListId = `${url}#items`;
    page.mainEntity = { "@id": itemListId };
    graph.push({ "@type": "ItemList", "@id": itemListId, numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, item: {
        "@type": item.type, name: item.name, description: item.description,
        ...(item.path !== undefined ? { url: pageUrl(document.locale, item.path) } : {}),
        ...(item.type === "Service" ? { provider: organization } : {}),
        ...(item.concept ? { creativeWorkStatus: "Concept" } : {}),
      } })),
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

export function serializeJsonLd(data: JsonLdObject) {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
