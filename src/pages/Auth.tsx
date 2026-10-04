import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/integrations/firebase/client";
import { toast } from "sonner";
import { z } from "zod";
import wslLogo from "@/assets/wsl-logo.png";
import { useNoIndex } from "@/components/site/Seo";
import "@/pages/admin/admin.css";

const authSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

/** Team members go to the dashboard, everyone else to their enquiries inbox. */
async function homeFor(user: User): Promise<string> {
  try {
    const snap = await getDoc(doc(db, "staff", user.uid));
    const role = snap.exists() ? snap.data().role : null;
    return role === "admin" || role === "editor" ? "/admin" : "/inbox";
  } catch {
    return "/inbox";
  }
}

// One sign-in page for the team and for customers. Team accounts are created by an admin from the dashboard;
// customers create their own account here to follow their enquiries.
const Auth = () => {
  useNoIndex("Sign in");
  const navigate = useNavigate();
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState("");

  useEffect(() => onAuthStateChanged(auth, async (user) => { if (user) navigate(await homeFor(user)); }), [navigate]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const validatedEmail = z.string().trim().email("Invalid email address").parse(email);
      try { await sendPasswordResetEmail(auth, validatedEmail); } catch (err) {
        // Don't reveal whether an address has an account.
        if ((err as { code?: string }).code !== "auth/user-not-found") throw err;
      }
      toast.success("If that email has an account, a reset link is on its way.");
      setIsForgotPassword(false);
    } catch (error) {
      if (error instanceof z.ZodError) toast.error(error.errors[0].message);
      else toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const validated = authSchema.parse({ email, password });
      if (creating) {
        if (validated.password !== confirm) { toast.error("The two passwords do not match"); return; }
        const cred = await createUserWithEmailAndPassword(auth, validated.email, validated.password);
        sendEmailVerification(cred.user).catch(() => {});
        toast.success("Account created. We sent a link to confirm your email.");
        navigate("/inbox");
        return;
      }
      const cred = await signInWithEmailAndPassword(auth, validated.email, validated.password);
      toast.success("Welcome back!");
      navigate(await homeFor(cred.user));
    } catch (error) {
      if (error instanceof z.ZodError) toast.error(error.errors[0].message);
      else {
        const code = (error as { code?: string }).code ?? "";
        if (code === "auth/email-already-in-use") toast.error("That email already has an account. Sign in instead.");
        else if (code === "auth/weak-password") toast.error("Choose a stronger password (at least 6 characters)");
        else if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") toast.error("Invalid email or password");
        else if (code === "auth/too-many-requests") toast.error("Too many attempts. Please wait a few minutes and try again.");
        else if (code === "auth/network-request-failed") toast.error("No connection. Check your internet and try again.");
        else toast.error(creating ? "Could not create the account. Please try again." : "Could not sign in. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="adm adm-auth">
      <div className="adm-auth-card">
        <img src={wslLogo} alt="WSL Realty" />
        <h1>WSL Realty</h1>
        <p className="sub">{creating && !isForgotPassword ? "Create an account" : "Sign in"}</p>

        {isForgotPassword ? (
          <form onSubmit={handleForgotPassword} className="adm-grid" noValidate>
            <p className="adm-muted" style={{ margin: 0 }}>Enter your email and we will send you a link to set a new password.</p>
            <label className="adm-field"><span>Email address</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
            <button type="submit" disabled={isLoading} className="adm-btn">{isLoading ? "Sending…" : "Send reset link"}</button>
            <button type="button" className="link" onClick={() => setIsForgotPassword(false)}>Back to sign in</button>
          </form>
        ) : (
          <form onSubmit={handleAuth} className="adm-grid" noValidate>
            <label className="adm-field"><span>Email address</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
            <label className="adm-field"><span>Password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={creating ? "new-password" : "current-password"} /></label>
            {creating && <label className="adm-field"><span>Confirm password</span>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" /></label>}
            <button type="submit" disabled={isLoading} className="adm-btn">{isLoading ? (creating ? "Creating…" : "Signing in…") : creating ? "Create account" : "Sign in"}</button>
            {!creating && <button type="button" className="link" onClick={() => setIsForgotPassword(true)}>Forgot password?</button>}
            <button type="button" className="link" onClick={() => { setCreating(!creating); setConfirm(""); }}>{creating ? "Already have an account? Sign in" : "New here? Create an account to follow your enquiries"}</button>
          </form>
        )}
        <a className="back" href="/">← Back to website</a>
      </div>
    </div>
  );
};

export default Auth;
