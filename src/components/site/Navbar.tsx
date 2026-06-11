import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/clinic/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const NAV = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Benefits", href: "#benefits" },
  { label: "Contact", href: "#contact" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { session, role } = useAuth();

  const dashboardHref = role === "receptionist" ? "/receptionist" : "/patient";

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="mx-auto mt-4 w-[min(1180px,calc(100%-1.5rem))]">
        <nav className="flex items-center justify-between gap-4 rounded-full border border-border/70 bg-card/80 px-4 py-2.5 shadow-soft backdrop-blur-md sm:px-6">
          <Link to="/" className="shrink-0">
            <Logo />
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            {session ? (
              <Button asChild variant="pill">
                <Link to={dashboardHref}>Dashboard</Link>
              </Button>
            ) : (
              <Button asChild variant="pill">
                <Link to="/auth">Get Started</Link>
              </Button>
            )}
          </div>

          <button
            className="grid h-10 w-10 place-items-center rounded-full text-foreground md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {open && (
          <div className="mt-2 rounded-3xl border border-border/70 bg-card p-4 shadow-card md:hidden">
            <div className="flex flex-col gap-1">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {item.label}
                </a>
              ))}
              <Button asChild variant="pill" className="mt-2">
                <Link to={session ? dashboardHref : "/auth"}>
                  {session ? "Dashboard" : "Get Started"}
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
