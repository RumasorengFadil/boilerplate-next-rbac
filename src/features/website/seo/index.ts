import type { Metadata } from "next";
import type { Locale } from "../content";
import type { SeoDocument, SeoPageKey, SchemaItem } from "./contracts";
import { buildMetadata } from "./metadata";
import { getPageSeoDocument } from "./registry";
import { buildPageSchema, type JsonLdObject } from "./schema";

export type PageSeo = { metadata: Metadata; schema: JsonLdObject };

/** Complete Metadata → OpenGraph → Twitter → Canonical → Schema.org contract. */
export function buildSeo(document: SeoDocument, items: SchemaItem[] = []): PageSeo {
  return { metadata: buildMetadata(document), schema: buildPageSchema(document, items) };
}

export function getPageSeo(key: SeoPageKey, locale: Locale, items: SchemaItem[] = []): PageSeo {
  return buildSeo(getPageSeoDocument(key, locale), items);
}
