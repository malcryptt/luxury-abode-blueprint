import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/integrations/firebase/client";
import { toast } from "sonner";
import { z } from "zod";
import wslLogo from "@/assets/wsl-logo.png";
import { useNoIndex } from "@/components/site/Seo";
import "@/pages/admin/admin.css";

const authSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Staff sign-in only. Accounts are created by an admin from the dashboard,
// so there is deliberately no public sign-up here.
const Auth = () => {
  useNoIndex("Sign in");
  const navigate = useNavigate();
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (user) => { if (user) navigate("/admin"); }), [navigate]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const validatedEmail = z.string().trim().email("Invalid email address").parse(email);
      try { await sendPasswordResetEmail(auth, validatedEmail); } catch (err) {
        // Don't reveal whether an address has an account.
        if ((err as { code?: string }).code !== "auth/user-not-found") throw err;
      }
      toast.success("If that email belongs to a team member, a reset link is on its way.");
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
      await signInWithEmailAndPassword(auth, validated.email, validated.password);
      toast.success("Welcome back!");
      navigate("/admin");
    } catch (error) {
      if (error instanceof z.ZodError) toast.error(error.errors[0].message);
      else {
        const code = (error as { code?: string }).code ?? "";
        if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") toast.error("Invalid email or password");
        else if (code === "auth/too-many-requests") toast.error("Too many attempts. Please wait a few minutes and try again.");
        else if (code === "auth/network-request-failed") toast.error("No connection. Check your internet and try again.");
        else toast.error("Could not sign in. Please try again.");
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
        <p className="sub">Sign in</p>

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
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>
            <button type="submit" disabled={isLoading} className="adm-btn">{isLoading ? "Signing in…" : "Sign in"}</button>
            <button type="button" className="link" onClick={() => setIsForgotPassword(true)}>Forgot password?</button>
          </form>
        )}
        <a className="back" href="/">← Back to website</a>
      </div>
    </div>
  );
};

export default Auth;
