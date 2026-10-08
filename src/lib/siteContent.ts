import { useQuery } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import property1 from "@/assets/property-1.jpg";
import property2 from "@/assets/property-2.jpg";
import property3 from "@/assets/property-3.jpg";
import furniture1 from "@/assets/furniture-1.jpg";
import furniture2 from "@/assets/furniture-2.jpg";
import furniture3 from "@/assets/furniture-3.jpg";

export interface SiteProperty { id: string; image: string; title: string; location: string; description: string; price: string; slug: string; hidden?: boolean }
export interface SiteFurniture { id: string; images: string[]; title: string; location: string; description: string; price: string; hidden?: boolean }
export interface SiteJob { id: string; category: "Builds" | "Furniture"; title: string; location: string; description: string; image: string; video?: string; hidden?: boolean }
export type PageKey = "properties" | "furniture" | "jobs" | "updates" | "contact";
export const PAGE_LABELS: Record<PageKey, string> = { properties: "Properties", furniture: "Furniture", jobs: "Previous Jobs", updates: "Project Updates", contact: "Contact" };
/** Pages the team can switch off. true = hidden from the public site. */
export interface PageVisibility { properties: boolean; furniture: boolean; aryaLuxe: boolean }
export const HIDEABLE_LABELS: Record<keyof PageVisibility, string> = { properties: "Properties", furniture: "Furniture", aryaLuxe: "Arya Luxe" };
/** Everything on the Arya Luxe page except the name, location and summary (those live on the project). */
export interface SiteArya {
  about: { title: string; text: string };
  facts: { id: string; label: string; value: string }[];
  highlights: { id: string; title: string; description: string; image?: string }[];
  gallery: { id: string; image: string; caption: string }[];
  /** The apartment types on offer (shown as tabs). features: one per line. */
  units: { id: string; label: string; count: string; size: string; image: string; description: string; features: string }[];
  video: string;
  cta: { title: string; text: string };
}
export const ARYA_LIMITS = { facts: 8, highlights: 16, gallery: 20, units: 4 } as const;
export interface SiteImages { homeFeature: string; about: string; aryaBanner: string }
export const IMAGE_LABELS: Record<keyof SiteImages, string> = { homeFeature: "Home page: Arya Luxe feature photo", about: "About page: photo beside Our story", aryaBanner: "Arya Luxe page: banner photo" };
export interface SiteContent {
  arya: SiteArya;
  images: SiteImages;
  hidden: PageVisibility;
  jobs: SiteJob[];
  hero: { title: string; subtitle: string };
  about: { title: string; description: string };
  contact: { phone: string; email: string; address: string; whatsapp: string };
  properties: SiteProperty[];
  services: { id: string; title: string; description: string }[];
  promise: { id: string; title: string; description: string }[];
  pages: Record<PageKey, { title: string; text: string }>;
  furniture: SiteFurniture[];
}

/** Most items each admin-managed list may hold. Also enforced in firestore.rules. */
export const LIMITS = { properties: 25, furniture: 30, jobs: 15, projects: 20, projectImages: 20 } as const;

/** Phone number in international form for tel: links (08028081047 becomes +2348028081047). */
export const telHref = (n: string) => { const d = (n || "").replace(/[^\d+]/g, ""); return "tel:" + (d.startsWith("0") ? "+234" + d.slice(1) : d); };

export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export const placeholders = { property1, property2, property3, furniture1, furniture2, furniture3 };

