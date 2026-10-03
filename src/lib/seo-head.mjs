// Single source of truth for page metadata. Used by the <Seo> component in the
// browser and by scripts/prerender.mjs at build time, so both always agree.
// Plain .mjs (with a .d.mts beside it) so Node can import it without a compiler.

export const SITE_URL = "https://wslproperties.com.ng";
export const SITE_NAME = "WSL Properties";
export const DEFAULT_IMAGE = "/og-default.jpg";
export const HOME_TITLE = "WSL Properties | Luxury Homes in Abuja";

export const STATIC_ROUTES = [
  {
    path: "/",
    title: "Luxury Homes in Abuja",
    description: "WSL Properties develops luxury homes in Abuja, built with craft — from Arya Luxe in Gwarinpa to bespoke furniture.",
    crumb: "Home",
    changefreq: "weekly",
    priority: "1.0",
  },
  {
    path: "/about",
    title: "About Us",
    description: "The story of WSL Properties — a Nigerian developer with roots in craftsmanship and bespoke furniture.",
    crumb: "About Us",
    changefreq: "monthly",
    priority: "0.7",
  },
  {
    path: "/properties",
    title: "Properties",
    description: "Browse available luxury homes and apartments from WSL Properties in Abuja, including Gwarinpa and Jabi, with prices and enquiry details.",
    crumb: "Properties",
    changefreq: "weekly",
    priority: "0.9",
  },
  {
    path: "/furniture",
    title: "Furniture",
    description: "Bespoke luxury furniture handcrafted by WSL Properties in Abuja: beds, dining sets and finishing pieces made with the same care as our homes.",
    crumb: "Furniture",
    changefreq: "monthly",
    priority: "0.6",
  },
  {
    path: "/previous-jobs",
    title: "Previous Jobs",
    description: "A portfolio of homes, interiors and bespoke furniture completed by WSL Properties in Abuja.",
    crumb: "Previous Jobs",
    changefreq: "monthly",
    priority: "0.6",
  },
  {
    path: "/project-updates",
    title: "Project Updates",
    description: "Construction progress reports from WSL Properties developments, including Arya Luxe in Gwarinpa.",
    crumb: "Project Updates",
    changefreq: "weekly",
    priority: "0.7",
  },
  {
    path: "/arya-luxe",
    title: "Arya Luxe, Gwarinpa",
    description: "Arya Luxe is a private collection of contemporary residences being built by WSL Properties in Gwarinpa, Abuja. Follow the build stage by stage.",
    crumb: "Arya Luxe",
    changefreq: "weekly",
    priority: "0.8",
  },
  {
    path: "/contact",
    title: "Contact Us",
    description: "Contact WSL Properties for property enquiries, project information and partnerships in Abuja.",
    crumb: "Contact",
    changefreq: "yearly",
    priority: "0.7",
  },
];

export const slugify = (s) =>
  String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Trim to a meta-description length without cutting a word in half. */
export function clip(text, max = 158) {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const at = cut.lastIndexOf(" ");
  return (at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,;:.\-–—]+$/, "") + "…";
}

export function absoluteUrl(src) {
  if (!src || /^data:/i.test(src)) return SITE_URL + DEFAULT_IMAGE;
  if (/^https?:\/\//i.test(src)) return src;
  return SITE_URL + (src.startsWith("/") ? src : "/" + src);
}

export const canonicalFor = (path) => SITE_URL + (path === "/" ? "/" : String(path).replace(/\/+$/, ""));

/** "₦95,000,000" -> 95000000. "Price on request" -> null. */
export function priceToNumber(price) {
  const m = String(price ?? "").replace(/[,\s]/g, "").match(/(\d+(\.\d+)?)/);
  const n = m ? Number(m[1]) : NaN;
  return Number.isFinite(n) && n >= 1000 ? n : null;
}

/** schema.org fields for a property's page node. */
export function propertyListing(p, path) {
  const imgs = (p.images && p.images.length ? p.images : p.image ? [p.image] : [])
    .filter((x) => x && !/^data:/i.test(x))
    .map(absoluteUrl);
  const amount = priceToNumber(p.price);
  const availability =
    p.status === "sold"
      ? "https://schema.org/SoldOut"
      : p.status === "under_construction"
        ? "https://schema.org/PreOrder"
        : "https://schema.org/InStock";
  const house = {
    "@type": "House",
    name: p.title,
    address: { "@type": "PostalAddress", addressLocality: p.location || "Abuja", addressCountry: "NG" },
  };
  if (p.bedrooms != null) house.numberOfBedrooms = p.bedrooms;
  if (p.bathrooms != null) house.numberOfBathroomsTotal = p.bathrooms;
  if (p.size_sqm) house.floorSize = { "@type": "QuantitativeValue", value: p.size_sqm, unitCode: "MTK" };
  return {
    ...(imgs.length ? { image: imgs } : {}),
    ...(amount
      ? { offers: { "@type": "Offer", price: amount, priceCurrency: "NGN", availability, url: canonicalFor(path) } }
      : {}),
    about: house,
  };
}

export function routeSeoInput(path) {
  const r = STATIC_ROUTES.find((x) => x.path === path);
  if (!r) throw new Error(`No SEO entry for route ${path}`);
  return {
    path,
    title: r.title,
    description: r.description,
    breadcrumbs: path === "/" ? undefined : [{ name: "Home", path: "/" }, { name: r.crumb, path }],
  };
}

export function propertySeoInput(p) {
  const path = `/properties/${p.slug}`;
  return {
    path,
    title: p.title,
    description: clip(`${p.title} in ${p.location || "Abuja"}. ${p.description || ""}`),
    image: (p.images && p.images[0]) || p.image,
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Properties", path: "/properties" },
      { name: p.title, path },
    ],
    pageType: "RealEstateListing",
    pageExtra: propertyListing(p, path),
  };
}

