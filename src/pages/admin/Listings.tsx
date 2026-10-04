import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { fetchSiteContent, placeholders, slugify, type SiteFurniture, type SiteProperty } from "@/lib/siteContent";

type Kind = "properties" | "furniture";
type Item = (SiteProperty & { images?: string[] }) | SiteFurniture;

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
  const noun = isProp ? "property" : "furniture item";
  const toDraft = (list: Item[]): Item[] => list.map((x) => (isProp
    ? { ...x, image: cleanImage((x as SiteProperty).image) }
    : { ...x, images: ((x as SiteFurniture).images ?? []).map(cleanImage).filter(Boolean) }) as Item);

  const [draft, setDraft] = useState<Item[]>(() => toDraft(initial));
  const [saved, setSaved] = useState<Item[]>(() => toDraft(initial));
  const [busy, setBusy] = useState(false);
  useEffect(() => { const d = toDraft(initial); setDraft(d); setSaved(d); }, [initial]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const patch = (i: number, p: Partial<SiteProperty & SiteFurniture>) => setDraft(draft.map((x, j) => (j === i ? { ...x, ...p } : x)) as Item[]);
  const add = () => setDraft([...draft, (isProp
    ? { id: newId(), slug: "", title: "", location: "", description: "", price: "", image: "" }
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
    if (draft.some((x) => !x.title.trim())) return toast.error(`Give every ${noun} a title, or remove it`);
    const used = new Set<string>();
    const out = draft.map((x) => {
      const item = { ...x, title: x.title.trim() } as Item & { slug?: string; hidden?: boolean };
      if (isProp) {
        let base = slugify((item as SiteProperty).slug || item.title) || "property";
        let s = base, n = 2;
        while (used.has(s)) s = `${base}-${n++}`;
        used.add(s);
        (item as SiteProperty).slug = s;
      }
      if (!item.hidden) delete item.hidden;
      return item;
    });
    setBusy(true);
    try {
      await setDoc(doc(db, "content", kind), { value: out, updated_at: serverTimestamp() });
      setDraft(out); setSaved(out);
      qc.invalidateQueries({ queryKey: ["site-content"] });
      qc.invalidateQueries({ queryKey: ["admin", "listings"] });
      toast.success(isProp ? "Properties updated" : "Furniture updated");
    } catch {
      toast.error("Could not save. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} noValidate>
      {draft.length === 0 && <p className="adm-muted">Nothing here yet. Add your first {noun}.</p>}
      {draft.map((x, i) => (
        <div key={x.id} className="adm-panel" style={x.hidden ? { opacity: .7 } : undefined}>
          <h2>{x.title || `New ${noun}`}{x.hidden && <span className="adm-muted"> — hidden from the website</span>}</h2>
          {isProp && (x as SiteProperty).slug && <p className="sub">Page address: /properties/{(x as SiteProperty).slug}</p>}
          <div className="adm-grid two">
            <Field label="Title"><input type="text" maxLength={100} value={x.title} onChange={(e) => patch(i, { title: e.target.value })} /></Field>
            <Field label="Location"><input type="text" maxLength={100} value={x.location} onChange={(e) => patch(i, { location: e.target.value })} /></Field>
            <Field label="Price" hint='Free text, e.g. "₦95,000,000" or "Price on request"'><input type="text" maxLength={60} value={x.price} onChange={(e) => patch(i, { price: e.target.value })} /></Field>
          </div>
          <div className="adm-grid" style={{ marginTop: 14 }}>
            <Field label="Description"><textarea rows={3} maxLength={1000} value={x.description} onChange={(e) => patch(i, { description: e.target.value })} /></Field>
            {isProp ? (
              <ImagePicker label="Photo" value={(x as SiteProperty).image} onChange={(url) => patch(i, { image: url })} />
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
        <button type="button" className="adm-btn ghost" onClick={add}><Plus size={16} /> Add {isProp ? "a property" : "a furniture item"}</button>
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
          <p>Add, edit, reorder and hide the properties and furniture shown on the website. Nothing changes publicly until you save.</p>
        </div>
      </div>
      <div className="adm-actions" style={{ marginTop: 0, marginBottom: 18 }} role="tablist">
        <button role="tab" aria-selected={tab === "properties"} className={`adm-btn ${tab === "properties" ? "" : "ghost"}`} onClick={() => setTab("properties")}>Properties</button>
        <button role="tab" aria-selected={tab === "furniture"} className={`adm-btn ${tab === "furniture" ? "" : "ghost"}`} onClick={() => setTab("furniture")}>Furniture</button>
      </div>
      <ListEditor key={tab} kind={tab} initial={(tab === "properties" ? data.properties : data.furniture) as Item[]} />
    </>
  );
}
