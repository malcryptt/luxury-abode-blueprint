import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const ResetPassword = () => {
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
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md luxury-card p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-playfair font-bold mb-2">Set New Password</h1>
          <p className="text-sm text-muted-foreground">
            {ready ? "Choose a new password for your account." : "Open this page from the reset link in your email."}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input type="password" placeholder="New password" value={password}
            onChange={(e) => setPassword(e.target.value)} required disabled={!ready}
            className="bg-secondary border-border focus:border-gold" />
          <Input type="password" placeholder="Confirm new password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} required disabled={!ready}
            className="bg-secondary border-border focus:border-gold" />
          <Button type="submit" disabled={isLoading || !ready}
            className="w-full bg-gold hover:bg-gold-light text-charcoal font-semibold py-6 transition-smooth">
            {isLoading ? "Saving..." : "Save New Password"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
