// Row shapes shared by the public site and the admin. Data lives in Firestore (see firestore.rules).

export type PropertyStatus = "available" | "under_construction" | "sold";

export interface PropertyRow {
  id: string;
  slug: string;
  title: string;
  location: string;
  description: string;
  price: string;
  status: PropertyStatus;
  bedrooms: number | null;
  bathrooms: number | null;
  size_sqm: number | null;
  images: string[];
  featured: boolean;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FurnitureRow {
  id: string;
  title: string;
  location: string;
  description: string;
  price: string;
  in_stock: boolean;
  images: string[];
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface JobRow {
  id: string;
  image: string;
  caption: string;
  category: "Builds" | "Furniture";
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectRow {
  slug: string;
  name: string;
  location: string;
  summary: string;
  current_stage: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectStageRow {
  project_slug: string;
  stage: number;
  title: string;
  note: string;
  image: string;
  progress: number;
  updated_at: string;
}

export interface ProjectUpdateRow {
  id: string;
  project_slug: string;
  stage: number;
  title: string;
  body: string;
  images: string[];
  posted_on: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export type EnquiryStatus = "new" | "contacted" | "closed";

export interface EnquiryRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  interest: string | null;
  message: string | null;
  source: string;
  status: EnquiryStatus;
  notes: string | null;
  handled_by: string | null;
  user_id: string | null;
  seen_at: string | null;
  seen_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaRow {
  id: string;
  path: string;
  url: string;
  name: string;
  mime: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export const PROPERTY_STATUS_LABEL: Record<PropertyStatus, string> = {
  available: "Available",
  under_construction: "Under construction",
  sold: "Sold",
};

export const slugifyText = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Images saved as dev paths (e.g. "/src/assets/...") never resolve in production. */
export const usableImage = (src?: string | null) => !!src && !src.startsWith("/src/");
