import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usableImage, type ProjectUpdateRow } from "@/lib/db";
import { deleteProjectUpdate, fetchProject, formatDate, overallPercent, saveProjectProgress, saveProjectUpdate } from "@/lib/projects";
import { ImagePicker } from "@/components/admin/ImagePicker";

const SLUG = "arya-luxe";
const KEY = ["admin", "project", SLUG];

interface StageDraft { stage: number; title: string; note: string; image: string; progress: number }
interface UpdateDraft { id?: string; stage: number; title: string; body: string; posted_on: string; published: boolean; images: string[] }

const today = () => new Date().toISOString().slice(0, 10);
const blankUpdate = (stage: number): UpdateDraft => ({ stage, title: "", body: "", posted_on: today(), published: true, images: [] });

export default function Projects() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: KEY, queryFn: () => fetchProject(SLUG, true) });

  const [current, setCurrent] = useState(0);
  const [stages, setStages] = useState<StageDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");
  const [editing, setEditing] = useState<UpdateDraft | null>(null);
  const [savingUpdate, setSavingUpdate] = useState(false);
  const [toDelete, setToDelete] = useState<ProjectUpdateRow | null>(null);

  useEffect(() => {
    if (!data) return;
    const s = data.stages.map((x) => ({ ...x }));
    setCurrent(data.project.current_stage);
    setStages(s);
    setSaved(JSON.stringify([data.project.current_stage, s]));
  }, [data]);

  if (isLoading) return <p className="adm-muted">Loading…</p>;
  if (isError || !data)
    return (
      <div className="adm-err" role="alert">
        <span>{isError ? "The project could not be loaded. Check your connection and that the Firestore rules have been published." : "The Arya Luxe project was not found in the database."}</span>
        <button className="adm-btn small" onClick={() => refetch()}>Retry</button>
      </div>
    );

  const dirty = JSON.stringify([current, stages]) !== saved;
  const effective = stages.map((s) => ({ ...s, progress: s.stage < current ? 100 : s.stage > current ? 0 : s.progress }));
  const percent = overallPercent(current, effective);
  const setStage = (i: number, patch: Partial<StageDraft>) => setStages(stages.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const refresh = () => { qc.invalidateQueries({ queryKey: KEY }); qc.invalidateQueries({ queryKey: ["project", SLUG] }); };

  const saveProgress = async () => {
    setSaving(true);
    try {
      await saveProjectProgress(SLUG, current, effective.map((x) => ({ ...x, title: x.title.trim() || data.stages[x.stage].title, note: x.note.trim() })));
      toast.success("Build progress updated");
      refresh();
    } catch {
      toast.error("Could not save the progress. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const saveUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editing.title.trim()) return toast.error("Give the update a title");
    setSavingUpdate(true);
    try {
      await saveProjectUpdate(SLUG, { stage: editing.stage, title: editing.title.trim(), body: editing.body.trim(), posted_on: editing.posted_on, published: editing.published, images: editing.images }, editing.id);
      toast.success(editing.id ? "Update saved" : "Update posted");
      setEditing(null);
      refresh();
    } catch {
      toast.error("Could not save the update. Please try again.");
    } finally {
      setSavingUpdate(false);
    }
  };

  const removeUpdate = async () => {
    if (!toDelete) return;
    const u = toDelete;
    setToDelete(null);
    try {
      await deleteProjectUpdate(u.id);
      toast.success("Update deleted");
      refresh();
    } catch {
      toast.error("Could not delete the update");
    }
  };

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Projects</h1>
          <p>Show visitors how far {data.project.name} has got. Changes appear on the Home, Arya Luxe and Project Updates pages.</p>
        </div>
      </div>

      <section className="adm-panel">
        <h2>Build progress</h2>
        <p className="sub">Choose the stage the team is working on now and how much of it is done. Earlier stages count as complete.</p>
        <div className="adm-stat" style={{ marginBottom: 18 }}>
          <span>Overall complete</span><strong>{percent}%</strong>
          <div className="adm-meter" aria-hidden="true"><div style={{ width: `${percent}%` }} /></div>
        </div>

        <div className="adm-grid">
          {stages.map((s, i) => {
            const state = i < current ? "Complete" : i === current ? "In progress" : "Not started";
            return (
              <div key={s.stage} className={`stage-card${i === current ? " now" : ""}`}>
                <div className="stage-head">
                  <label className="adm-radio">
                    <input type="radio" name="current-stage" checked={i === current} onChange={() => setCurrent(i)} />
                    <span>Stage {i + 1}: <strong>{s.title}</strong></span>
                  </label>
                  <span className={`adm-badge ${i < current ? "closed" : i === current ? "new" : ""}`}>{state}</span>
                </div>
                {i === current && (
                  <label className="adm-field" style={{ marginTop: 12 }}>
                    <span>Work done on this stage: <strong>{s.progress}%</strong></span>
                    <input type="range" min={0} max={100} step={5} value={s.progress} onChange={(e) => setStage(i, { progress: Number(e.target.value) })} aria-label={`Progress on ${s.title}`} />
                  </label>
                )}
                <div className="adm-grid two" style={{ marginTop: 12 }}>
                  <label className="adm-field"><span>Note shown to visitors</span>
                    <textarea rows={3} maxLength={2000} value={s.note} onChange={(e) => setStage(i, { note: e.target.value })} placeholder="e.g. Block work is up to the second floor." /></label>
                  <ImagePicker label="Photo for this stage" value={s.image} onChange={(url) => setStage(i, { image: url })} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="adm-actions">
          <button className="adm-btn" disabled={saving || !dirty} onClick={saveProgress}><Save size={16} /> {saving ? "Saving…" : "Save progress"}</button>
          {!dirty && !saving && <span className="adm-muted">No changes to save</span>}
        </div>
      </section>

      <section className="adm-panel">
        <div className="adm-head" style={{ marginBottom: 12 }}>
          <div><h2>Progress updates</h2><p className="sub" style={{ margin: 0 }}>The posts shown on the Project Updates page, newest first.</p></div>
          {!editing && <button className="adm-btn" onClick={() => setEditing(blankUpdate(current))}><Plus size={16} /> New update</button>}
        </div>

        {editing && (
          <form onSubmit={saveUpdate} className="adm-grid" style={{ border: "1px solid var(--a-line)", padding: 16, marginBottom: 18, background: "var(--a-paper)" }} noValidate>
            <h3 style={{ fontSize: 16 }}>{editing.id ? "Edit update" : "New update"}</h3>
            <label className="adm-field"><span>Title</span><input type="text" maxLength={150} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></label>
            <label className="adm-field"><span>What happened</span><textarea rows={4} maxLength={5000} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} /></label>
            <div className="adm-grid two">
              <label className="adm-field"><span>Stage</span>
                <select value={editing.stage} onChange={(e) => setEditing({ ...editing, stage: Number(e.target.value) })}>
                  {stages.map((s) => <option key={s.stage} value={s.stage}>{s.title}</option>)}
                </select></label>
              <label className="adm-field"><span>Date</span><input type="date" value={editing.posted_on} onChange={(e) => setEditing({ ...editing, posted_on: e.target.value })} /></label>
            </div>
            <ImagePicker label="Photo" value={editing.images[0] ?? ""} onChange={(url) => setEditing({ ...editing, images: url ? [url] : [] })} />
            <label className="adm-radio"><input type="checkbox" checked={editing.published} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} /> <span>Visible on the website</span></label>
            <div className="adm-actions" style={{ marginTop: 0 }}>
              <button className="adm-btn" disabled={savingUpdate}>{savingUpdate ? "Saving…" : editing.id ? "Save update" : "Post update"}</button>
              <button type="button" className="adm-btn ghost" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        )}

        {data.updates.length === 0 && !editing ? (
          <div className="adm-empty">No updates yet. Post the first one to show visitors what is happening on site.</div>
        ) : (
          <div className="enq-list">
            {data.updates.map((u) => (
              <div key={u.id} className="enq-row" style={{ cursor: "default" }}>
                <div style={{ minWidth: 0 }}>
                  <div className="l1"><strong>{u.title}</strong>{!u.published && <span className="adm-badge">Hidden</span>}</div>
                  <div className="l2">{formatDate(u.posted_on)} · {data.stages[u.stage]?.title}</div>
                </div>
                <div className="adm-actions" style={{ margin: 0 }}>
                  <button className="adm-btn small ghost" aria-label={`Edit ${u.title}`} onClick={() => setEditing({ id: u.id, stage: u.stage, title: u.title, body: u.body, posted_on: u.posted_on, published: u.published, images: u.images ?? [] })}><Pencil size={14} /></button>
                  <button className="adm-btn small ghost" aria-label={`Delete ${u.title}`} onClick={() => setToDelete(u)}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this update?</AlertDialogTitle>
            <AlertDialogDescription>“{toDelete?.title}” will be removed from the website for good.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={removeUpdate}>Yes, delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
