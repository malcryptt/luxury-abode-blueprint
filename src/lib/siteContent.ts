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
export interface SiteJob { id: string; category: "Builds" | "Furniture"; title: string; location: string; description: string; image: string; hidden?: boolean }
export interface SiteContent {
  jobs: SiteJob[];
  hero: { title: string; subtitle: string };
  about: { title: string; description: string };
  contact: { phone: string; email: string; address: string; whatsapp: string };
  properties: SiteProperty[];
  services: { id: string; title: string; description: string }[];
  furniture: SiteFurniture[];
}

/** Most items each admin-managed list may hold. Also enforced in firestore.rules. */
export const LIMITS = { properties: 25, furniture: 30, jobs: 30, projects: 20, projectImages: 20 } as const;

export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export const placeholders = { property1, property2, property3, furniture1, furniture2, furniture3 };

const defaults: SiteContent = {
  jobs: [
    { id: "j1", category: "Builds", title: "Residential build", location: "Abuja", description: "A family home delivered with considered finishes throughout.", image: property1 },
    { id: "j2", category: "Furniture", title: "Bespoke bed set", location: "Abuja", description: "Handcrafted to the client's room and taste.", image: furniture1 },
    { id: "j3", category: "Builds", title: "Contemporary apartment", location: "Abuja", description: "An apartment planned around light and calm.", image: property2 },
    { id: "j4", category: "Furniture", title: "Dining collection", location: "Abuja", description: "A statement dining set made for gatherings.", image: furniture2 },
    { id: "j5", category: "Builds", title: "Private residence", location: "Abuja", description: "A private home built with lasting materials.", image: property3 },
    { id: "j6", category: "Furniture", title: "Luxury soft furnishings", location: "Abuja", description: "Tailored cushions and finishing pieces.", image: furniture3 },
  ],
  hero: { title: "Luxury Homes, Built With Craft", subtitle: "We develop considered spaces for living well — from the first line on paper to the final finish." },
  about: { title: "About WSL Realty", description: "WSL Realty is a Nigerian property development company with roots in making. We bring the same discipline, detail and care to every home we deliver." },
  contact: { phone: "08028081047", email: "Warosynergylimited@gmail.com", address: "Abuja, Nigeria", whatsapp: "2348028081047" },
  properties: [
    { id: "1", slug: "arya-luxe", title: "Arya Luxe", location: "Gwarinpa, Abuja", description: "A private collection of contemporary residences currently under construction.", price: "Price on request", image: property1 },
    { id: "2", slug: "4-bedroom-smart-home", title: "4 Bedroom Smart Home", location: "Gwarinpa, Abuja", description: "A fully automated family home with premium finishes throughout.", price: "₦95,000,000", image: property2 },
    { id: "3", slug: "the-palm-residence", title: "The Palm Residence", location: "Jabi, Abuja", description: "A 3-bedroom apartment designed around light and calm.", price: "₦72,000,000", image: property3 },
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
      else if (typeof v === "object") c[d.id] = { ...(c[d.id] as object), ...Object.fromEntries(Object.entries(v).filter(([, x]) => x)) };
    });
  } catch {
    // Offline or not set up yet: the built-in content is shown.
  }
  return c as unknown as SiteContent;
}

export function useSiteContent() {
  const { data } = useQuery({ queryKey: ["site-content"], queryFn: fetchSiteContent, staleTime: 60_000 });
  const content = data ?? defaults;
  const properties = content.properties.filter((p) => !p.hidden).map((p, i) => ({ ...p, slug: p.slug || slugify(p.title || `property-${i + 1}`), image: p.image || fallbackImgs[i % 3] }));
  const furniture = content.furniture.filter((f) => !f.hidden).map((f, i) => ({ ...f, images: f.images?.length ? f.images : [[furniture1, furniture2, furniture3][i % 3]] }));
  const jobs = content.jobs.filter((j) => !j.hidden).map((j, i) => ({ ...j, image: j.image || [property1, furniture1, property2, furniture2][i % 4] }));
  return { ...content, properties, furniture, jobs };
}

export const whatsappLink = (num: string, text: string) => `https://wa.me/${num.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
