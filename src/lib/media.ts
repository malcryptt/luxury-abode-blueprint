import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, type DocumentData } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";

/** The media library: every photo uploaded from the admin, kept so it can be picked again instead of re-uploaded. */
export interface MediaItem { id: string; url: string; name: string; created_at: string }

const col = () => collection(db, "media");

const toIso = (v: unknown): string => {
  const d = (v as { toDate?: () => Date } | null)?.toDate?.();
  return d ? d.toISOString() : "";
};

export async function fetchMedia(): Promise<MediaItem[]> {
  const snap = await getDocs(col());
  return snap.docs
    .map((d) => { const x = d.data() as DocumentData; return { id: d.id, url: String(x.url ?? ""), name: String(x.name ?? ""), created_at: toIso(x.created_at) }; })
    .filter((m) => m.url.startsWith("https://"))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function addMedia(url: string, name: string) {
  await addDoc(col(), { url, name: (name || "Photo").slice(0, 200), created_at: serverTimestamp() });
}

export async function removeMedia(id: string) {
  await deleteDoc(doc(db, "media", id));
}

export function useMedia(enabled = true) {
  return useQuery({ queryKey: ["media"], queryFn: fetchMedia, enabled });
}

/** Uploads one file and files it in the library (the library entry is best-effort: the photo still works if it fails). */
export function useLibraryUpload() {
  const qc = useQueryClient();
  return async (file: File, upload: (f: File) => Promise<string>) => {
    const url = await upload(file);
    try { await addMedia(url, file.name.replace(/\.[^.]+$/, "")); qc.invalidateQueries({ queryKey: ["media"] }); } catch { /* ignore */ }
    return url;
  };
}
