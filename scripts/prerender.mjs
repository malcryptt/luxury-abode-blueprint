// Runs after `vite build`. Writes a real HTML file for every public route, each with its
// own <title>, description, canonical URL, Open Graph / Twitter tags and structured data,
// so search engines and link previews (WhatsApp, Facebook, X) see the right page without
// running any JavaScript. The React app still takes over in the browser.
//
// Property pages are discovered from the database at build time. If the database can't
// be reached (or the new tables aren't applied yet) it falls back to the older JSON list,
// then to the built-in defaults, so the build never fails because of the network.

import fs from "node:fs";
import path from "node:path";
import {
  STATIC_ROUTES, buildSeo, renderHeadHtml, routeSeoInput, propertySeoInput, sitemapXml, slugify,
} from "../src/lib/seo-head.mjs";

const DIST = path.resolve("dist");
const PLACEHOLDER = "<!--SEO-HEAD-->";

// Same three listings the site ships with (see src/lib/siteContent.ts and the data migration).
const DEFAULT_PROPERTIES = [
  { slug: "arya-luxe", title: "Arya Luxe", location: "Gwarinpa, Abuja", description: "A private collection of contemporary residences currently under construction.", price: "Price on request", status: "under_construction", images: [] },
  { slug: "4-bedroom-smart-home", title: "4 Bedroom Smart Home", location: "Gwarinpa, Abuja", description: "A fully automated family home with premium finishes throughout.", price: "₦95,000,000", status: "available", bedrooms: 4, images: [] },
  { slug: "the-palm-residence", title: "The Palm Residence", location: "Jabi, Abuja", description: "A 3-bedroom apartment designed around light and calm.", price: "₦72,000,000", status: "available", bedrooms: 3, images: [] },
];

function readEnv() {
  const env = { ...process.env };
  try {
    for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
      if (m && env[m[1]] === undefined) env[m[1]] = m[2];
    }
  } catch { /* no .env file is fine */ }
  return env;
}

async function getJson(url, headers) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(url, { headers, signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Firestore's REST API wraps every value in a type tag. This unwraps it into plain JSON.
function decode(v) {
  if (v == null) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(decode);
  if ("mapValue" in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, decode(x)]));
  return null;
}

async function loadProperties() {
  const env = readEnv();
  const project = env.VITE_FIREBASE_PROJECT_ID;
  if (project) {
    try {
      const doc = await getJson(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/content/properties`, {});
      const list = decode(doc.fields?.value);
      if (Array.isArray(list) && list.length) {
        return {
          source: "Firestore content/properties",
          list: list.filter((p) => !p.hidden).map((p, i) => ({
            slug: p.slug || slugify(p.title || `property-${i + 1}`),
            title: p.title || "Untitled property",
            location: p.location || "",
            description: p.description || "",
            price: p.price || "",
            images: p.image && !String(p.image).startsWith("/src/") ? [p.image] : [],
          })),
        };
      }
    } catch (e) { console.log(`  property list not available (${e.message})`); }
  }
  return { source: "built-in defaults", list: DEFAULT_PROPERTIES };
}

function write(routePath, html) {
  const file = routePath === "/" ? path.join(DIST, "index.html") : path.join(DIST, routePath, "index.html");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

const template = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
if (!template.includes(PLACEHOLDER)) throw new Error(`dist/index.html is missing ${PLACEHOLDER}`);
const withHead = (seo) => template.replace(PLACEHOLDER, renderHeadHtml(seo));

const { source, list } = await loadProperties();
console.log(`prerender: ${STATIC_ROUTES.length} fixed pages + ${list.length} properties (from ${source})`);

const pages = [];
for (const r of STATIC_ROUTES) {
  write(r.path, withHead(buildSeo(routeSeoInput(r.path))));
  pages.push(r);
}
const seen = new Set();
for (const p of list) {
  if (!p.slug || seen.has(p.slug)) continue;
  seen.add(p.slug);
  const route = `/properties/${p.slug}`;
  write(route, withHead(buildSeo(propertySeoInput(p))));
  pages.push({ path: route, changefreq: "weekly", priority: "0.8" });
}

fs.writeFileSync(path.join(DIST, "sitemap.xml"), sitemapXml(pages, new Date().toISOString().slice(0, 10)));
console.log(`prerender: wrote ${pages.length} pages and sitemap.xml`);
