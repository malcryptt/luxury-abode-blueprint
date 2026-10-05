import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { deleteApp, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, signOut as signOutAuth,
} from "firebase/auth";
import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { passwordProblem } from "@/lib/password";
import { auth, db, firebaseConfig, makeAuth } from "@/integrations/firebase/client";
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function listMembers(): Promise<Member[]> {
  const snap = await getDocs(collection(db, "staff"));
  return snap.docs
    .map((d) => ({ id: d.id, user_id: d.id, email: String(d.data().email ?? d.id), role: (d.data().role === "admin" ? "admin" : "editor") as StaffRole }))
    .sort((a, b) => a.email.localeCompare(b.email));
}

/**
 * Creates the login on a throw-away second Firebase app so the admin stays signed in on this one,
 * then records the role. Without a server (paid Cloud Functions) this is how an admin can create accounts.
 */
async function addMember(email: string, password: string, role: StaffRole): Promise<void> {
  const secondary = initializeApp(firebaseConfig, `team-${Date.now()}`);
  const sAuth = makeAuth(secondary, true);
  try {
    let uid: string;
    try {
      uid = (await createUserWithEmailAndPassword(sAuth, email, password)).user.uid;
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code !== "auth/email-already-in-use") throw err;
      // The person already has a login. Firebase can only identify them if the password given is their current one.
      try {
        uid = (await signInWithEmailAndPassword(sAuth, email, password)).user.uid;
      } catch {
        throw new Error("That email already has an account. Enter that account's current password to give it access, or use a different email.");
      }
    }
    await setDoc(doc(db, "staff", uid), { email: email.toLowerCase(), role, created_at: serverTimestamp() });
  } finally {
    await signOutAuth(sAuth).catch(() => {});
    await deleteApp(secondary).catch(() => {});
  }
}

const friendly = (err: unknown): string => {
  const code = (err as { code?: string }).code ?? "";
  if (code === "auth/weak-password") return "That password is too weak. Use at least 8 characters.";
  if (code === "auth/invalid-email") return "That email address is not valid.";
  if (code === "permission-denied" || code === "firestore/permission-denied") return "You do not have permission to do that.";
  return (err as Error).message || "Something went wrong. Please try again.";
};

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
    queryFn: listMembers,
    enabled: role === "admin",
  });

  if (role !== "admin") return <Navigate to="/admin" replace />;
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "team"] });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = email.trim();
    if (!EMAIL_RE.test(em)) return toast.error("Enter a valid email address");
    { const pw = passwordProblem(password); if (pw) return toast.error(`Choose a stronger password. ${pw}.`); }
    setAdding(true);
    try {
      if ((data ?? []).some((m) => m.email.toLowerCase() === em.toLowerCase())) throw new Error("That person is already on the team.");
      await addMember(em, password, newRole);
      toast.success(`${em} added as ${newRole}`);
      setEmail(""); setPassword("");
      refresh();
    } catch (err) {
      toast.error(friendly(err));
    } finally {
      setAdding(false);
    }
  };

  const changeRole = async (m: Member, r: StaffRole) => {
    try {
      await updateDoc(doc(db, "staff", m.id), { role: r });
      toast.success(`${m.email} is now ${r}`);
      refresh();
    } catch (err) {
      toast.error(friendly(err));
    }
  };

  const sendReset = async (m: Member) => {
    try {
      await sendPasswordResetEmail(auth, m.email);
      toast.success(`A reset link was sent to ${m.email}`);
    } catch (err) {
      toast.error(friendly(err));
    }
  };

  const remove = async () => {
    if (!pendingRemove) return;
    const m = pendingRemove;
    setPendingRemove(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      let res: Response | null = null;
      try {
        res = await fetch("/api/remove-member", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ uid: m.id }) });
      } catch { /* no server reachable (for example, running locally) */ }
      if (res?.ok) {
        toast.success(`${m.email} was removed and their login deleted`);
      } else if (res && res.status !== 404 && res.status !== 501) {
        const reason = await res.json().catch(() => ({}));
        throw new Error(reason?.error || "Could not remove that person.");
      } else {
        // The cleanup service is not set up yet: still revoke access, but the login stays in Firebase.
        await deleteDoc(doc(db, "staff", m.id));
        toast.warning(`${m.email} can no longer use the admin. Their login still exists in Firebase because the cleanup service is not set up yet.`);
      }
      refresh();
    } catch (err) {
      toast.error(friendly(err));
    }
  };

  return (
    <>
      <div className="adm-head">
        <div><h1>Team</h1><p>People who can sign in to this admin area.</p></div>
      </div>

      <form className="adm-panel" onSubmit={add} noValidate>
        <h2>Add a team member</h2>
        <p className="sub">Create their login here and share the password with them privately. They can change it with “Forgot password?” on the sign-in page.</p>
        <div className="adm-grid two">
          <label className="adm-field"><span>Email address</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" /></label>
          <label className="adm-field"><span>Temporary password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /><small>At least 8 characters, with letters and numbers.</small></label>
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
            <span>The team could not be loaded. Check your connection and that the Firestore rules have been published.</span>
            <button className="adm-btn small" onClick={() => refetch()}>Retry</button>
          </div>
        )}
        {isLoading ? <p className="adm-muted">Loading…</p> : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>Email</th><th>Role</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {(data ?? []).map((m) => (
                  <tr key={m.id}>
                    <td>{m.email}{m.user_id === userId ? " (you)" : ""}</td>
                    <td>
                      {m.user_id === userId ? <span className="adm-badge">{m.role}</span> : (
                        <select aria-label={`Role for ${m.email}`} value={m.role} onChange={(e) => changeRole(m, e.target.value as StaffRole)}>
                          <option value="editor">Editor</option><option value="admin">Admin</option>
                        </select>
                      )}
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button className="adm-btn small ghost" aria-label={`Send password reset to ${m.email}`} title="Email a password reset link" onClick={() => sendReset(m)}><KeyRound size={15} /></button>{" "}
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
            <AlertDialogDescription>{pendingRemove?.email} will no longer be able to use the admin area. Their login is deleted too.</AlertDialogDescription>
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
