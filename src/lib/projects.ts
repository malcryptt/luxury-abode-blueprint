import { useQuery } from "@tanstack/react-query";
import { db, usableImage, type ProjectRow, type ProjectStageRow, type ProjectUpdateRow } from "@/lib/db";

export const STAGE_COUNT = 6;
export const DEFAULT_STAGE_TITLES = ["Foundation", "Block Work", "Ceiling", "Windows", "Finishing", "Handover"];

export interface ProjectData {
  project: Pick<ProjectRow, "slug" | "name" | "location" | "summary" | "current_stage">;
  stages: Pick<ProjectStageRow, "stage" | "title" | "note" | "image" | "progress">[];
  updates: ProjectUpdateRow[];
  percent: number;
}

/** Overall completion: finished stages count in full, the current stage by its own progress. */
export function overallPercent(current: number, stages: { stage: number; progress: number }[]): number {
  const cur = stages.find((s) => s.stage === current)?.progress ?? 0;
  return Math.max(0, Math.min(100, Math.round((current * 100 + cur) / STAGE_COUNT)));
}

const FALLBACK: ProjectData = {
  project: { slug: "arya-luxe", name: "Arya Luxe", location: "Gwarinpa, Abuja", summary: "A private collection of contemporary residences, built with clarity, quality and a long view.", current_stage: 1 },
  stages: DEFAULT_STAGE_TITLES.map((title, stage) => ({ stage, title, note: "", image: "", progress: stage < 1 ? 100 : 0 })),
  updates: [],
  percent: overallPercent(1, DEFAULT_STAGE_TITLES.map((_, stage) => ({ stage, progress: stage < 1 ? 100 : 0 }))),
};

/** Loads a project with all six stages filled in. includeDrafts is for the admin editor. */
export async function fetchProject(slug: string, includeDrafts = false): Promise<ProjectData | null> {
  const [p, s, u] = await Promise.all([
    db.from("projects").select("*").eq("slug", slug).maybeSingle(),
    db.from("project_stages").select("*").eq("project_slug", slug).order("stage"),
    db.from("project_updates").select("*").eq("project_slug", slug).order("posted_on", { ascending: false }).order("created_at", { ascending: false }),
  ]);
  if (p.error || s.error || u.error) throw p.error ?? s.error ?? u.error;
  if (!p.data) return null;
  const rows = (s.data ?? []) as ProjectStageRow[];
  const stages = DEFAULT_STAGE_TITLES.map((def, stage) => {
    const r = rows.find((x) => x.stage === stage);
    return { stage, title: r?.title || def, note: r?.note ?? "", image: r?.image ?? "", progress: r?.progress ?? 0 };
  });
  const project = p.data as ProjectRow;
  const updates = ((u.data ?? []) as ProjectUpdateRow[]).filter((x) => includeDrafts || x.published);
  return { project, stages, updates, percent: overallPercent(project.current_stage, stages) };
}

/** Public hook: falls back to a sensible default so the pages never render empty if the database is unreachable. */
export function useProject(slug: string) {
  const q = useQuery({ queryKey: ["project", slug], queryFn: () => fetchProject(slug), staleTime: 60_000 });
  return { data: q.data ?? FALLBACK, loaded: !!q.data };
}

export const stageImage = (src: string | undefined, fallback: string) => (usableImage(src) ? (src as string) : fallback);

export const formatDate = (iso: string) => new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
