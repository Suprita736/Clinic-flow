import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Plus,
  Activity,
  Clock,
  Bell,
  LayoutDashboard,
  QrCode,
  BarChart3,
  UserPlus,
  Ticket,
  RefreshCw,
  BellRing,
  Users,
  CalendarCheck,
  TrendingUp,
} from "lucide-react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-queue.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClinicFlow" },
      {
        name: "description",
        content:
          "Replace paper tokens and shouting with live digital queues, accurate wait times, and real-time patient updates. Premium queue management for modern clinics.",
      },
      { property: "og:title", content: "ClinicFlow — Smart Queue Management for Clinics" },
      {
        property: "og:description",
        content:
          "Live digital queues, accurate wait times, and real-time patient updates for modern clinics.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: heroImage },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    link: [
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/favicon.svg",
      }
    ]
  }),
  component: Landing,
});

function Eyebrow({ index, children }: { index: string; children: string }) {
  return (
    <p className="mb-5 text-sm font-medium tracking-wide text-muted-foreground">
      <span className="text-foreground">{index}</span>
      <span className="mx-2 text-muted-foreground">—</span>
      {children}
    </p>
  );
}

const STATS = [
  { value: "76%", label: "of clinics still rely on manual, paper-based queues." },
  { value: "2–3 hrs", label: "average time patients spend waiting for their turn." },
  { value: "100%", label: "live visibility for patients, from token to turn." },
];

const FEATURES = [
  {
    icon: Activity,
    title: "Real-Time Queue Tracking",
    desc: "Watch the queue move live. Every token, status, and position updates instantly across all screens.",
  },
  {
    icon: Clock,
    title: "Live Wait Time Prediction",
    desc: "Accurate estimates based on rolling consultation times, so patients always know what to expect.",
  },
  {
    icon: Bell,
    title: "Patient Notifications",
    desc: "Gentle alerts when patients are a few turns away and when they're next in line.",
  },
  {
    icon: LayoutDashboard,
    title: "Receptionist Dashboard",
    desc: "A calm, powerful control center to add patients, call next, skip, pause, and resume the queue.",
  },
  {
    icon: QrCode,
    title: "QR-Based Patient Access",
    desc: "Patients join and follow their queue from any phone — no apps, no paper, no crowding.",
  },
  {
    icon: BarChart3,
    title: "Clinic Analytics",
    desc: "Understand peak hours, no-shows, and average waits to run a smoother, calmer clinic.",
  },
];

const STEPS = [
  { icon: UserPlus, step: "Step 1", title: "Receptionist adds patient", desc: "A patient is added at the front desk in seconds." },
  { icon: Ticket, step: "Step 2", title: "Patient receives token", desc: "A digital token is generated automatically." },
  { icon: RefreshCw, step: "Step 3", title: "Live queue updates", desc: "Everyone sees the queue move in real time." },
  { icon: BellRing, step: "Step 4", title: "Notified before turn", desc: "Patients get an alert just before they're called." },
];

const INSIGHTS = [
  { icon: Clock, label: "Average Wait Time", value: "18 min", sub: "↓ 42% vs. paper queues" },
  { icon: Users, label: "Patients Today", value: "142", sub: "Across all departments" },
  { icon: CalendarCheck, label: "No Shows", value: "6", sub: "Auto-flagged & re-queued" },
  { icon: TrendingUp, label: "Peak Hour", value: "11–12", sub: "Busiest part of the day" },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="mx-auto w-[min(1180px,calc(100%-2rem))] pt-14 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Smart Queue Management
          </span>
          <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
            Modern Queue Management{" "}
            <span className="italic text-primary/80">For Clinics</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Replace paper tokens and shouting with live digital queues, accurate
            wait times, and real-time patient updates.
          </p>
          <div className="mt-8 flex items-center justify-center">
            <Button asChild variant="hero" size="xl">
              <Link to="/auth">
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="relative mt-14 overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-elevated">
          <img
            src={heroImage}
            alt="ClinicFlow digital queue display and patient app inside a clinic waiting area"
            width={1280}
            height={1024}
            className="h-auto w-full object-cover"
          />
        </div>
      </section>

      {/* Why clinics need this */}
      <section id="benefits" className="mx-auto w-[min(1180px,calc(100%-2rem))] pt-24">
        <Eyebrow index="001">Why Clinics Need This</Eyebrow>
        <h2 className="max-w-2xl font-display text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
          Waiting rooms shouldn't feel like a lottery.
        </h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {STATS.map((s, i) => (
            <div
              key={s.value}
              className={`relative overflow-hidden rounded-3xl p-8 shadow-card ${i === 1
                ? "bg-primary text-primary-foreground"
                : i === 2
                  ? "bg-mint text-mint-foreground"
                  : "bg-card text-foreground"
                }`}
            >
              <Plus
                className={`absolute right-6 top-6 h-6 w-6 ${i === 1 ? "text-primary-foreground/60" : "text-foreground/30"
                  }`}
                strokeWidth={1.5}
              />
              <p className="font-display text-5xl font-semibold tracking-tight sm:text-6xl">
                {s.value}
              </p>
              <p
                className={`mt-5 max-w-[16rem] text-sm leading-relaxed ${i === 1 ? "text-primary-foreground/80" : "text-muted-foreground"
                  }`}
              >
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto w-[min(1180px,calc(100%-2rem))] pt-24">
        <Eyebrow index="002">Features</Eyebrow>
        <h2 className="max-w-2xl font-display text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
          Everything your front desk needs.
        </h2>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-3xl border border-border/60 bg-card p-8 shadow-soft transition-all hover:-translate-y-1 hover:shadow-card"
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-mint text-mint-foreground">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-6 text-lg font-semibold text-foreground">{f.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto w-[min(1180px,calc(100%-2rem))] pt-24">
        <Eyebrow index="003">How It Works</Eyebrow>
        <h2 className="max-w-2xl font-display text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
          From front desk to first call, in four calm steps.
        </h2>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.step} className="rounded-3xl border border-border/60 bg-card p-7 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
                  <s.icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {s.step}
                </span>
              </div>
              <h3 className="mt-6 text-base font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Clinic insights */}
      <section className="mx-auto w-[min(1180px,calc(100%-2rem))] pt-24">
        <Eyebrow index="004">Clinic Insights</Eyebrow>
        <div className="overflow-hidden rounded-[2rem] bg-primary p-8 shadow-elevated sm:p-12">
          <h2 className="max-w-xl font-display text-2xl font-semibold leading-tight tracking-tight text-primary-foreground sm:text-4xl">
            Beautiful analytics that keep your clinic calm.
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {INSIGHTS.map((m) => (
              <div key={m.label} className="rounded-3xl bg-card/95 p-6 shadow-card">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-mint text-mint-foreground">
                  <m.icon className="h-5 w-5" />
                </span>
                <p className="mt-5 text-sm font-medium text-muted-foreground">{m.label}</p>
                <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
                  {m.value}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">{m.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-[min(1180px,calc(100%-2rem))] pt-24">
        <div className="rounded-[2rem] border border-border/60 bg-mint p-10 text-center shadow-card sm:p-16">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold leading-tight tracking-tight text-mint-foreground sm:text-5xl">
            Give your patients a calmer wait.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-mint-foreground/80">
            Set up your clinic queue in minutes. No paper, no shouting, no chaos.
          </p>
          <div className="mt-8 flex justify-center">
            <Button asChild variant="hero" size="xl">
              <Link to="/auth">
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
