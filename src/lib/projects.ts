import { useQuery } from "@tanstack/react-query";
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where, writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { usableImage, type ProjectUpdateRow } from "@/lib/db";

export const STAGE_COUNT = 6;
export const MAX_GALLERY = 20; // photos on the Arya Luxe page (also enforced in firestore.rules)
export const MAX_UPDATES = 20; // posts on the Project Updates page
export const DEFAULT_STAGE_TITLES = ["Foundation", "Block Work", "Ceiling", "Windows", "Finishing", "Handover"];

export interface StageData { stage: number; title: string; note: string; image: string; progress: number }

export interface GalleryItem { id: string; image: string; title: string; description: string; stage: number; level: number; taken_on: string }

export interface ProjectData {
  gallery: GalleryItem[];
  project: { slug: string; name: string; location: string; summary: string; current_stage: number };
  stages: StageData[];
  updates: ProjectUpdateRow[];
  percent: number;
}

/** Overall completion: finished stages count in full, the current stage by its own progress. */
export function overallPercent(current: number, stages: { stage: number; progress: number }[]): number {
  const cur = stages.find((s) => s.stage === current)?.progress ?? 0;
  return Math.max(0, Math.min(100, Math.round((current * 100 + cur) / STAGE_COUNT)));
}

const DEFAULT_PROJECT = { slug: "arya-luxe", name: "Arya Luxe", location: "Gwarinpa, Abuja", summary: "A private collection of contemporary residences, built with clarity, quality and a long view.", current_stage: 1 };
const defaultStages = (): StageData[] => DEFAULT_STAGE_TITLES.map((title, stage) => ({ stage, title, note: "", image: "", progress: stage < 1 ? 100 : 0 }));

const FALLBACK: ProjectData = {
  gallery: [],
  project: DEFAULT_PROJECT,
  stages: defaultStages(),
  updates: [],
  percent: overallPercent(1, defaultStages()),
};

const projectRef = (slug: string) => doc(db, "projects", slug);
const updatesCol = () => collection(db, "projectUpdates");

const toUpdate = (id: string, x: DocumentData): ProjectUpdateRow => {
  const created = x.created_at?.toDate?.().toISOString() ?? new Date().toISOString();
  return {
    id, project_slug: x.project_slug, stage: x.stage ?? 0, title: x.title ?? "", body: x.body ?? "", images: x.images ?? [],
    posted_on: x.posted_on ?? created.slice(0, 10), published: x.published !== false, created_at: created, updated_at: created,
  };
};

/** Loads a project with all six stages filled in. includeDrafts is for the admin editor. */
export async function fetchProject(slug: string, includeDrafts = false): Promise<ProjectData | null> {
  const snap = await getDoc(projectRef(slug));
  if (!snap.exists()) return null;
  const x = snap.data();
  // Public pages must ask only for published updates, because the security rules do not filter for them.
  const uq = includeDrafts
    ? query(updatesCol(), where("project_slug", "==", slug))
    : query(updatesCol(), where("project_slug", "==", slug), where("published", "==", true));
  const us = await getDocs(uq);
  const saved: Partial<StageData>[] = Array.isArray(x.stages) ? x.stages : [];
  const stages = DEFAULT_STAGE_TITLES.map((def, stage) => {
    const r = saved.find((s) => s.stage === stage);
    return { stage, title: r?.title || def, note: r?.note ?? "", image: r?.image ?? "", progress: r?.progress ?? 0 };
  });
  const project = { slug, name: x.name ?? DEFAULT_PROJECT.name, location: x.location ?? "", summary: x.summary ?? "", current_stage: Math.min(STAGE_COUNT - 1, Math.max(0, x.current_stage ?? 0)) };
  const updates = us.docs
    .map((d) => toUpdate(d.id, d.data()))
    .sort((a, b) => (b.posted_on.localeCompare(a.posted_on)) || b.created_at.localeCompare(a.created_at));
  const gallery: GalleryItem[] = (Array.isArray(x.gallery) ? x.gallery : []).map((g: Partial<GalleryItem>, i: number) => ({
    id: g.id || `g${i}`, image: g.image ?? "", title: g.title ?? "", description: g.description ?? "",
    stage: Math.min(STAGE_COUNT - 1, Math.max(0, g.stage ?? 0)), level: Math.min(100, Math.max(0, g.level ?? 0)), taken_on: g.taken_on ?? "",
  }));
  return { project, stages, updates, gallery, percent: overallPercent(project.current_stage, stages) };
}

/** Public hook: falls back to a sensible default so the pages never render empty if the database is unreachable. */
export function useProject(slug: string) {
  const q = useQuery({ queryKey: ["project", slug], queryFn: () => fetchProject(slug).catch(() => null), staleTime: 60_000 });
  return { data: q.data ?? FALLBACK, loaded: !!q.data };
}

export const stageImage = (src: string | undefined, fallback: string) => (usableImage(src) ? (src as string) : fallback);

export const formatDate = (iso: string) => new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

/* ---------------------------- admin writes ---------------------------- */

export async function saveProjectProgress(slug: string, current: number, stages: StageData[]): Promise<void> {
  await updateDoc(projectRef(slug), {
    current_stage: current,
    stages: stages.map((s) => ({ stage: s.stage, title: s.title, note: s.note, image: s.image, progress: s.progress })),
    updated_at: serverTimestamp(),
  });
}

export async function saveProjectGallery(slug: string, gallery: GalleryItem[]): Promise<void> {
  if (gallery.length > MAX_GALLERY) throw new Error("too many photos");
  await updateDoc(projectRef(slug), { gallery, updated_at: serverTimestamp() });
}

export async function saveProjectDetails(slug: string, d: { name: string; location: string; summary: string }): Promise<void> {
  await updateDoc(projectRef(slug), { name: d.name, location: d.location, summary: d.summary, updated_at: serverTimestamp() });
}

export interface UpdateInput { stage: number; title: string; body: string; posted_on: string; published: boolean; images: string[] }

export async function saveProjectUpdate(slug: string, input: UpdateInput, id?: string): Promise<void> {
  if (id) await updateDoc(doc(db, "projectUpdates", id), { ...input, updated_at: serverTimestamp() });
  else await addDoc(updatesCol(), { ...input, project_slug: slug, created_at: serverTimestamp() });
}

export async function deleteProjectUpdate(id: string): Promise<void> {
  await deleteDoc(doc(db, "projectUpdates", id));
}

/** One-time setup: creates the Arya Luxe project and its first two updates if they are missing. */
export async function projectIsSetUp(slug = "arya-luxe"): Promise<boolean> {
  return (await getDoc(projectRef(slug))).exists();
}

export async function seedProject(): Promise<void> {
  const slug = "arya-luxe";
  if (await projectIsSetUp(slug)) return;
  const batch = writeBatch(db);
  batch.set(projectRef(slug), { ...DEFAULT_PROJECT, slug: undefined, stages: defaultStages(), gallery: [], created_at: serverTimestamp(), updated_at: serverTimestamp() });
  const mk = (id: string, stage: number, title: string, body: string, posted_on: string) =>
    batch.set(doc(db, "projectUpdates", id), { project_slug: slug, stage, title, body, images: [], posted_on, published: true, created_at: serverTimestamp() });
  mk("seed-block-work", 1, "Block work completed through level 2", "Block work completed through level 2. The structure is taking shape with clean lines and generous light.", "2025-09-14");
  mk("seed-foundation", 0, "Foundation completed and inspected", "Foundation completed and inspected. Ground works signed off ahead of schedule.", "2025-07-20");
  await batch.commit();
}

