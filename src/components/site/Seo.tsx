import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  buildSeo,
  headEntries,
  propertySeoInput,
  routeSeoInput,
  SITE_NAME,
  type PropertyLike,
  type SeoInput,
} from "@/lib/seo-head.mjs";

type SeoProps =
  | { route: string }
  | { property: PropertyLike }
  | { title: string; description: string; image?: string; noindex?: boolean };

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function applyHead(input: SeoInput) {
  const entries = headEntries(buildSeo(input));
  document.title = entries.title;
  entries.metas.forEach((m) => setMeta(m.attr, m.key, m.content));

  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", entries.canonical);

  let ld = document.getElementById("seo-jsonld");
  if (!ld) {
    ld = document.createElement("script");
    ld.id = "seo-jsonld";
    ld.setAttribute("type", "application/ld+json");
    document.head.appendChild(ld);
  }
  ld.textContent = entries.jsonLd;
}

/**
 * Per-page metadata. Use `route` for the fixed pages, `property` for a listing,
 * or title/description for anything else. The same data is written into each
 * page's HTML at build time (scripts/prerender.mjs) so crawlers and link
 * previews see it without running JavaScript.
 */
export function Seo(props: SeoProps) {
  const { pathname } = useLocation();
  const input: SeoInput =
    "route" in props
      ? routeSeoInput(props.route)
      : "property" in props
        ? propertySeoInput(props.property)
        : { path: pathname, title: props.title, description: props.description, image: props.image, noindex: props.noindex };
  const key = JSON.stringify(input);

  useEffect(() => {
    applyHead(input);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}

/** For private screens (admin, sign-in): keep them out of search results. */
export function useNoIndex(title: string) {
  useEffect(() => {
    document.title = `${title} | ${SITE_NAME}`;
    setMeta("name", "robots", "noindex,nofollow");
    document.head.querySelector('link[rel="canonical"]')?.remove();
  }, [title]);
}
