import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { uploadImage } from "@/lib/upload";
import { removeMedia, useLibraryUpload, useMedia } from "@/lib/media";

export default function Media() {
  const media = useMedia();
  const qc = useQueryClient();
  const up = useLibraryUpload();
  const [busy, setBusy] = useState<string>("");
  const [confirm, setConfirm] = useState<string>("");

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    let done = 0;
    for (const [i, f] of files.entries()) {
      setBusy(`Uploading ${i + 1} of ${files.length}…`);
      try { await up(f, uploadImage); done++; } catch (err) { toast.error(`${f.name}: ${(err as Error).message}`); }
    }
    setBusy("");
    if (done) toast.success(done === 1 ? "Photo added to the library" : `${done} photos added to the library`);
  };
  const del = async (id: string) => {
    try { await removeMedia(id); qc.invalidateQueries({ queryKey: ["media"] }); toast.success("Removed from the library"); }
    catch { toast.error("Could not remove it. Please try again."); }
    setConfirm("");
  };
  const copy = async (url: string) => {
    try { await navigator.clipboard.writeText(url); toast.success("Link copied"); } catch { toast.error("Could not copy the link"); }
  };

  return (
    <>
      <div className="adm-head"><div><h1>Media library</h1><p>Every photo you upload is kept here. Pick it again from any photo box with “Choose from library” instead of uploading it twice.</p></div></div>
      <section className="adm-panel">
        <h2>Upload photos</h2>
        <p className="sub">Large photos are shrunk automatically. You can choose several at once.</p>
        <label className="adm-btn" style={{ cursor: busy ? "wait" : "pointer" }}>
          <ImagePlus size={16} /> {busy || "Upload photos"}
          <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,image/gif" onChange={onFiles} disabled={!!busy} className="sr-only" aria-label="Upload photos" />
        </label>
      </section>
      <section className="adm-panel">
        <h2>Your photos{media.data ? ` (${media.data.length})` : ""}</h2>
        <p className="sub">Removing a photo here only tidies the library. Pages already using it keep showing it.</p>
        {media.isLoading && <p className="adm-muted">Loading…</p>}
        {media.isError && <p className="adm-muted">Could not load the library. Check that the Firestore rules have been published.</p>}
        {media.data && !media.data.length && <p className="adm-muted">Nothing here yet. Upload a photo above, or from any photo box in the admin.</p>}
        <div className="media-grid wide">
          {media.data?.map((m) => (
            <figure className="media-card" key={m.id}>
              <img src={m.url} alt="" loading="lazy" />
              <figcaption title={m.name}>{m.name || "Photo"}</figcaption>
              <div className="media-actions">
                <button type="button" className="adm-btn small ghost" onClick={() => copy(m.url)} aria-label={`Copy link for ${m.name}`}><Copy size={14} /> Link</button>
                {confirm === m.id
                  ? <button type="button" className="adm-btn small danger" onClick={() => del(m.id)}>Sure?</button>
                  : <button type="button" className="adm-btn small ghost" onClick={() => setConfirm(m.id)} aria-label={`Remove ${m.name}`}><Trash2 size={14} /></button>}
              </div>
            </figure>
          ))}
        </div>
      </section>
    </>
  );
}