const defaults: SiteContent = {
  arya: {
    about: { title: "About the building", text: "Arya Luxe is a private collection of contemporary residences currently under construction in Gwarinpa, Abuja. Stone, dark cladding and planted terraces give the building a calm, modern character, with nine fully furnished smart apartments, private rooftops, a gym, a pool and basement parking designed around everyday comfort. The foundation is complete and the superstructure is now starting, so you can buy into the vision while it rises. Images shown are architectural renders." },
    facts: [
      { id: "f1", label: "Location", value: "Gwarinpa, Abuja" },
      { id: "f2", label: "Status", value: "Off-plan · foundation complete" },
      { id: "f3", label: "Configurations", value: "6 three-bedroom and 3 four-bedroom smart apartments" },
      { id: "f4", label: "Developer", value: "WSL Realty" },
    ],
    highlights: [
      { id: "h1", title: "Fully furnished smart apartments", description: "Every apartment is delivered fully furnished and fully automated.", image: "/arya/dusk-balconies.webp" },
      { id: "h2", title: "Basement parking", description: "Secure parking in the basement level.", image: "/arya/parking-interior.webp" },
      { id: "h3", title: "Concierge", description: "A concierge service for residents and their guests.", image: "/arya/entrance-dusk.webp" },
      { id: "h4", title: "EV charging points", description: "Charging points for electric vehicles.", image: "/arya/parking-lit-lines.webp" },
      { id: "h5", title: "Private rooftop", description: "Each apartment has its own private rooftop.", image: "/arya/rooftop-lounge.webp" },
      { id: "h6", title: "Lift", description: "Lift access to every floor." },
      { id: "h7", title: "External storage", description: "Private storage for each apartment, located in the basement.", image: "/arya/parking-passage.webp" },
      { id: "h8", title: "Concealed AC", description: "Air conditioning is concealed for clean, uninterrupted interiors.", image: "/arya/facade-clean.webp" },
      { id: "h9", title: "15 KVA solar", description: "A 15 KVA solar installation for reliable, efficient power." },
      { id: "h10", title: "30 kW battery", description: "A 30 kW battery system to keep the building powered." },
      { id: "h11", title: "Gym", description: "A residents' gym within the building." },
      { id: "h12", title: "Pool", description: "A swimming pool for residents.", image: "/arya/pool-deck.webp" },
    ],
    gallery: [
      { id: "g1", image: "/arya/front-elevation-day.webp", caption: "Front elevation: clean lines, stone and dark cladding" },
      { id: "g2", image: "/arya/street-golden-hour.webp", caption: "The residences at golden hour" },
      { id: "g3", image: "/arya/night-corner.webp", caption: "Corner view with architectural lighting at dusk" },
      { id: "g4", image: "/arya/rooftop-lounge.webp", caption: "Rooftop lounge and terrace" },
      { id: "g5", image: "/arya/rooftop-walkway.webp", caption: "Landscaped rooftop walkway" },
      { id: "g6", image: "/arya/courtyard-pool.webp", caption: "Private courtyard pool" },
      { id: "g7", image: "/arya/parking-sunset.webp", caption: "Covered parking at sunset" },
      { id: "g8", image: "/arya/parking-interior.webp", caption: "Parking level interior" },
    ],
    units: [
      { id: "u3", label: "3-Bedroom", count: "6 units available", size: "₦320 million per unit", image: "/arya/front-elevation-day.webp", description: "One side of Arya Luxe holds six 3-bedroom smart apartments at ₦320 million per unit, delivered fully furnished.", features: "Fully furnished and fully automated\nPrivate rooftop for your own use\nExternal storage in the basement\nConcealed air conditioning" },
      { id: "u4", label: "4-Bedroom", count: "3 units available", size: "₦400 million per unit", image: "/arya/night-corner.webp", description: "The opposite side holds three 4-bedroom smart apartments at ₦400 million per unit, delivered fully furnished.", features: "Fully furnished and fully automated\nPrivate rooftop for your own use\nExternal storage in the basement\nConcealed air conditioning" },
    ],
    video: "",
    cta: { title: "Register your interest", text: "Units are limited. Speak to our team about pricing and availability." },
  },
  hidden: { properties: false, furniture: true, aryaLuxe: false },
  images: { homeFeature: "/arya/street-golden-hour.webp", about: "/arya/about-dining.webp", aryaBanner: "/arya/banner-night-elevation.webp" },
  pages: {
    properties: { title: "Properties", text: "Explore our available properties." },
    furniture: { title: "Furniture", text: "Bespoke pieces made with the same care as our homes." },
    jobs: { title: "Previous Jobs", text: "A selection of spaces, details and objects from our previous work." },
    updates: { title: "Project Updates", text: "Real progress, documented from the ground up." },
    contact: { title: "Contact Us", text: "For property enquiries, project information or partnerships, our team is ready to help." },
  },
  jobs: [
    { id: "pj1", category: "Furniture", title: "Bespoke bedroom suite", location: "", description: "A fitted bedroom with built-in shelving, custom beds and warm ceiling lighting.", image: "/jobs/bedroom-suite.webp" },
    { id: "pj2", category: "Furniture", title: "Curtains and lounge seating", location: "", description: "Tailored curtains and sofas chosen together to complete the room.", image: "/jobs/curtains-and-seating.webp" },
    { id: "pj3", category: "Furniture", title: "Formal living room", location: "", description: "Statement seating, a carved coffee table and a patterned rug in one composed living space.", image: "/jobs/formal-living-room.webp" },
    { id: "pj4", category: "Furniture", title: "Wardrobe and storage", location: "", description: "Made-to-fit wardrobes and storage with a two-tone finish.", image: "/jobs/wardrobe-and-storage.webp" },
    { id: "pj5", category: "Furniture", title: "Dining room", location: "", description: "A dining set with upholstered chairs against a timber-panelled wall.", image: "/jobs/dining-room.webp" },
    { id: "pj6", category: "Furniture", title: "Family lounge", location: "", description: "A relaxed lounge with deep sofas, layered curtains and soft lighting.", image: "/jobs/family-lounge.webp" },
    { id: "pj7", category: "Furniture", title: "Executive lounge", location: "", description: "Leather and wood armchairs arranged for conversation, with built-in display shelving.", image: "/jobs/executive-lounge.webp" },
    { id: "pj8", category: "Builds", title: "Interior finishing", location: "", description: "A finished room with a recessed tray ceiling, painted walls and a custom steel window grille.", image: "/jobs/interior-finishing.webp" },
    { id: "pj9", category: "Builds", title: "Window and ceiling detail", location: "", description: "A tall feature window with a patterned steel grille beneath a stepped ceiling with recessed spotlights.", image: "/jobs/window-and-ceiling-detail.webp" },
  ],
  hero: { title: "Luxury Homes, Built With You In Mind", subtitle: "We develop considered spaces for living well — from the first line on paper to the final finish." },
  about: { title: "About WSL Realty", description: "WSL Realty is a Nigerian property development company with roots in making. We bring the same discipline, detail and care to every home we deliver." },
  contact: { phone: "08028081047", email: "Warosynergylimited@gmail.com", address: "Abuja, Nigeria", whatsapp: "2348028081047" },
  properties: [
    { id: "1", slug: "arya-luxe", title: "Arya Luxe", location: "Gwarinpa, Abuja", description: "Off-plan 3 and 4-bedroom fully furnished smart apartments. Foundation complete, superstructure starting.", price: "Price on request", image: "/arya/street-golden-hour.webp" },
  ],
  promise: [
    { id: "thought", title: "Thought through", description: "We consider the details others overlook, from the quality behind the walls to the roads, schools, healthcare, security and everyday conveniences around your home." },
    { id: "purpose", title: "Built with purpose", description: "Every space is designed to be beautiful, functional and sustainable, not simply built to be sold." },
    { id: "home", title: "Made to feel at home", description: "Comfort is not an afterthought. From the architecture to the interiors and furnishings, every detail is considered to create a space that feels complete, calm and distinctly yours." },
    { id: "trust", title: "Experience you can trust", description: "Seven years of creating furniture, interiors, remodels and exceptional spaces have taught us what it takes to get the details right. Now, we bring that experience to every property we build." },
    { id: "foundation", title: "From foundation to finish", description: "We bring design, construction, finishing, interiors and furnishing together under one vision, so you don't have to coordinate the pieces yourself." },
  ],
  services: [
    { id: "quality", title: "Quality", description: "No shortcuts on materials or workmanship." },
    { id: "integrity", title: "Integrity", description: "Honest pricing and honest timelines." },
    { id: "design", title: "Design", description: "Considered spaces made for real living." },
  ],
  furniture: [
    { id: "1", title: "Twin Set Bed", location: "Abuja", description: "Handcrafted twin bed set.", price: "₦2,500,000", images: [furniture1] },
    { id: "2", title: "Royalty Dining Set", location: "Abuja", description: "A statement dining set for gatherings.", price: "₦2,500,000", images: [furniture2] },
    { id: "3", title: "Exquisite Luxury Cushions", location: "Abuja", description: "Plush, tailored luxury cushions.", price: "₦2,500,000", images: [furniture3] },
  ],
};

