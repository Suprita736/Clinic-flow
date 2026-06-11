import { type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/clinic/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export function DashboardShell({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle: string;
  badge: string;
  children: ReactNode;
}) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/70 backdrop-blur-md">
        <div className="mx-auto flex w-[min(1180px,calc(100%-2rem))] items-center justify-between gap-4 py-4">
          <Link to="/">
            <Logo />
          </Link>
          <Button variant="pillOutline" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto w-[min(1180px,calc(100%-2rem))] py-8 sm:py-12">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-end sm:justify-between">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full bg-mint px-3 py-1 text-xs font-semibold text-mint-foreground">
              {badge}
            </span>
            <h1 className="mt-3 truncate font-display text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-3xl border border-border/60 bg-card p-6 shadow-soft ${className}`}>
      {children}
    </div>
  );
}

export function MetricCard({
  icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: string;
  tone?: "default" | "primary" | "mint";
}) {
  const tones = {
    default: "bg-card text-foreground",
    primary: "bg-primary text-primary-foreground",
    mint: "bg-mint text-mint-foreground",
  };
  const iconTones = {
    default: "bg-secondary text-foreground",
    primary: "bg-primary-foreground/15 text-primary-foreground",
    mint: "bg-mint-foreground/10 text-mint-foreground",
  };
  return (
    <div className={`rounded-3xl border border-border/40 p-6 shadow-soft ${tones[tone]}`}>
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${iconTones[tone]}`}>
        {icon}
      </span>
      <p
        className={`mt-5 text-sm font-medium ${
          tone === "primary" ? "text-primary-foreground/75" : "text-muted-foreground"
        }`}
      >
        {label}
      </p>
      <p className="mt-1 font-display text-3xl font-semibold tracking-tight">{value}</p>
      {sub && (
        <p
          className={`mt-1.5 text-xs ${
            tone === "primary" ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
