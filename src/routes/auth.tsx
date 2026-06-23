import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowLeft, Loader2, Stethoscope, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/auth";
import { Logo } from "@/components/clinic/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import authImage from "@/assets/auth-illustration.jpg";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — ClinicFlow" },
      { name: "description", content: "Sign in or create your ClinicFlow account to manage clinic queues." },
    ],
  }),
  component: AuthPage,
});

const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Please enter your name").max(100),
    phone: z.string().trim().min(6, "Enter a valid phone number").max(20),
    email: z.string().trim().email("Invalid email address").max(255),
    password: z.string().min(6, "Password must be at least 6 characters").max(72),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string().min(1, "Enter your password").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [loading, setLoading] = useState(false);

  const redirectByRole = () => {
    navigate({ to: "/receptionist" });
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = registerSchema.safeParse({
      fullName: fd.get("fullName"),
      phone: fd.get("phone"),
      email: fd.get("email"),
      password: fd.get("password"),
      confirmPassword: fd.get("confirmPassword"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: parsed.data.fullName,
            phone: parsed.data.phone,
            role: "receptionist",
          },
        },
      });
      console.log("[AUTH:register] signUp result:", { userId: data.user?.id, hasSession: !!data.session, error });
      if (error) throw error;
      const uid = data.user?.id;
      if (!data.session || !uid) {
        console.warn("[AUTH:register] No session returned — email confirmation may be enabled. Profile/role NOT created yet.");
        toast.success("Account created. Please sign in to continue.");
        setLoading(false);
        return;
      }

      const [profileResult, roleResult] = await Promise.all([
        supabase.from("profiles").upsert({
          id: uid,
          full_name: parsed.data.fullName,
          phone: parsed.data.phone,
        }),
        supabase.from("user_roles").insert({ user_id: uid, role: "receptionist" }),
      ]);
      console.log("[AUTH:register] profile upsert:", { data: profileResult.data, error: profileResult.error });
      console.log("[AUTH:register] role insert:", { data: roleResult.data, error: roleResult.error });
      if (profileResult.error) throw profileResult.error;
      if (roleResult.error) throw roleResult.error;

      await refresh();
      toast.success("Welcome to ClinicFlow!");
      redirectByRole();
    } catch (err) {
      console.error("[AUTH:register] error:", err);
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({
      email: fd.get("email"),
      password: fd.get("password"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (error) throw error;
      const uid = data.user.id;
      console.log("[AUTH:login] signed in, uid:", uid);

      let { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .limit(1)
        .maybeSingle();
      console.log("[AUTH:login] roleRow from DB:", roleRow);

      // If no role exists in user_roles, create it from user_metadata (set during signUp)
      if (!roleRow) {
        const metaRole = data.user.user_metadata?.role as AppRole | undefined;
        console.warn("[AUTH:login] No role in user_roles! user_metadata.role:", metaRole);
        if (metaRole === "receptionist" || metaRole === "patient") {
          // Also create the profile if missing
          const [profileResult, roleResult] = await Promise.all([
            supabase.from("profiles").upsert({
              id: uid,
              full_name: (data.user.user_metadata?.full_name as string) || "",
              phone: (data.user.user_metadata?.phone as string) || "",
            }),
            supabase.from("user_roles").insert({ user_id: uid, role: metaRole }),
          ]);
          console.log("[AUTH:login] auto-created profile:", { error: profileResult.error });
          console.log("[AUTH:login] auto-created role:", { error: roleResult.error });
          if (!roleResult.error) {
            roleRow = { role: metaRole };
          }
        }
      }

      await refresh();
      toast.success("Signed in");
      redirectByRole();
    } catch (err) {
      console.error("[AUTH:login] error:", err);
      toast.error(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left illustration */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-secondary p-12 lg:flex">
        <Link to="/" className="relative z-10">
          <Logo />
        </Link>
        <div className="relative z-10 mx-auto w-full max-w-md">
          <img
            src={authImage}
            alt="A receptionist welcoming a patient at a modern clinic"
            width={1024}
            height={1280}
            loading="lazy"
            className="w-full rounded-[2rem] shadow-elevated"
          />
        </div>
        <div className="relative z-10">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Calmer waiting rooms start here.
          </h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Live digital queues, accurate wait times, and real-time updates for
            patients and staff.
          </p>
        </div>
      </div>

      {/* Right auth card */}
      <div className="flex flex-col bg-background px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between lg:hidden">
          <Link to="/">
            <Logo />
          </Link>
        </div>
        <Link
          to="/"
          className="mt-6 inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground lg:mt-0"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
              Welcome to ClinicFlow
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to your dashboard or create a new account.
            </p>

            <Tabs defaultValue="login" className="mt-8">
              <TabsList className="grid w-full grid-cols-2 rounded-full bg-secondary p-1">
                <TabsTrigger value="login" className="rounded-full">
                  Login
                </TabsTrigger>
                <TabsTrigger value="register" className="rounded-full">
                  Register
                </TabsTrigger>
              </TabsList>

              {/* Login */}
              <TabsContent value="login" className="mt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" name="email" type="email" placeholder="you@email.com" autoComplete="email" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="login-password">Password</Label>
                    <Input id="login-password" name="password" type="password" placeholder="••••••••" autoComplete="current-password" />
                  </div>
                  <Button type="submit" variant="pill" className="w-full" size="lg" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Login"}
                  </Button>
                </form>
              </TabsContent>

              {/* Register */}
              <TabsContent value="register" className="mt-6">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-name">Name</Label>
                    <Input id="reg-name" name="fullName" placeholder="Jane Doe" autoComplete="name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-phone">Phone Number</Label>
                    <Input id="reg-phone" name="phone" type="tel" placeholder="+1 555 000 0000" autoComplete="tel" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input id="reg-email" name="email" type="email" placeholder="you@email.com" autoComplete="email" />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-password">Password</Label>
                      <Input id="reg-password" name="password" type="password" placeholder="••••••••" autoComplete="new-password" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-confirm">Confirm</Label>
                      <Input id="reg-confirm" name="confirmPassword" type="password" placeholder="••••••••" autoComplete="new-password" />
                    </div>
                  </div>
                  <Button type="submit" variant="pill" className="w-full" size="lg" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}


