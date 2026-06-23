import { useState } from "react";
import { Outlet, createFileRoute, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Users, UserSquare2, LineChart, LogOut, Loader2, Menu } from "lucide-react";
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
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      {/* Mobile Top Navbar */}
      <div className="md:hidden flex items-center justify-between bg-card border-b border-border/60 px-4 py-4 z-30">
        <Link to="/">
          <Logo />
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
          <Menu className="h-6 w-6 text-foreground" />
        </Button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border/60 bg-card px-4 py-6 shadow-soft transition-transform duration-300 w-64 md:w-20 lg:w-64 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="mb-8 px-2 flex items-center justify-center lg:justify-start">
          <Link to="/" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="md:hidden lg:block"><Logo /></div>
            <div className="hidden md:flex lg:hidden h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xl">CF</div>
          </Link>
        </div>
        <nav className="flex-1 space-y-2">
          {SIDEBAR_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 md:py-3 lg:py-2.5 text-sm font-medium transition-colors md:justify-center lg:justify-start ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
                title={item.label}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="md:hidden lg:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-border/60 pt-4">
          <Button
            variant="ghost"
            className="w-full justify-start md:justify-center lg:justify-start gap-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive md:px-0 lg:px-3"
            onClick={handleSignOut}
            title="Sign Out"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="md:hidden lg:inline">Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 md:pl-20 lg:pl-64">
        <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-x-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