export function buildSeo(input) {
  const path = input.path ?? "/";
  const canonical = canonicalFor(path);
  const titleTag = input.fullTitle ?? (path === "/" ? HOME_TITLE : `${input.title} | ${SITE_NAME}`);
  const description = clip(input.description, 160);
  const image = absoluteUrl(input.image);
  const robots = input.noindex ? "noindex,nofollow" : "index,follow,max-image-preview:large";

  const orgId = SITE_URL + "/#organization";
  const siteId = SITE_URL + "/#website";
  const graph = [
    {
      "@type": ["Organization", "RealEstateAgent"],
      "@id": orgId,
      name: SITE_NAME,
      url: SITE_URL + "/",
      logo: SITE_URL + "/apple-touch-icon.png",
      image: absoluteUrl(DEFAULT_IMAGE),
      areaServed: "Abuja, Nigeria",
      address: { "@type": "PostalAddress", addressLocality: "Abuja", addressCountry: "NG" },
    },
    { "@type": "WebSite", "@id": siteId, url: SITE_URL + "/", name: SITE_NAME, publisher: { "@id": orgId } },
  ];

  const page = {
    "@type": input.pageType ?? "WebPage",
    "@id": canonical + "#webpage",
    url: canonical,
    name: titleTag,
    description,
    isPartOf: { "@id": siteId },
  };
  if (!input.noindex) {
    if (input.breadcrumbs && input.breadcrumbs.length) {
      const crumbId = canonical + "#breadcrumb";
      page.breadcrumb = { "@id": crumbId };
      graph.push({
        "@type": "BreadcrumbList",
        "@id": crumbId,
        itemListElement: input.breadcrumbs.map((b, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: b.name,
          item: SITE_URL + (b.path === "/" ? "/" : b.path),
        })),
      });
    }
    graph.push({ ...page, ...(input.pageExtra || {}) });
  }

  return {
    titleTag,
    description,
    canonical,
    image,
    type: input.type ?? "website",
    robots,
    jsonLd: { "@context": "https://schema.org", "@graph": graph },
  };
}

/** Everything that goes in <head>, as data. The browser applies it, the build prints it. */
export function headEntries(seo) {
  const m = (attr, key, content) => ({ attr, key, content });
  return {
    title: seo.titleTag,
    canonical: seo.canonical,
    metas: [
      m("name", "description", seo.description),
      m("name", "robots", seo.robots),
      m("property", "og:site_name", SITE_NAME),
      m("property", "og:locale", "en_NG"),
      m("property", "og:type", seo.type),
      m("property", "og:title", seo.titleTag),
      m("property", "og:description", seo.description),
      m("property", "og:url", seo.canonical),
      m("property", "og:image", seo.image),
      m("name", "twitter:card", "summary_large_image"),
      m("name", "twitter:title", seo.titleTag),
      m("name", "twitter:description", seo.description),
      m("name", "twitter:image", seo.image),
    ],
    jsonLd: JSON.stringify(seo.jsonLd).replace(/</g, "\\u003c"),
  };
}

const escAttr = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escText = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function renderHeadHtml(seo) {
  const e = headEntries(seo);
  return [
    `<title>${escText(e.title)}</title>`,
    ...e.metas.map((x) => `<meta ${x.attr}="${escAttr(x.key)}" content="${escAttr(x.content)}" />`),
    `<link rel="canonical" href="${escAttr(e.canonical)}" />`,
    `<script type="application/ld+json" id="seo-jsonld">${e.jsonLd}</script>`,
  ].join("\n    ");
}

export function sitemapXml(entries, lastmod) {
  const urls = entries
    .map(
      (e) =>
        `  <url>\n    <loc>${escText(canonicalFor(e.path))}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
