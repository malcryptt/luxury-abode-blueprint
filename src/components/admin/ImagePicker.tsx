import { useState } from "react";
import { Images, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { usableImage } from "@/lib/db";
import { uploadImage } from "@/lib/upload";
import { useLibraryUpload, useMedia } from "@/lib/media";

/** A grid of everything uploaded before. Picking one calls onPick with its URL. */
export function LibraryGrid({ onPick, selected }: { onPick: (url: string) => void; selected?: string }) {
  const media = useMedia();
  if (media.isLoading) return <p className="adm-muted">Loading your photos…</p>;
  if (media.isError) return <p className="adm-muted">Could not load the library. Check that the Firestore rules have been published.</p>;
  if (!media.data?.length) return <p className="adm-muted">No photos in the library yet. Photos you upload will appear here.</p>;
  return (
    <div className="media-grid" role="list">
      {media.data.map((m) => (
        <button type="button" role="listitem" key={m.id} className={`media-tile${selected === m.url ? " on" : ""}`} onClick={() => onPick(m.url)} title={m.name} aria-label={`Use ${m.name || "photo"}`}>
          <img src={m.url} alt="" loading="lazy" />
        </button>
      ))}
    </div>
  );
}

export function ImagePicker({ value, onChange, label }: { value: string; onChange: (url: string) => void; label: string }) {
  const [busy, setBusy] = useState(false);
  const [library, setLibrary] = useState(false);
  const up = useLibraryUpload();
  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try { onChange(await up(file, uploadImage)); setLibrary(false); } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="adm-field">
      <span>{label}</span>
      {usableImage(value) && <img src={value} alt="" style={{ width: "100%", maxWidth: 260, height: 150, objectFit: "cover", border: "1px solid var(--a-line)" }} />}
      <div className="adm-actions" style={{ marginTop: 0 }}>
        <label className="adm-btn small ghost" style={{ cursor: busy ? "wait" : "pointer" }}>
          <ImagePlus size={15} /> {busy ? "Uploading…" : value ? "Replace photo" : "Add photo"}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" onChange={pick} disabled={busy} className="sr-only" aria-label={label} />
        </label>
        <button type="button" className="adm-btn small ghost" onClick={() => setLibrary((o) => !o)} aria-expanded={library}>
          {library ? <X size={15} /> : <Images size={15} />} {library ? "Close library" : "Choose from library"}
        </button>
        {value && <button type="button" className="adm-btn small ghost" onClick={() => onChange("")}>Remove</button>}
      </div>
      {library && <div className="media-pop"><LibraryGrid selected={value} onPick={(url) => { onChange(url); setLibrary(false); }} /></div>}
    </div>
  );
}
