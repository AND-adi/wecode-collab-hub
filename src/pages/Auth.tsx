import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AnimatedBackground from "@/components/AnimatedBackground";
import { z } from "zod";

const authSchema = z.object({
  email: z.string()
    .trim()
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be less than 72 characters")
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string }>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});

    // Validate inputs
    const validation = authSchema.safeParse({ email: email.trim(), password });
    if (!validation.success) {
      const errors: { email?: string; password?: string } = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0] === "email") errors.email = err.message;
        if (err.path[0] === "password") errors.password = err.message;
      });
      setValidationErrors(errors);
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: validation.data.email,
          password: validation.data.password,
        });

        if (error) throw error;

        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
        });
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email: validation.data.email,
          password: validation.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) throw error;

        toast({
          title: "Account created!",
          description: "You can now log in with your credentials.",
        });
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center">
      <AnimatedBackground />
      
      <Card className="card-glass p-8 w-full max-w-md relative z-10">
        <div className="text-center space-y-4 mb-8">
          <h1 className="text-4xl font-bold text-gradient">
            {isLogin ? "Welcome Back" : "Join Wecode"}
          </h1>
          <p className="text-muted-foreground">
            {isLogin
              ? "Sign in to start coding together"
              : "Create an account to get started"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (validationErrors.email) {
                  setValidationErrors({ ...validationErrors, email: undefined });
                }
              }}
              placeholder="your@email.com"
              required
              className="bg-background/50"
            />
            {validationErrors.email && (
              <p className="text-sm text-destructive">{validationErrors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (validationErrors.password) {
                  setValidationErrors({ ...validationErrors, password: undefined });
                }
              }}
              placeholder="••••••••"
              required
              className="bg-background/50"
            />
            {validationErrors.password && (
              <p className="text-sm text-destructive">{validationErrors.password}</p>
            )}
            {!isLogin && !validationErrors.password && (
              <p className="text-xs text-muted-foreground">
                Minimum 8 characters required
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            disabled={loading}
          >
            {loading ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Auth;