const fallbackImgs = [property1, property2, property3];

/** Code defaults overlaid with whatever the team has saved in the database. */
export async function fetchSiteContent(): Promise<SiteContent> {
  const c = structuredClone(defaults) as unknown as Record<string, unknown>;
  try {
    const snap = await getDocs(collection(db, "content"));
    snap.forEach((d) => {
      const v = d.data().value as unknown;
      if (v == null) return;
      if (Array.isArray(v)) { if (v.length || d.id === "properties" || d.id === "furniture" || d.id === "jobs") c[d.id] = v; }
      else if (d.id === "hidden" && typeof v === "object") c.hidden = { ...(c.hidden as object), ...Object.fromEntries(Object.entries(v).filter(([, x]) => typeof x === "boolean")) };
      else if (typeof v === "object") c[d.id] = { ...(c[d.id] as object), ...Object.fromEntries(Object.entries(v).filter(([, x]) => x)) };
    });
  } catch {
    // Offline or not set up yet: the built-in content is shown.
  }
  // The 320 and 400 on the apartment types are prices in millions of naira, not square metres. Earlier saved text said "m²".
  const units = (c as unknown as SiteContent).arya?.units;
  if (Array.isArray(units)) {
    for (const u of units) {
      const m = /^\s*(\d+)\s*m(?:²|2)\s*$/i.exec(u.size ?? "");
      if (!m) continue;
      u.size = `₦${m[1]} million per unit`;
      u.description = (u.description ?? "").replace(/\bof\s+(\d+)\s*m(?:²|2)\s*each/gi, `at ₦$1 million per unit`);
      u.count = (u.count ?? "").replace(/^\s*(\d+)\s*(?:units?|apartments?)\s*$/i, "$1 units available");
    }
  }
  return c as unknown as SiteContent;
}

export function useSiteContent() {
  const { data } = useQuery({ queryKey: ["site-content"], queryFn: fetchSiteContent, staleTime: 60_000 });
  const content = data ?? defaults;
  const properties = content.properties.filter((p) => !p.hidden).map((p, i) => ({ ...p, slug: p.slug || slugify(p.title || `property-${i + 1}`), image: p.image || fallbackImgs[i % 3] }));
  const furniture = content.furniture.filter((f) => !f.hidden).map((f, i) => ({ ...f, images: f.images?.length ? f.images : [[furniture1, furniture2, furniture3][i % 3]] }));
  const jobs = content.jobs.filter((j) => !j.hidden).map((j, i) => ({ ...j, image: j.image || [property1, furniture1, property2, furniture2][i % 4] }));
  return { ...content, properties, furniture, jobs, loaded: !!data };
}

export const whatsappLink = (num: string, text: string) => `https://wa.me/${num.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
