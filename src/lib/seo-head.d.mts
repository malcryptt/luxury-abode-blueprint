export interface Crumb {
  name: string;
  path: string;
}

export interface StaticRoute {
  path: string;
  title: string;
  description: string;
  crumb: string;
  changefreq: string;
  priority: string;
}

export interface PropertyLike {
  slug: string;
  title: string;
  location?: string;
  description?: string;
  price?: string;
  image?: string | null;
  images?: string[];
  status?: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  size_sqm?: number | null;
}

export interface SeoInput {
  path?: string;
  title: string;
  fullTitle?: string;
  description: string;
  image?: string | null;
  type?: string;
  noindex?: boolean;
  breadcrumbs?: Crumb[];
  pageType?: string;
  pageExtra?: Record<string, unknown>;
}

export interface ResolvedSeo {
  titleTag: string;
  description: string;
  canonical: string;
  image: string;
  type: string;
  robots: string;
  jsonLd: Record<string, unknown>;
}

export interface HeadMeta {
  attr: "name" | "property";
  key: string;
  content: string;
}

export interface HeadEntries {
  title: string;
  canonical: string;
  metas: HeadMeta[];
  jsonLd: string;
}

export interface SitemapEntry {
  path: string;
  changefreq: string;
  priority: string;
}

export const SITE_URL: string;
export const SITE_NAME: string;
export const DEFAULT_IMAGE: string;
export const HOME_TITLE: string;
export const STATIC_ROUTES: StaticRoute[];

export function slugify(s: string): string;
export function clip(text: string, max?: number): string;
export function absoluteUrl(src?: string | null): string;
export function canonicalFor(path: string): string;
export function priceToNumber(price?: string | null): number | null;
export function propertyListing(p: PropertyLike, path: string): Record<string, unknown>;
export function routeSeoInput(path: string): SeoInput;
export function propertySeoInput(p: PropertyLike): SeoInput;
export function buildSeo(input: SeoInput): ResolvedSeo;
export function headEntries(seo: ResolvedSeo): HeadEntries;
export function renderHeadHtml(seo: ResolvedSeo): string;
export function sitemapXml(entries: SitemapEntry[], lastmod: string): string;
