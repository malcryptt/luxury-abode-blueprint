import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";

/** Writes one section. setDoc creates it if it does not exist yet. */
export async function saveSection(section: string, content: unknown) {
  await setDoc(doc(db, "content", section), { value: content, updated_at: serverTimestamp() });
}

/** Shared behaviour for one editable section: local draft, dirty flag, save + refresh the public site cache. */
export function useSection<T>(section: string, initial: T | undefined) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<T | undefined>(initial);
  const [saved, setSaved] = useState<T | undefined>(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setDraft(initial); setSaved(initial); }, [initial]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const save = async (e: React.FormEvent, ok: string) => {
    e.preventDefault();
    if (draft === undefined) return;
    setBusy(true);
    try {
      await saveSection(section, draft);
      setSaved(draft);
      qc.invalidateQueries({ queryKey: ["site-content"] });
      toast.success(ok);
    } catch {
      toast.error("Could not save. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return { draft: (draft ?? initial) as T, setDraft: setDraft as (v: T) => void, dirty, busy, save };
}

