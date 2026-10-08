import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { PageSwitches } from "@/components/admin/PageSwitches";
import { VideoPicker } from "@/components/admin/VideoPicker";
import { MAX_JOB_VIDEOS, videoPoster } from "@/lib/upload";
import { LIMITS, fetchSiteContent, jobMedia, type JobMedia, placeholders, slugify, type SiteFurniture, type SiteJob, type SiteProperty } from "@/lib/siteContent";

type Kind = "properties" | "furniture" | "jobs";
type Item = (SiteProperty & { images?: string[] }) | SiteFurniture | (SiteJob & { price?: string });

const bundled = new Set<string>(Object.values(placeholders));
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Placeholder pictures that ship with the site must not be stored: their file names change with every build. */
const cleanImage = (url: string | undefined) => (!url || bundled.has(url) || url.startsWith("/src/") || url.startsWith("/assets/") ? "" : url);

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="adm-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function ListEditor({ kind, initial }: { kind: Kind; initial: Item[] }) {
  const qc = useQueryClient();
  const isProp = kind === "properties";
  const single = kind !== "furniture"; // one photo per item (furniture can have several)
  const hasPrice = kind !== "jobs";
  const noun = { properties: "property", furniture: "furniture item", jobs: "previous job" }[kind];
  const max = LIMITS[kind];
  const toDraft = (list: Item[]): Item[] => list.map((x) => (kind === "jobs"
    ? { ...x, image: cleanImage((x as SiteJob).image), media: jobMedia({ ...(x as SiteJob), image: cleanImage((x as SiteJob).image) }).filter((m) => m.url) }
    : single
    ? { ...x, image: cleanImage((x as SiteProperty).image) }
    : { ...x, images: ((x as SiteFurniture).images ?? []).map(cleanImage).filter(Boolean) }) as Item);

  const [draft, setDraft] = useState<Item[]>(() => toDraft(initial));
  const [saved, setSaved] = useState<Item[]>(() => toDraft(initial));
  const [busy, setBusy] = useState(false);
  useEffect(() => { const d = toDraft(initial); setDraft(d); setSaved(d); }, [initial]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const videoCount = kind === "jobs" ? draft.reduce((n, x) => n + ((x as SiteJob).media ?? []).filter((m) => m.kind === "video" && m.url).length, 0) : 0;
  const setMedia = (i: number, k: number, m: Partial<JobMedia> | null) => {
    const cur = [...((draft[i] as SiteJob).media ?? [])];
    if (m === null) cur.splice(k, 1); else cur[k] = { ...(cur[k] ?? { kind: "photo", url: "" }), ...m };
    patch(i, { media: cur });
  };

  const patch = (i: number, p: Partial<SiteProperty & SiteFurniture & SiteJob>) => setDraft(draft.map((x, j) => (j === i ? { ...x, ...p } : x)) as Item[]);
  const add = () => setDraft([...draft, (isProp
    ? { id: newId(), slug: "", title: "", location: "", description: "", price: "", image: "" }
    : kind === "jobs"
      ? { id: newId(), category: "Builds", title: "", location: "", description: "", image: "" }
      : { id: newId(), title: "", location: "", description: "", price: "", images: [] }) as Item]);
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= draft.length) return;
    const next = [...draft];
    [next[i], next[j]] = [next[j], next[i]];
    setDraft(next);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const [n, x] of draft.entries()) {
      const label = x.title.trim() || `${noun} ${n + 1}`;
      const photos = kind === "jobs" ? ((x as SiteJob).media ?? []).map((m) => m.url) : single ? [(x as SiteProperty).image] : (x as SiteFurniture).images;
      if (!x.title.trim()) return toast.error(`Give ${noun} ${n + 1} a title, or remove it`);
      if (!x.location.trim()) return toast.error(`"${label}" needs a location`);
      if (hasPrice && !(x as SiteProperty).price?.trim()) return toast.error(`"${label}" needs a price`);
      if (!x.description.trim()) return toast.error(`"${label}" needs a description`);
      if (!x.hidden && !photos.some(Boolean)) return toast.error(`"${label}" needs a photo or video (or hide it until it has one)`);
      if (!single && photos.some((p) => p === "")) return toast.error(`"${label}" has an empty photo slot. Add a photo or remove the slot`);
    }
    const used = new Set<string>();
    const out = draft.map((x) => {
      const item = { ...x, title: x.title.trim() } as Item & { slug?: string; hidden?: boolean };
      if (isProp) {
        const base = slugify((item as SiteProperty).slug || item.title) || "property";
        let s = base, n = 2;
        while (used.has(s)) s = `${base}-${n++}`;
        used.add(s);
        (item as SiteProperty).slug = s;
      }
      if (!item.hidden) delete item.hidden;
      if (kind === "jobs") {
        const j = item as SiteJob;
        const media = (j.media ?? []).filter((m) => m.url).slice(0, 2).map((m) => { const t = m.tag?.trim(); return t ? { ...m, tag: t } : { kind: m.kind, url: m.url }; });
        const first = media.find((m) => m.kind === "photo");
        j.media = media;
        // The cover picture (used for search results and sharing) is the first photo, or a still frame of the first video.
        j.image = first?.url || (media[0] ? videoPoster(media[0].url) : "");
        delete j.video; delete j.videoTag; delete j.imageTag;
      }
      return item;
    });
    setBusy(true);
    try {
      await setDoc(doc(db, "content", kind), { value: out, updated_at: serverTimestamp() });
      setDraft(out); setSaved(out);
      qc.invalidateQueries({ queryKey: ["site-content"] });
      qc.invalidateQueries({ queryKey: ["admin", "listings"] });
      toast.success({ properties: "Properties updated", furniture: "Furniture updated", jobs: "Previous jobs updated" }[kind]);
    } catch {
      toast.error("Could not save. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} noValidate>
      {kind === "jobs" && <datalist id="job-tags">{["Rendered", "Under construction", "Completed", "Site progress", "Before", "After"].map((t) => <option key={t} value={t} />)}</datalist>}
      {draft.length === 0 && <p className="adm-muted">Nothing here yet. Add your first {noun}.</p>}
      {draft.map((x, i) => (
        <div key={x.id} className="adm-panel" style={x.hidden ? { opacity: .7 } : undefined}>
          <h2>{x.title || `New ${noun}`}{x.hidden && <span className="adm-muted"> — hidden from the website</span>}</h2>
          {isProp && (x as SiteProperty).slug && <p className="sub">Page address: /properties/{(x as SiteProperty).slug}</p>}
          <div className="adm-grid two">
            <Field label="Title"><input type="text" maxLength={100} value={x.title} onChange={(e) => patch(i, { title: e.target.value })} /></Field>
            <Field label="Location"><input type="text" maxLength={100} value={x.location} onChange={(e) => patch(i, { location: e.target.value })} /></Field>
            {hasPrice && <Field label="Price" hint='Free text, e.g. "₦95,000,000" or "Price on request"'><input type="text" maxLength={60} value={(x as SiteProperty).price} onChange={(e) => patch(i, { price: e.target.value })} /></Field>}
            {kind === "jobs" && <Field label="Type"><select value={(x as SiteJob).category} onChange={(e) => patch(i, { category: e.target.value as SiteJob["category"] })}><option value="Builds">Build</option><option value="Furniture">Furniture</option></select></Field>}
          </div>
          <div className="adm-grid" style={{ marginTop: 14 }}>
            <Field label="Description"><textarea rows={3} maxLength={1000} value={x.description} onChange={(e) => patch(i, { description: e.target.value })} /></Field>
            {single ? (
              <>
                {kind !== "jobs" && <ImagePicker label="Photo" value={(x as SiteProperty).image} onChange={(url) => patch(i, { image: url })} />}
                {kind === "jobs" && (
                  <>
                    {((x as SiteJob).media?.length ? (x as SiteJob).media! : [{ kind: "photo", url: "" } as JobMedia]).map((m, k) => (
                      <div key={k} className="adm-panel" style={{ margin: 0 }}>
                        <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>{k === 0 ? "First picture or video" : "Second picture or video (shown beside the first)"}</h3>
                        <Field label="Type"><select value={m.kind} onChange={(e) => setMedia(i, k, { kind: e.target.value as JobMedia["kind"], url: "" })}><option value="photo">Photo</option><option value="video">Video</option></select></Field>
                        {m.kind === "video"
                          ? <VideoPicker label="Video" value={m.url} onChange={(url) => setMedia(i, k, { url })}
                              disabled={videoCount >= MAX_JOB_VIDEOS && !m.url} disabledReason={`Previous Jobs can hold ${MAX_JOB_VIDEOS} videos and all ${MAX_JOB_VIDEOS} are used. Remove one to add another.`} />
                          : <ImagePicker label="Photo" value={m.url} onChange={(url) => setMedia(i, k, { url })} />}
                        <Field label="Tag" hint='A small label on the picture, e.g. Rendered, Under construction, Completed'><input type="text" list="job-tags" maxLength={30} value={m.tag ?? ""} onChange={(e) => setMedia(i, k, { tag: e.target.value })} placeholder="Optional" /></Field>
                        {k === 1 && <button type="button" className="adm-btn small ghost" onClick={() => setMedia(i, 1, null)}>Remove the second one</button>}
                      </div>
                    ))}
                    {((x as SiteJob).media?.length ?? 0) < 2 && ((x as SiteJob).media?.length ?? 0) > 0 && (
                      <div><button type="button" className="adm-btn small ghost" onClick={() => setMedia(i, 1, { kind: "photo", url: "" })}><Plus size={14} /> Add a second picture or video</button></div>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                {(x as SiteFurniture).images.map((img, k) => (
                  <ImagePicker key={k} label={`Photo ${k + 1}`} value={img}
                    onChange={(url) => patch(i, { images: url ? (x as SiteFurniture).images.map((m, n) => (n === k ? url : m)) : (x as SiteFurniture).images.filter((_, n) => n !== k) })} />
                ))}
                {(x as SiteFurniture).images.length < 4 && (
                  <div><button type="button" className="adm-btn small ghost" onClick={() => patch(i, { images: [...(x as SiteFurniture).images, ""] })}><Plus size={14} /> Add a photo</button></div>
                )}
              </>
            )}
          </div>
          <div className="adm-actions">
            <button type="button" className="adm-btn small ghost" onClick={() => move(i, -1)} disabled={i === 0}>Move up</button>
            <button type="button" className="adm-btn small ghost" onClick={() => move(i, 1)} disabled={i === draft.length - 1}>Move down</button>
            <button type="button" className="adm-btn small ghost" onClick={() => patch(i, { hidden: !x.hidden })}>
              {x.hidden ? <><Eye size={14} /> Show on website</> : <><EyeOff size={14} /> Hide from website</>}
            </button>
            <button type="button" className="adm-btn small ghost" onClick={() => { if (window.confirm(`Remove "${x.title || noun}"? This takes effect when you save.`)) setDraft(draft.filter((_, j) => j !== i)); }}><Trash2 size={14} /> Remove</button>
          </div>
        </div>
      ))}
      <div className="adm-actions">
        <button type="button" className="adm-btn ghost" onClick={add} disabled={draft.length >= max}><Plus size={16} /> Add a {noun}</button>
        <span className="adm-muted">{draft.length} of {max} used</span>
        <button type="submit" className="adm-btn" disabled={busy || !dirty}><Save size={16} /> {busy ? "Saving…" : "Save changes"}</button>
        {!dirty && !busy && <span className="adm-muted">No changes to save</span>}
      </div>
    </form>
  );
}

export default function Listings() {
  const [tab, setTab] = useState<Kind>("properties");
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["admin", "listings"], queryFn: fetchSiteContent });

  if (isLoading) return <p className="adm-muted">Loading…</p>;
  if (isError || !data)
    return (
      <div className="adm-err" role="alert">
        <span>The listings could not be loaded.</span>
        <button className="adm-btn small" onClick={() => refetch()}>Retry</button>
      </div>
    );

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Listings</h1>
          <p>Add, edit, reorder and hide the properties, furniture and previous jobs shown on the website. Nothing changes publicly until you save.</p>
        </div>
      </div>
      <div className="adm-actions" style={{ marginTop: 0, marginBottom: 18 }} role="tablist">
        <button role="tab" aria-selected={tab === "properties"} className={`adm-btn ${tab === "properties" ? "" : "ghost"}`} onClick={() => setTab("properties")}>Properties</button>
        <button role="tab" aria-selected={tab === "furniture"} className={`adm-btn ${tab === "furniture" ? "" : "ghost"}`} onClick={() => setTab("furniture")}>Furniture</button>
        <button role="tab" aria-selected={tab === "jobs"} className={`adm-btn ${tab === "jobs" ? "" : "ghost"}`} onClick={() => setTab("jobs")}>Previous jobs</button>
      </div>
      {tab !== "jobs" && <PageSwitches only={[tab]} title={`${tab === "properties" ? "Properties" : "Furniture"} page`} />}
      <ListEditor key={tab} kind={tab} initial={data[tab] as Item[]} />
    </>
  );
}
