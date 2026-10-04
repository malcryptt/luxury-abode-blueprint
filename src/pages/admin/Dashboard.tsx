import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { projectIsSetUp, seedProject } from "@/lib/projects";
import { countEnquiries, fetchEnquiryDates, fetchRecentEnquiries, sourceLabel, STATUS_LABEL, timeAgo } from "@/lib/enquiries";
import { useAdmin } from "./context";

const DAYS = 14;
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
export default function Dashboard() {
  const { email } = useAdmin();
  const qc = useQueryClient();
  const [seeding, setSeeding] = useState(false);
  const setup = useQuery({ queryKey: ["admin", "project-setup"], queryFn: () => projectIsSetUp() });
  const runSetup = async () => {
    setSeeding(true);
    try {
      await seedProject();
      toast.success("Arya Luxe project created");
      qc.invalidateQueries({ queryKey: ["admin", "project-setup"] });
      qc.invalidateQueries({ queryKey: ["project"] });
    } catch {
      toast.error("Setup failed. Check that the Firestore rules have been published.");
    } finally {
      setSeeding(false);
    }
  };
  const since = new Date(Date.now() - (DAYS - 1) * 86400000);
  since.setHours(0, 0, 0, 0);

  const counts = useQuery({
    queryKey: ["admin", "counts"],
    queryFn: async () => {
      const [total, fresh, contacted] = await Promise.all([countEnquiries(), countEnquiries("new"), countEnquiries("contacted")]);
      return { total, fresh, contacted };
    },
  });
  const dates = useQuery({ queryKey: ["admin", "dates", dayKey(since)], queryFn: () => fetchEnquiryDates(since.toISOString()) });
  const recent = useQuery({ queryKey: ["admin", "recent"], queryFn: () => fetchRecentEnquiries(5) });

  const buckets = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    return { key: dayKey(d), label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), n: 0 };
  });
  (dates.data ?? []).forEach((iso) => {
    const b = buckets.find((x) => x.key === dayKey(new Date(iso)));
    if (b) b.n += 1;
  });
  const max = Math.max(1, ...buckets.map((b) => b.n));
  const lastWeek = buckets.slice(-7).reduce((s, b) => s + b.n, 0);
  const failed = counts.isError || dates.isError || recent.isError;
  const name = email.split("@")[0];

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Welcome back, {name}</h1>
          <p>Here is what is happening on the WSL Realty website.</p>
        </div>
      </div>

      {setup.data === false && (
        <section className="adm-panel" style={{ borderColor: "var(--a-gold)" }}>
          <h2>Finish setting up</h2>
          <p className="sub">The Arya Luxe project has not been created in the database yet. This adds it with its six build stages and the first two progress updates, so you can start editing them.</p>
          <div className="adm-actions" style={{ marginTop: 0 }}>
            <button className="adm-btn" onClick={runSetup} disabled={seeding}>{seeding ? "Setting up…" : "Set up Arya Luxe"}</button>
          </div>
        </section>
      )}

      {failed && (
        <div className="adm-err" role="alert">
          <span>Some figures could not be loaded. Check your connection and that the Firestore rules have been published.</span>
          <button className="adm-btn small" onClick={() => { counts.refetch(); dates.refetch(); recent.refetch(); }}>Retry</button>
        </div>
      )}

      <div className="adm-stats">
        <Link to="/admin/enquiries" className={`adm-stat${counts.data?.fresh ? " hot" : ""}`}>
          <span>New enquiries</span><strong>{counts.data ? counts.data.fresh : "–"}</strong>
        </Link>
        <Link to="/admin/enquiries" className="adm-stat"><span>Total enquiries</span><strong>{counts.data ? counts.data.total : "–"}</strong></Link>
        <div className="adm-stat"><span>In progress</span><strong>{counts.data ? counts.data.contacted : "–"}</strong></div>
        <div className="adm-stat"><span>Last 7 days</span><strong>{dates.data ? lastWeek : "–"}</strong></div>
      </div>

      <section className="adm-panel">
        <h2>Enquiries, last {DAYS} days</h2>
        <p className="sub">Each bar is one day.</p>
        <div className="adm-bars" role="img" aria-label={`Enquiries per day over the last ${DAYS} days: ${buckets.map((b) => `${b.label} ${b.n}`).join(", ")}`}>
          {buckets.map((b) => (
            <div key={b.key} className={b.n ? "has" : ""} style={{ height: `${Math.max(3, (b.n / max) * 100)}%` }} title={`${b.label}: ${b.n}`} />
          ))}
        </div>
        <div className="adm-bars-x"><span>{buckets[0].label}</span><span>{buckets[buckets.length - 1].label}</span></div>
      </section>

      <section className="adm-panel">
        <h2>Latest enquiries</h2>
        <p className="sub">The five most recent messages from the website.</p>
        {recent.isLoading ? (
          <p className="adm-muted">Loading…</p>
        ) : (recent.data ?? []).length === 0 ? (
          <div className="adm-empty">No enquiries yet. They will appear here as soon as a visitor sends one.</div>
        ) : (
          <div className="enq-list">
            {recent.data!.map((e) => (
              <Link key={e.id} to={`/admin/enquiries?open=${e.id}`} className="enq-row" style={{ textDecoration: "none" }}>
                <div>
                  <div className="l1"><strong>{e.name}</strong><span className={`adm-badge ${e.status}`}>{STATUS_LABEL[e.status]}</span></div>
                  <div className="l2">{sourceLabel(e.source)}{e.message ? ` · ${e.message}` : ""}</div>
                </div>
                <div className="when">{timeAgo(e.created_at)}</div>
              </Link>
            ))}
          </div>
        )}
        <div className="adm-actions"><Link className="adm-btn ghost small" to="/admin/enquiries">Open the inbox</Link></div>
      </section>
    </>
  );
}
