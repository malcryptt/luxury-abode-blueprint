import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { z } from "zod";
import wslLogo from "@/assets/wsl-logo.png";

const authSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const Auth = () => {
  const navigate = useNavigate();
  const [isSignIn, setIsSignIn] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          navigate("/");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validatedData = authSchema.parse({ email, password });
      
      if (isSignIn) {
        const { error } = await supabase.auth.signInWithPassword({
          email: validatedData.email,
          password: validatedData.password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Invalid email or password");
          } else {
            toast.error(error.message);
          }
          return;
        }

        toast.success("Welcome back!");
        navigate("/");
      } else {
        const redirectUrl = `${window.location.origin}/`;
        
        const { error } = await supabase.auth.signUp({
          email: validatedData.email,
          password: validatedData.password,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });

        if (error) {
          if (error.message.includes("User already registered")) {
            toast.error("This email is already registered. Please sign in instead.");
          } else {
            toast.error(error.message);
          }
          return;
        }

        toast.success("Account created! You can now sign in.");
        setIsSignIn(true);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error(firstError.message);
      } else {
        toast.error("An unexpected error occurred");
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
          <h1 className="text-4xl font-playfair font-bold tracking-wide">
            WSL Realty
          </h1>
          <p className="text-muted-foreground text-sm tracking-wider uppercase">Luxury Real Estate</p>
        </div>

        <div className="luxury-card p-8 space-y-6">
          <form onSubmit={handleAuth} className="space-y-4">
            <Input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-secondary border-border focus:border-gold"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-secondary border-border focus:border-gold"
            />
            
            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-gold hover:bg-gold-light text-charcoal font-semibold py-6 transition-smooth"
            >
              {isLoading ? "Loading..." : isSignIn ? "Sign In" : "Sign Up"}
            </Button>
          </form>

          <div className="space-y-2 text-center">
            <button
              type="button"
              onClick={() => setIsSignIn(!isSignIn)}
              className="text-gold hover:text-gold-light transition-smooth text-sm"
            >
              {isSignIn ? "Need an account? Sign Up" : "Already have an account? Sign In"}
            </button>
            {isSignIn && (
              <button
                type="button"
                onClick={() => toast.info("Please contact support to reset your password")}
                className="block w-full text-muted-foreground hover:text-foreground transition-smooth text-sm"
              >
                Forgot Password?
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
