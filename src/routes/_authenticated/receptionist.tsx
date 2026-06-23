import { Outlet, createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Users, UserSquare2, LineChart, LogOut, Loader2 } from "lucide-react";
import { Logo } from "@/components/clinic/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/receptionist")({
  component: ReceptionistLayout,
});

const SIDEBAR_NAV = [
  { label: "Dashboard", href: "/receptionist", icon: LayoutDashboard },
  { label: "Doctors", href: "/receptionist/doctors", icon: UserSquare2 },
  { label: "Patients", href: "/receptionist/patients", icon: Users },
  { label: "Intelligence", href: "/receptionist/intelligence", icon: LineChart },
];

function ReceptionistLayout() {
  const { signOut, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border/60 bg-card px-4 py-6 shadow-soft">
        <div className="mb-8 px-2">
          <Link to="/">
            <Logo />
          </Link>
        </div>
        <nav className="flex-1 space-y-1">
          {SIDEBAR_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-border/60 pt-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => signOut()}
          >
            <LogOut className="h-5 w-5" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 pl-64">
        {/* We keep the DashboardShell for backward compatibility within the pages, 
            but we override its header/margins by passing simplified props or just letting 
            the pages render cleanly. Since the pages use DashboardShell, let's just 
            render the Outlet here and we'll adjust DashboardShell not to render its own header if in sidebar. */}
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
