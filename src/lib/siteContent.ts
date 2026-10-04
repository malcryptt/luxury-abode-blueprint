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
export interface SiteContent {
  hero: { title: string; subtitle: string };
  about: { title: string; description: string };
  contact: { phone: string; email: string; address: string; whatsapp: string };
  properties: SiteProperty[];
  services: { id: string; title: string; description: string }[];
  furniture: SiteFurniture[];
}

export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export const placeholders = { property1, property2, property3, furniture1, furniture2, furniture3 };

const defaults: SiteContent = {
  hero: { title: "Luxury Homes, Built With Craft", subtitle: "We develop considered spaces for living well — from the first line on paper to the final finish." },
  about: { title: "About WSL Realty", description: "WSL Realty is a Nigerian property development company with roots in making. We bring the same discipline, detail and care to every home we deliver." },
  contact: { phone: "08028081047", email: "Warosynergylimited@gmail.com", address: "Abuja, Nigeria", whatsapp: "2348028081047" },
  properties: [
    { id: "1", slug: "arya-luxe", title: "Arya Luxe", location: "Gwarinpa, Abuja", description: "A private collection of contemporary residences currently under construction.", price: "Price on request", image: property1 },
    { id: "2", slug: "4-bedroom-smart-home", title: "4 Bedroom Smart Home", location: "Gwarinpa, Abuja", description: "A fully automated family home with premium finishes throughout.", price: "₦95,000,000", image: property2 },
    { id: "3", slug: "the-palm-residence", title: "The Palm Residence", location: "Jabi, Abuja", description: "A 3-bedroom apartment designed around light and calm.", price: "₦72,000,000", image: property3 },
  ],
  services: [],
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
      if (Array.isArray(v)) { if (v.length || d.id === "properties" || d.id === "furniture") c[d.id] = v; }
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
  return { ...content, properties, furniture };
}

export const whatsappLink = (num: string, text: string) => `https://wa.me/${num.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
