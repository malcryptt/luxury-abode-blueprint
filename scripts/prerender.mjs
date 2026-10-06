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

// The one listing the site ships with (see src/lib/siteContent.ts).
const DEFAULT_PROPERTIES = [
  { slug: "arya-luxe", title: "Arya Luxe", location: "Gwarinpa, Abuja", description: "Off-plan 3 and 4-bedroom smart apartments in Gwarinpa, Abuja. Foundation complete, superstructure starting.", price: "Price on request", status: "under_construction", images: [] },
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

// Pages the team switched off. Furniture is off by default until its photography is ready.
const ROUTE_FLAGS = { "/properties": "properties", "/furniture": "furniture", "/arya-luxe": "aryaLuxe" };
async function loadHidden() {
  const hidden = { properties: false, furniture: true, aryaLuxe: false };
  const project = readEnv().VITE_FIREBASE_PROJECT_ID;
  if (!project) return hidden;
  try {
    const doc = await getJson(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/content/hidden`, {});
    const v = decode(doc.fields?.value);
    if (v && typeof v === "object") for (const k of Object.keys(hidden)) if (typeof v[k] === "boolean") hidden[k] = v[k];
  } catch (e) { console.log(`  page visibility not available (${e.message})`); }
  return hidden;
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

const hiddenPages = await loadHidden();
const pages = [];
for (const r of STATIC_ROUTES) {
  if (ROUTE_FLAGS[r.path] && hiddenPages[ROUTE_FLAGS[r.path]]) { console.log(`  skipping ${r.path} (hidden)`); continue; }
  write(r.path, withHead(buildSeo(routeSeoInput(r.path))));
  pages.push(r);
}
const seen = new Set();
for (const p of hiddenPages.properties ? [] : list) {
  if (!p.slug || seen.has(p.slug)) continue;
  seen.add(p.slug);
  const route = `/properties/${p.slug}`;
  write(route, withHead(buildSeo(propertySeoInput(p))));
  pages.push({ path: route, changefreq: "weekly", priority: "0.8" });
}

fs.writeFileSync(path.join(DIST, "sitemap.xml"), sitemapXml(pages, new Date().toISOString().slice(0, 10)));
console.log(`prerender: wrote ${pages.length} pages and sitemap.xml`);
