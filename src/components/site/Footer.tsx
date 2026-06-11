import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/clinic/Logo";

const COLUMNS = [
  {
    title: "Product",
    links: ["Features", "How It Works", "Benefits", "Pricing"],
  },
  {
    title: "Company",
    links: ["About us", "Careers", "Contact", "Press"],
  },
  {
    title: "Resources",
    links: ["Help center", "Documentation", "Privacy", "Terms"],
  },
];

export function Footer() {
  return (
    <footer id="contact" className="mt-24 border-t border-border/60 bg-secondary/60">
      <div className="mx-auto w-[min(1180px,calc(100%-2rem))] py-16">
        <div className="flex flex-col items-start justify-between gap-6 border-b border-border/60 pb-10 sm:flex-row sm:items-center">
          <Logo />
          <a
            href="mailto:hello@clinicflow.com"
            className="font-display text-2xl tracking-tight text-foreground sm:text-3xl"
          >
            hello@clinicflow.com
          </a>
        </div>

        <div className="grid grid-cols-2 gap-8 py-12 md:grid-cols-4">
          <div className="col-span-2 max-w-xs md:col-span-1">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Modern queue management that replaces paper tokens with calm,
              real-time digital queues for clinics.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-sm font-semibold text-foreground">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-8 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} ClinicFlow. All rights reserved.</p>
          <Link to="/auth" className="font-medium text-foreground hover:underline">
            Get started →
          </Link>
        </div>
      </div>
    </footer>
  );
}
