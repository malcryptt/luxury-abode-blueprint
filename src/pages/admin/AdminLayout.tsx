import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { ExternalLink, FileText, Inbox, LayoutDashboard, LogOut, Menu, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";
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
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!alive) return;
      if (!session?.user) return setState({ phase: "signed-out" });
      const { data, error } = await db.from("user_roles").select("role").eq("user_id", session.user.id);
      if (!alive) return;
      if (error) return setState({ phase: "error" });
      const roles = ((data ?? []) as { role: string }[]).map((r) => r.role);
      const role: StaffRole | null = roles.includes("admin") ? "admin" : roles.includes("editor") ? "editor" : null;
      if (!role) return setState({ phase: "denied", email: session.user.email ?? "" });
      setState({ phase: "ready", ctx: { userId: session.user.id, email: session.user.email ?? "", role } });
    };
    check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setState({ phase: "signed-out" });
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  const refreshNewCount = useCallback(() => {
    countEnquiries("new").then(setNewCount).catch(() => {});
  }, []);

  useEffect(() => {
    if (state.phase === "ready") refreshNewCount();
  }, [state.phase, refreshNewCount]);

  const signOut = async () => {
    await supabase.auth.signOut();
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
