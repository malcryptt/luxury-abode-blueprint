import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { z } from "zod";
import wslLogo from "@/assets/wsl-logo.png";
import { useNoIndex } from "@/components/site/Seo";

const authSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Staff sign-in only. Accounts are created by an admin from the dashboard,
// so there is deliberately no public sign-up here.
const Auth = () => {
  useNoIndex("Team sign in");
  const navigate = useNavigate();
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) navigate("/admin");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) navigate("/admin");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validatedEmail = z.string().trim().email("Invalid email address").parse(email);
      const { error } = await supabase.auth.resetPasswordForEmail(validatedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("If that email belongs to a team member, a reset link is on its way.");
      setIsForgotPassword(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validated = authSchema.parse({ email, password });
      const { error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) {
        toast.error(error.message.includes("Invalid login credentials") ? "Invalid email or password" : error.message);
        return;
      }

      toast.success("Welcome back!");
      navigate("/admin");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <img
              src={wslLogo}
              alt="WSL Properties"
              className="w-32 h-32 object-contain drop-shadow-[0_0_20px_rgba(197,154,76,0.3)]"
            />
          </div>
          <h1 className="text-4xl font-playfair font-bold tracking-wide">WSL Properties</h1>
          <p className="text-muted-foreground text-sm tracking-wider uppercase">Team sign in</p>
        </div>

        <div className="luxury-card p-8 space-y-6">
          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-xl font-semibold mb-2">Reset password</h2>
                <p className="text-sm text-muted-foreground">Enter your email to receive a password reset link</p>
              </div>
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-secondary border-border focus:border-gold"
              />
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gold hover:bg-gold-light text-charcoal font-semibold py-6 transition-smooth"
              >
                {isLoading ? "Sending..." : "Send reset link"}
              </Button>
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="block w-full text-gold hover:text-gold-light transition-smooth text-sm"
              >
                Back to sign in
              </button>
            </form>
          ) : (
            <>
              <form onSubmit={handleAuth} className="space-y-4">
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="bg-secondary border-border focus:border-gold"
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="current-password"
                  className="bg-secondary border-border focus:border-gold"
                />
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gold hover:bg-gold-light text-charcoal font-semibold py-6 transition-smooth"
                >
                  {isLoading ? "Signing in..." : "Sign in"}
                </Button>
              </form>

              <button
                type="button"
                onClick={() => setIsForgotPassword(true)}
                className="block w-full text-center text-muted-foreground hover:text-foreground transition-smooth text-sm"
              >
                Forgot password?
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
