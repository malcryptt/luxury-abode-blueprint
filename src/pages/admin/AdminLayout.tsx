import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { Building2, ExternalLink, FileText, Hammer, Inbox, LayoutDashboard, LogOut, Menu, Users, X } from "lucide-react";
import { onAuthStateChanged, signOut as fbSignOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/integrations/firebase/client";
import { countEnquiries } from "@/lib/enquiries";
import { useNoIndex } from "@/components/site/Seo";
import type { AdminContext, StaffRole } from "./context";
import "./admin.css";

type State =
  | { phase: "loading" }
  | { phase: "signed-out" }
  | { phase: "denied"; email: string }
  | { phase: "error" }
  | { phase: "ready"; ctx: Omit<AdminContext, "refreshNewCount"> };

/** The private admin area: checks the visitor is signed-in staff, then shows the sidebar and the page. */
export default function AdminLayout() {
  useNoIndex("Admin");
  const navigate = useNavigate();
  const [state, setState] = useState<State>({ phase: "loading" });
  const [open, setOpen] = useState(false);
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    let alive = true;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return alive && setState({ phase: "signed-out" });
      try {
        const snap = await getDoc(doc(db, "staff", user.uid));
        if (!alive) return;
        const role = snap.exists() ? snap.data().role : null;
        if (role !== "admin" && role !== "editor") return setState({ phase: "denied", email: user.email ?? "" });
        setState({ phase: "ready", ctx: { userId: user.uid, email: user.email ?? "", role: role as StaffRole } });
      } catch {
        if (alive) setState({ phase: "error" });
      }
    });
    return () => { alive = false; unsub(); };
  }, []);

  const refreshNewCount = useCallback(() => {
    countEnquiries("new").then(setNewCount).catch(() => {});
  }, []);

  useEffect(() => {
    if (state.phase === "ready") refreshNewCount();
  }, [state.phase, refreshNewCount]);

  const signOut = async () => {
    await fbSignOut(auth);
    navigate("/auth");
  };

  if (state.phase === "loading") return <div className="adm"><div className="adm-spin" role="status">Loading…</div></div>;
  if (state.phase === "signed-out") return <Navigate to="/auth" replace />;
  if (state.phase === "error")
    return (
      <div className="adm"><div className="adm-denied">
        <h1>We could not check your access</h1>
        <p className="adm-muted">Please check your connection and try again.</p>
        <div className="adm-actions" style={{ justifyContent: "center" }}>
          <button className="adm-btn" onClick={() => window.location.reload()}>Try again</button>
        </div>
      </div></div>
    );
  if (state.phase === "denied")
    return (
      <div className="adm"><div className="adm-denied">
        <h1>No access</h1>
        <p className="adm-muted">{state.email} is signed in, but this account is not part of the WSL Realty team. Ask an admin to add you.</p>
        <div className="adm-actions" style={{ justifyContent: "center" }}>
          <button className="adm-btn" onClick={signOut}>Sign out</button>
          <Link className="adm-btn ghost" to="/">Back to website</Link>
        </div>
      </div></div>
    );

  const { ctx } = state;
  const links = [
    { to: "/admin", end: true, label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/enquiries", end: false, label: "Enquiries", icon: Inbox, count: newCount },
    { to: "/admin/listings", end: false, label: "Listings", icon: Building2 },
    { to: "/admin/projects", end: false, label: "Projects", icon: Hammer },
    { to: "/admin/content", end: false, label: "Page text", icon: FileText },
    ...(ctx.role === "admin" ? [{ to: "/admin/team", end: false, label: "Team", icon: Users }] : []),
  ];

  return (
    <div className="adm">
      <div className="adm-top">
        <strong style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontWeight: 400 }}>WSL <b style={{ fontWeight: 400, color: "#e7d1aa" }}>Admin</b></strong>
        <button type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      <div className="adm-shell">
        <aside className={`adm-side${open ? " open" : ""}`}>
          <div className="adm-brand">WSL <b>REALTY</b></div>
          <div className="adm-tag">Admin</div>
          <nav className="adm-nav" aria-label="Admin">
            {links.map(({ to, end, label, icon: Icon, count }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? "active" : "")} onClick={() => setOpen(false)}>
                <Icon size={18} aria-hidden="true" /> {label}
                {count ? <span className="count" aria-label={`${count} new`}>{count}</span> : null}
              </NavLink>
            ))}
          </nav>
          <div className="adm-side-foot">
            <div><div className="who">{ctx.email}</div><div className="role">{ctx.role}</div></div>
            <Link to="/" target="_blank" rel="noreferrer"><ExternalLink size={15} /> View website</Link>
            <button type="button" onClick={signOut}><LogOut size={15} /> Sign out</button>
          </div>
        </aside>
        <main className="adm-main">
          <Outlet context={{ ...ctx, refreshNewCount } satisfies AdminContext} />
        </main>
      </div>
    </div>
  );
}
