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
    role: z.enum(["patient", "receptionist"]),
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
  const [role, setRole] = useState<AppRole>("patient");

  const redirectByRole = (r: AppRole | null) => {
    navigate({ to: r === "receptionist" ? "/receptionist" : "/patient" });
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
      role,
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
            role: parsed.data.role,
          },
        },
      });
      if (error) throw error;
      const uid = data.user?.id;
      if (!data.session || !uid) {
        toast.success("Account created. Please sign in to continue.");
        setLoading(false);
        return;
      }

      const [{ error: pErr }, { error: rErr }] = await Promise.all([
        supabase.from("profiles").upsert({
          id: uid,
          full_name: parsed.data.fullName,
          phone: parsed.data.phone,
        }),
        supabase.from("user_roles").insert({ user_id: uid, role: parsed.data.role }),
      ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;

      await refresh();
      toast.success("Welcome to ClinicFlow!");
      redirectByRole(parsed.data.role);
    } catch (err) {
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
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .limit(1)
        .maybeSingle();
      await refresh();
      toast.success("Signed in");
      redirectByRole((roleRow?.role as AppRole | undefined) ?? "patient");
    } catch (err) {
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
                  <div>
                    <Label className="mb-2 block">Choose Role</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <RoleOption
                        active={role === "patient"}
                        onClick={() => setRole("patient")}
                        icon={<User className="h-4 w-4" />}
                        label="Patient"
                      />
                      <RoleOption
                        active={role === "receptionist"}
                        onClick={() => setRole("receptionist")}
                        icon={<Stethoscope className="h-4 w-4" />}
                        label="Receptionist"
                      />
                    </div>
                  </div>
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

function RoleOption({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-medium transition-all ${
        active
          ? "border-primary bg-primary text-primary-foreground shadow-soft"
          : "border-border bg-card text-foreground hover:border-primary/40"
      }`}
    >
      <span
        className={`grid h-7 w-7 place-items-center rounded-lg ${
          active ? "bg-primary-foreground/15" : "bg-secondary"
        }`}
      >
        {icon}
      </span>
      {label}
    </button>
  );
}
