import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import "@/pages/admin/admin.css";
import { useNoIndex } from "@/components/site/Seo";
import { toast } from "sonner";

const ResetPassword = () => {
  useNoIndex("Set a new password");
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirm) return toast.error("Passwords do not match");
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated! You're signed in.");
    navigate("/admin");
  };

  return (
    <div className="adm adm-auth">
      <form className="adm-auth-card" onSubmit={handleSubmit} noValidate>
        <h1>Set a new password</h1>
        <p className="adm-muted" style={{ margin: 0, textAlign: "center" }}>
          {ready ? "Choose a new password for your account." : "Open this page from the reset link in your email."}
        </p>
        <label className="adm-field"><span>New password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={!ready} autoComplete="new-password" /></label>
        <label className="adm-field"><span>Confirm new password</span>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required disabled={!ready} autoComplete="new-password" /></label>
        <button type="submit" disabled={isLoading || !ready} className="adm-btn">{isLoading ? "Saving…" : "Save new password"}</button>
      </form>
    </div>
  );
};

export default ResetPassword;
