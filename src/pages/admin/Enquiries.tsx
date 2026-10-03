import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Mail, MessageCircle, Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { EnquiryRow, EnquiryStatus } from "@/lib/db";
import {
  deleteEnquiry, enquiriesToCsv, fetchEnquiries, FETCH_LIMIT, sourceLabel, STATUS_LABEL, timeAgo, toWhatsAppNumber, updateEnquiry,
} from "@/lib/enquiries";
import { useAdmin } from "./context";

type Filter = "all" | EnquiryStatus;
const FILTERS: Filter[] = ["all", "new", "contacted", "closed"];
const KEY = ["admin", "enquiries"];

export default function Enquiries() {
  const { userId, role, refreshNewCount } = useAdmin();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: KEY, queryFn: () => fetchEnquiries() });
  const rows = useMemo(() => data?.rows ?? [], [data]);
  const openId = params.get("open");
  const current = rows.find((r) => r.id === openId) ?? null;

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (filter === "all" || r.status === filter) &&
        (!q || [r.name, r.phone, r.email, r.message, r.interest, sourceLabel(r.source)].some((v) => (v ?? "").toLowerCase().includes(q))),
    );
  }, [rows, filter, search]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: rows.length, new: 0, contacted: 0, closed: 0 };
    rows.forEach((r) => { c[r.status] += 1; });
    return c;
  }, [rows]);

  const open = (r: EnquiryRow) => {
    setNotes(r.notes ?? "");
    setParams({ open: r.id }, { replace: true });
  };
  const close = () => setParams({}, { replace: true });

  // When arriving from the dashboard link, load the notes once the row is there.
  const [seeded, setSeeded] = useState<string | null>(null);
  if (current && seeded !== current.id) {
    setSeeded(current.id);
    setNotes(current.notes ?? "");
  }

  const patchLocal = (id: string, patch: Partial<EnquiryRow>) =>
    qc.setQueryData(KEY, (old: { rows: EnquiryRow[]; total: number } | undefined) =>
      old ? { ...old, rows: old.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) } : old);

  const changeStatus = async (r: EnquiryRow, status: EnquiryStatus) => {
    try {
      await updateEnquiry(r.id, { status }, userId);
      patchLocal(r.id, { status, handled_by: userId });
      refreshNewCount();
      qc.invalidateQueries({ queryKey: ["admin", "counts"] });
      toast.success(`Marked as ${STATUS_LABEL[status].toLowerCase()}`);
    } catch {
      toast.error("Could not update the status");
    }
  };

  const saveNotes = async (r: EnquiryRow) => {
    setSaving(true);
    try {
      const value = notes.trim() || null;
      await updateEnquiry(r.id, { notes: value }, userId);
      patchLocal(r.id, { notes: value, handled_by: userId });
      toast.success("Notes saved");
    } catch {
      toast.error("Could not save the notes");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r: EnquiryRow) => {
    setConfirmDelete(false);
    try {
      await deleteEnquiry(r.id);
      qc.setQueryData(KEY, (old: { rows: EnquiryRow[]; total: number } | undefined) =>
        old ? { total: Math.max(0, old.total - 1), rows: old.rows.filter((x) => x.id !== r.id) } : old);
      close();
      refreshNewCount();
      qc.invalidateQueries({ queryKey: ["admin", "counts"] });
      toast.success("Enquiry deleted");
    } catch {
      toast.error("Could not delete the enquiry");
    }
  };

  const exportCsv = () => {
    const blob = new Blob([enquiriesToCsv(shown)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wsl-realty-enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Enquiries</h1>
          <p>Everyone who has reached out through the website, newest first.</p>
        </div>
        <button className="adm-btn ghost" onClick={exportCsv} disabled={shown.length === 0}><Download size={16} /> Export {shown.length} to CSV</button>
      </div>

      {isError && (
        <div className="adm-err" role="alert">
          <span>Enquiries could not be loaded. Check your connection and that the database updates have been applied.</span>
          <button className="adm-btn small" onClick={() => refetch()}>Retry</button>
        </div>
      )}

      <div className="adm-tabs" role="tablist" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button key={f} role="tab" aria-selected={filter === f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : STATUS_LABEL[f]} ({counts[f]})
          </button>
        ))}
      </div>
      <div className="adm-tools">
        <input className="grow" type="search" placeholder="Search name, phone, message…" aria-label="Search enquiries" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <p className="adm-muted">Loading…</p>
      ) : shown.length === 0 ? (
        <div className="adm-empty">{rows.length === 0 ? "No enquiries yet. They will appear here as soon as a visitor sends one." : "No enquiries match this filter."}</div>
      ) : (
        <div className="enq-list">
          {shown.map((r) => (
            <button key={r.id} type="button" className={`enq-row${r.status === "new" ? " unread" : ""}`} onClick={() => open(r)}>
              <div style={{ minWidth: 0 }}>
                <div className="l1"><strong>{r.name}</strong><span className={`adm-badge ${r.status}`}>{STATUS_LABEL[r.status]}</span></div>
                <div className="l2">{r.phone} · {sourceLabel(r.source)}{r.message ? ` · ${r.message}` : ""}</div>
              </div>
              <div className="when">{timeAgo(r.created_at)}</div>
            </button>
          ))}
        </div>
      )}
      {data && data.total > FETCH_LIMIT && (
        <p className="adm-muted" style={{ marginTop: 12 }}>Showing the latest {FETCH_LIMIT} of {data.total} enquiries.</p>
      )}

      <Dialog open={!!current} onOpenChange={(o) => !o && close()}>
        <DialogContent className="adm adm-dialog" style={{ minHeight: 0 }}>
          {current && (
            <div className="enq-detail">
              <DialogHeader>
                <DialogTitle>{current.name}</DialogTitle>
                <DialogDescription>Received {new Date(current.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</DialogDescription>
              </DialogHeader>
              <dl style={{ marginTop: 16 }}>
                <dt>Phone</dt><dd>{current.phone}</dd>
                {current.email && (<><dt>Email</dt><dd>{current.email}</dd></>)}
                <dt>About</dt><dd>{current.interest || sourceLabel(current.source)}</dd>
                <dt>From</dt><dd>{sourceLabel(current.source)}</dd>
              </dl>
              {current.message && <div className="enq-msg">{current.message}</div>}

              <div className="adm-actions" style={{ marginTop: 0, marginBottom: 20 }}>
                <a className="adm-btn small" href={`tel:${current.phone}`}><Phone size={15} /> Call</a>
                <a className="adm-btn small ghost" href={`https://wa.me/${toWhatsAppNumber(current.phone)}`} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a>
                {current.email && <a className="adm-btn small ghost" href={`mailto:${current.email}`}><Mail size={15} /> Email</a>}
              </div>

              <label className="adm-field" style={{ marginBottom: 14 }}>
                <span>Status</span>
                <select value={current.status} onChange={(e) => changeStatus(current, e.target.value as EnquiryStatus)}>
                  {(Object.keys(STATUS_LABEL) as EnquiryStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </label>
              <label className="adm-field">
                <span>Team notes</span>
                <textarea rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Only your team can see this." />
              </label>
              <div className="adm-actions">
                <button className="adm-btn small" disabled={saving || notes.trim() === (current.notes ?? "")} onClick={() => saveNotes(current)}>{saving ? "Saving…" : "Save notes"}</button>
                {role === "admin" && (
                  <button className="adm-btn small ghost" style={{ marginLeft: "auto", color: "#a3342c" }} onClick={() => setConfirmDelete(true)}><Trash2 size={15} /> Delete</button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this enquiry?</AlertDialogTitle>
            <AlertDialogDescription>{current?.name}'s enquiry will be removed for good. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => current && remove(current)}>Yes, delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
