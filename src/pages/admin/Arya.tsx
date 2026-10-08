import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { PageSwitches } from "@/components/admin/PageSwitches";
import { VideoPicker } from "@/components/admin/VideoPicker";
import { ARYA_LIMITS, fetchSiteContent, jobMedia, type SiteArya, type SiteImages } from "@/lib/siteContent";
import { fetchProject, saveProjectDetails } from "@/lib/projects";
import { useSection } from "./useSection";

const SLUG = "arya-luxe";
const ABOUT_MAX = 10000;
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="adm-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

/** The Arya Luxe page is about the building being erected. Progress bars and stages live on Project Updates. */
export default function Arya() {
  const qc = useQueryClient();
  const site = useQuery({ queryKey: ["admin", "site-content"], queryFn: fetchSiteContent });
  const proj = useQuery({ queryKey: ["admin", "project", SLUG, "details"], queryFn: () => fetchProject(SLUG, true) });

  const arya = useSection<SiteArya>("arya", site.data?.arya);
  const images = useSection<SiteImages>("images", site.data?.images);
  const [d, setD] = useState({ name: "", location: "", summary: "" });
  const [dSaved, setDSaved] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!proj.data) return;
    const v = { name: proj.data.project.name, location: proj.data.project.location, summary: proj.data.project.summary };
    setD(v); setDSaved(JSON.stringify(v));
  }, [proj.data]);

  if (site.isLoading || proj.isLoading) return <p className="adm-muted">Loading…</p>;
  if (site.isError || !site.data)
    return <div className="adm-err" role="alert"><span>The page could not be loaded.</span><button className="adm-btn small" onClick={() => site.refetch()}>Retry</button></div>;

  const a = arya.draft;
  const set = (p: Partial<SiteArya>) => arya.setDraft({ ...a, ...p });
  const hasProject = !!proj.data;
  const topDirty = JSON.stringify(d) !== dSaved || images.dirty;
  const jobVideos = site.data.jobs.reduce((n, j) => n + jobMedia(j).filter((m) => m.kind === "video").length, 0);

  const saveTop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasProject) {
      if (!d.name.trim()) return toast.error("Give the building a name");
      if (!d.location.trim()) return toast.error("Give the building a location");
      if (!d.summary.trim()) return toast.error("Write a short summary of the building");
    }
    setBusy(true);
    try {
      if (hasProject && JSON.stringify(d) !== dSaved) {
        const v = { name: d.name.trim(), location: d.location.trim(), summary: d.summary.trim() };
        await saveProjectDetails(SLUG, v);
        setD(v); setDSaved(JSON.stringify(v));
        qc.invalidateQueries({ queryKey: ["project", SLUG] });
        qc.invalidateQueries({ queryKey: ["admin", "project", SLUG] });
      }
      if (images.dirty) await images.save(e, "Top of the page updated");
      else toast.success("Top of the page updated");
    } catch {
      toast.error("Could not save. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const saveContent = (e: React.FormEvent) => {
    if (!a.about.title.trim()) { e.preventDefault(); return toast.error("Give the “about” section a heading"); }
    if (!a.about.text.trim()) { e.preventDefault(); return toast.error("Write something about the building"); }
    if (a.facts.some((f) => !f.label.trim() || !f.value.trim())) { e.preventDefault(); return toast.error("Every key fact needs a label and a value, or remove it"); }
    if (a.highlights.some((h) => !h.title.trim() || !h.description.trim())) { e.preventDefault(); return toast.error("Every feature needs a title and a description, or remove it"); }
    if (a.units.some((u) => !u.label.trim() || !u.description.trim())) { e.preventDefault(); return toast.error("Every apartment type needs a tab name and a description, or remove it"); }
    if (a.gallery.some((g) => !g.image)) { e.preventDefault(); return toast.error("A gallery slot is missing its photo. Add a photo or remove the slot"); }
    if (!a.cta.title.trim() || !a.cta.text.trim()) { e.preventDefault(); return toast.error("The enquiry section needs a heading and some text"); }
    arya.save(e, "Arya Luxe page updated");
  };

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Arya Luxe page</h1>
          <p>The page about the building that is being erected: its photos, description, features and film. Build progress and stages are managed under Projects and appear on the Project Updates page.</p>
        </div>
      </div>

      <PageSwitches only={["aryaLuxe"]} title="Show this page" />

      <form className="adm-panel" onSubmit={saveTop} noValidate>
        <h2>Top of the page</h2>
        <p className="sub">The banner photo, name, location and short summary. The name and summary also appear on the Home page.</p>
        <div className="adm-grid">
          <ImagePicker label="Banner photo" value={images.draft.aryaBanner} onChange={(url) => images.setDraft({ ...images.draft, aryaBanner: url })} />
          {!hasProject && <p className="adm-muted">The project has not been set up yet. Open the Dashboard and press “Set up Arya Luxe” first; then the name, location and summary can be edited here.</p>}
          <div className="adm-grid two">
            <Field label="Name"><input type="text" maxLength={80} disabled={!hasProject} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></Field>
            <Field label="Location"><input type="text" maxLength={100} disabled={!hasProject} value={d.location} onChange={(e) => setD({ ...d, location: e.target.value })} /></Field>
          </div>
          <Field label="Summary" hint={`${d.summary.length} of 600 characters. Shown under the name.`}><textarea rows={3} maxLength={600} disabled={!hasProject} value={d.summary} onChange={(e) => setD({ ...d, summary: e.target.value })} /></Field>
        </div>
        <div className="adm-actions"><button className="adm-btn" disabled={busy || !topDirty}><Save size={16} /> {busy ? "Saving…" : "Save top of the page"}</button>{!topDirty && !busy && <span className="adm-muted">No changes to save</span>}</div>
      </form>

      <form onSubmit={saveContent} noValidate>
        <section className="adm-panel">
          <h2>About the building</h2>
          <p className="sub">A heading and the description. Press Enter to start a new paragraph.</p>
          <div className="adm-grid">
            <Field label="Heading"><input type="text" maxLength={100} value={a.about.title} onChange={(e) => set({ about: { ...a.about, title: e.target.value } })} /></Field>
            <Field label="Description" hint={`${a.about.text.length.toLocaleString()} of ${ABOUT_MAX.toLocaleString()} characters`}><textarea rows={9} maxLength={ABOUT_MAX} value={a.about.text} onChange={(e) => set({ about: { ...a.about, text: e.target.value } })} /></Field>
          </div>
        </section>

        <section className="adm-panel">
          <h2>Key facts</h2>
          <p className="sub">Short labelled details in a strip under the banner, such as “Type: Terrace duplex”. Optional; up to {ARYA_LIMITS.facts}. The strip is hidden when there are none.</p>
          <div className="adm-grid">
            {a.facts.map((f, i) => (
              <div key={f.id} className="adm-grid two" style={{ border: "1px solid var(--a-line)", padding: 14, alignItems: "end" }}>
                <Field label="Label"><input type="text" maxLength={40} value={f.label} onChange={(e) => set({ facts: a.facts.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} /></Field>
                <Field label="Value"><input type="text" maxLength={80} value={f.value} onChange={(e) => set({ facts: a.facts.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })} /></Field>
                <div><button type="button" className="adm-btn small ghost" onClick={() => set({ facts: a.facts.filter((_, j) => j !== i) })}><Trash2 size={14} /> Remove</button></div>
              </div>
            ))}
          </div>
          <div className="adm-actions"><button type="button" className="adm-btn ghost" disabled={a.facts.length >= ARYA_LIMITS.facts} onClick={() => set({ facts: [...a.facts, { id: newId(), label: "", value: "" }] })}><Plus size={16} /> Add a fact</button><span className="adm-muted">{a.facts.length} of {ARYA_LIMITS.facts} used</span></div>
        </section>

        <section className="adm-panel">
          <h2>Features</h2>
          <p className="sub">The things that make the building special, each with a title, a description and an optional photo. Optional; up to {ARYA_LIMITS.highlights}. The section is hidden when there are none.</p>
          <div className="adm-grid">
            {a.highlights.map((h, i) => (
              <div key={h.id} className="adm-grid" style={{ border: "1px solid var(--a-line)", padding: 14 }}>
                <ImagePicker label={`Feature ${i + 1} photo (optional)`} value={h.image || ""} onChange={(url) => set({ highlights: a.highlights.map((x, j) => (j === i ? { ...x, image: url } : x)) })} />
                <Field label={`Feature ${i + 1} title`}><input type="text" maxLength={80} value={h.title} onChange={(e) => set({ highlights: a.highlights.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} /></Field>
                <Field label="Description" hint={`${h.description.length} of 1,000 characters`}><textarea rows={3} maxLength={1000} value={h.description} onChange={(e) => set({ highlights: a.highlights.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)) })} /></Field>
                <div className="adm-actions" style={{ marginTop: 0 }}>
                  <button type="button" className="adm-btn small ghost" disabled={i === 0} onClick={() => { const n = [...a.highlights]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; set({ highlights: n }); }}>Move up</button>
                  <button type="button" className="adm-btn small ghost" disabled={i === a.highlights.length - 1} onClick={() => { const n = [...a.highlights]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; set({ highlights: n }); }}>Move down</button>
                  <button type="button" className="adm-btn small ghost" onClick={() => set({ highlights: a.highlights.filter((_, j) => j !== i) })}><Trash2 size={14} /> Remove</button>
                </div>
              </div>
            ))}
          </div>
          <div className="adm-actions"><button type="button" className="adm-btn ghost" disabled={a.highlights.length >= ARYA_LIMITS.highlights} onClick={() => set({ highlights: [...a.highlights, { id: newId(), title: "", description: "" }] })}><Plus size={16} /> Add a feature</button><span className="adm-muted">{a.highlights.length} of {ARYA_LIMITS.highlights} used</span></div>
        </section>

        <section className="adm-panel">
          <h2>Apartment types</h2>
          <p className="sub">The configurations on offer (for example 3-Bedroom and 4-Bedroom), shown as tabs. Up to {ARYA_LIMITS.units}. Put one feature per line.</p>
          <div className="adm-grid two">
            {a.units.map((u, i) => (
              <div key={u.id} className="adm-grid" style={{ border: "1px solid var(--a-line)", padding: 14, alignContent: "start" }}>
                <ImagePicker label="Photo of this apartment type" value={u.image} onChange={(url) => set({ units: a.units.map((x, j) => (j === i ? { ...x, image: url } : x)) })} />
                <Field label="Tab name"><input type="text" maxLength={40} value={u.label} onChange={(e) => set({ units: a.units.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} /></Field>
                <div className="adm-grid two">
                  <Field label="Units available"><input type="text" maxLength={40} value={u.count} onChange={(e) => set({ units: a.units.map((x, j) => (j === i ? { ...x, count: e.target.value } : x)) })} /></Field>
                  <Field label="Price per unit"><input type="text" maxLength={40} value={u.size} onChange={(e) => set({ units: a.units.map((x, j) => (j === i ? { ...x, size: e.target.value } : x)) })} /></Field>
                </div>
                <Field label="Description"><textarea rows={3} maxLength={600} value={u.description} onChange={(e) => set({ units: a.units.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)) })} /></Field>
                <Field label="Features (one per line)"><textarea rows={5} maxLength={1000} value={u.features} onChange={(e) => set({ units: a.units.map((x, j) => (j === i ? { ...x, features: e.target.value } : x)) })} /></Field>
                <div className="adm-actions" style={{ marginTop: 0 }}><button type="button" className="adm-btn small ghost" onClick={() => set({ units: a.units.filter((_, j) => j !== i) })}><Trash2 size={14} /> Remove</button></div>
              </div>
            ))}
          </div>
          <div className="adm-actions"><button type="button" className="adm-btn ghost" disabled={a.units.length >= ARYA_LIMITS.units} onClick={() => set({ units: [...a.units, { id: newId(), label: "", count: "", size: "", image: "", description: "", features: "" }] })}><Plus size={16} /> Add an apartment type</button><span className="adm-muted">{a.units.length} of {ARYA_LIMITS.units} used</span></div>
        </section>

        <section className="adm-panel">
          <h2>Photo gallery</h2>
          <p className="sub">Photos of the building (renders, plans, the site). Up to {ARYA_LIMITS.gallery}, each with an optional caption. The gallery is hidden when there are none.</p>
          <div className="adm-grid two">
            {a.gallery.map((g, i) => (
              <div key={g.id} className="adm-grid" style={{ border: "1px solid var(--a-line)", padding: 14, alignContent: "start" }}>
                <ImagePicker label={`Photo ${i + 1}`} value={g.image} onChange={(url) => set({ gallery: a.gallery.map((x, j) => (j === i ? { ...x, image: url } : x)) })} />
                <Field label="Caption (optional)"><input type="text" maxLength={200} value={g.caption} onChange={(e) => set({ gallery: a.gallery.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)) })} /></Field>
                <div className="adm-actions" style={{ marginTop: 0 }}>
                  <button type="button" className="adm-btn small ghost" disabled={i === 0} onClick={() => { const n = [...a.gallery]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; set({ gallery: n }); }}>Move up</button>
                  <button type="button" className="adm-btn small ghost" disabled={i === a.gallery.length - 1} onClick={() => { const n = [...a.gallery]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; set({ gallery: n }); }}>Move down</button>
                  <button type="button" className="adm-btn small ghost" onClick={() => set({ gallery: a.gallery.filter((_, j) => j !== i) })}><Trash2 size={14} /> Remove</button>
                </div>
              </div>
            ))}
          </div>
          <div className="adm-actions"><button type="button" className="adm-btn ghost" disabled={a.gallery.length >= ARYA_LIMITS.gallery} onClick={() => set({ gallery: [...a.gallery, { id: newId(), image: "", caption: "" }] })}><Plus size={16} /> Add a photo</button><span className="adm-muted">{a.gallery.length} of {ARYA_LIMITS.gallery} used</span></div>
        </section>

        <section className="adm-panel">
          <h2>Film</h2>
          <p className="sub">An optional short video of the building. It shows as a still picture with a play button and only loads when a visitor presses play, so it does not slow the page down.</p>
          <VideoPicker label="Video" value={a.video} onChange={(url) => set({ video: url })} />
          <small className="adm-muted">Previous Jobs holds up to 6 videos of its own ({jobVideos} used there).</small>
        </section>

        <section className="adm-panel">
          <h2>Enquiry section</h2>
          <p className="sub">The heading and text above the “Register Interest” button at the bottom of the page.</p>
          <div className="adm-grid">
            <Field label="Heading"><input type="text" maxLength={100} value={a.cta.title} onChange={(e) => set({ cta: { ...a.cta, title: e.target.value } })} /></Field>
            <Field label="Text"><textarea rows={2} maxLength={300} value={a.cta.text} onChange={(e) => set({ cta: { ...a.cta, text: e.target.value } })} /></Field>
          </div>
        </section>

        <div className="adm-actions" style={{ marginBottom: 40 }}>
          <button type="submit" className="adm-btn" disabled={arya.busy || !arya.dirty}><Save size={16} /> {arya.busy ? "Saving…" : "Save page content"}</button>
          {!arya.dirty && !arya.busy && <span className="adm-muted">No changes to save</span>}
        </div>
      </form>
    </>
  );
}
