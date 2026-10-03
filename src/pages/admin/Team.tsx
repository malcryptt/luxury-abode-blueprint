import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAdmin } from "./context";
import type { StaffRole } from "./context";

interface Member { id: string; user_id: string; email: string; role: StaffRole }

const ROLE_HELP: Record<StaffRole, string> = {
  admin: "Full access, including the team.",
  editor: "Can manage enquiries and website content, but not the team.",
};

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("manage-admins", { body });
  if (error) {
    // When the server refuses a request, supabase-js hides the reason in the error's response. Show it.
    let message = "Something went wrong. Please try again.";
    const res = (error as { context?: Response }).context;
    if (res && typeof res.json === "function") {
      try {
        const reason = await res.json();
        if (typeof reason?.error === "string" && reason.error) message = reason.error;
      } catch { /* keep the generic message */ }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export default function Team() {
  const { role, userId } = useAdmin();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newRole, setNewRole] = useState<StaffRole>("editor");
  const [adding, setAdding] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<Member | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "team"],
    queryFn: () => call<{ admins: Member[] }>({ action: "list" }),
    enabled: role === "admin",
  });

  if (role !== "admin") return <Navigate to="/admin" replace />;
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "team"] });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return toast.error("Enter a valid email address");
    if (password.length < 8) return toast.error("The password must be at least 8 characters");
    setAdding(true);
    try {
      await call({ action: "add", email: em, password, role: newRole });
      toast.success(`${em} added as ${newRole}`);
      setEmail(""); setPassword("");
      refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const changeRole = async (m: Member, r: StaffRole) => {
    try {
      await call({ action: "setRole", roleId: m.id, role: r });
      toast.success(`${m.email} is now ${r}`);
      refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const remove = async () => {
    if (!pendingRemove) return;
    const m = pendingRemove;
    setPendingRemove(null);
    try {
      await call({ action: "remove", roleId: m.id });
      toast.success(`${m.email} no longer has access`);
      refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <>
      <div className="adm-head">
        <div><h1>Team</h1><p>People who can sign in to this admin area.</p></div>
      </div>

      <form className="adm-panel" onSubmit={add} noValidate>
        <h2>Add a team member</h2>
        <p className="sub">Create their account here and share the password with them privately. They can change it with “Forgot password?” on the sign-in page.</p>
        <div className="adm-grid two">
          <label className="adm-field"><span>Email address</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" /></label>
          <label className="adm-field"><span>Temporary password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /><small>At least 8 characters.</small></label>
          <label className="adm-field"><span>Role</span>
            <select value={newRole} onChange={(e) => setNewRole(e.target.value as StaffRole)}>
              <option value="editor">Editor</option><option value="admin">Admin</option>
            </select>
            <small>{ROLE_HELP[newRole]}</small>
          </label>
        </div>
        <div className="adm-actions"><button className="adm-btn" disabled={adding}><UserPlus size={16} /> {adding ? "Adding…" : "Add member"}</button></div>
      </form>

      <section className="adm-panel">
        <h2>Current team</h2>
        {isError && (
          <div className="adm-err" role="alert" style={{ marginTop: 12 }}>
            <span>The team could not be loaded. The “manage-admins” function may need to be redeployed.</span>
            <button className="adm-btn small" onClick={() => refetch()}>Retry</button>
          </div>
        )}
        {isLoading ? <p className="adm-muted">Loading…</p> : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>Email</th><th>Role</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {(data?.admins ?? []).map((m) => (
                  <tr key={m.id}>
                    <td>{m.email}{m.user_id === userId ? " (you)" : ""}</td>
                    <td>
                      {m.user_id === userId ? <span className="adm-badge">{m.role}</span> : (
                        <select aria-label={`Role for ${m.email}`} value={m.role} onChange={(e) => changeRole(m, e.target.value as StaffRole)}>
                          <option value="editor">Editor</option><option value="admin">Admin</option>
                        </select>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {m.user_id !== userId && (
                        <button className="adm-btn small ghost" aria-label={`Remove ${m.email}`} onClick={() => setPendingRemove(m)}><Trash2 size={15} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AlertDialog open={!!pendingRemove} onOpenChange={(o) => !o && setPendingRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this person?</AlertDialogTitle>
            <AlertDialogDescription>{pendingRemove?.email} will no longer be able to use the admin area.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Yes, remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
