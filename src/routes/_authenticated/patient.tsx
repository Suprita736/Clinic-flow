import { useCallback, useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Loader2,
  Ticket,
  Users,
  Clock,
  Activity,
  BellRing,
  PlayCircle,
  PauseCircle,
  Coffee,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeQueue } from "@/hooks/useRealtimeQueue";
import {
  getMyQueueStatus,
  joinQueue,
  formatWait,
  type MyQueueStatus,
} from "@/lib/queue";
import { DashboardShell, Card, MetricCard } from "@/components/clinic/DashboardShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/patient")({
  component: PatientDashboard,
});

const CLINIC_LABEL: Record<string, { label: string; icon: React.ReactNode; tone: string }> = {
  active: { label: "Queue Active", icon: <PlayCircle className="h-4 w-4" />, tone: "text-success" },
  paused: { label: "Queue Paused", icon: <PauseCircle className="h-4 w-4" />, tone: "text-warning" },
  break: { label: "Doctor On Break", icon: <Coffee className="h-4 w-4" />, tone: "text-warning" },
};

function PatientDashboard() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<MyQueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!authLoading && role === "receptionist") {
      navigate({ to: "/receptionist" });
    }
  }, [authLoading, role, navigate]);

  const load = useCallback(async () => {
    try {
      const s = await getMyQueueStatus();
      setStatus(s);
    } catch {
      // ignore transient errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeQueue(load, { userId: user?.id });

  const handleJoin = async () => {
    if (!user) return;
    setJoining(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .maybeSingle();
      await joinQueue(
        user.id,
        profile?.full_name || user.email || "Patient",
        profile?.phone || "",
      );
      toast.success("You've joined the queue!");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not join the queue");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell title="Your Queue" subtitle="Loading your live status…" badge="Patient">
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardShell>
    );
  }

  const clinicStatus = status?.clinic_status ?? "active";
  const clinic = CLINIC_LABEL[clinicStatus];

  if (!status?.has_entry) {
    return (
      <DashboardShell
        title="Your Queue"
        subtitle="You're not in the queue yet."
        badge="Patient"
      >
        <Card className="mx-auto max-w-lg text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-mint text-mint-foreground">
            <Ticket className="h-6 w-6" />
          </span>
          <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight text-foreground">
            Join the queue
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Get a digital token and follow your position live. We'll let you know
            when you're getting close.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" /> Currently serving:{" "}
            <span className="font-semibold text-foreground">
              {status?.currently_serving != null ? `#${status.currently_serving}` : "—"}
            </span>
          </div>
          <Button
            variant="hero"
            size="xl"
            className="mt-6"
            onClick={handleJoin}
            disabled={joining}
          >
            {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : "Get My Token"}
          </Button>
        </Card>
      </DashboardShell>
    );
  }

  const total = status.total_waiting || 1;
  const position = status.position ?? 1;
  const progress = Math.max(4, Math.min(100, ((total - (status.people_ahead ?? 0)) / total) * 100));
  const isNext = (status.people_ahead ?? 0) === 0;

  const notifications: string[] = [];
  if (status.my_status === "in_progress") {
    notifications.push("It's your turn — please proceed to the doctor.");
  } else if (isNext) {
    notifications.push("You are next. Please stay nearby.");
  } else if ((status.people_ahead ?? 0) <= 3) {
    notifications.push(`You are ${status.people_ahead} patient${status.people_ahead === 1 ? "" : "s"} away.`);
  }
  notifications.push(`Currently serving token #${status.currently_serving ?? "—"}.`);

  return (
    <DashboardShell
      title="Current Queue Status"
      subtitle="Live updates — no need to refresh."
      badge="Patient"
    >
      {/* Top metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<Activity className="h-5 w-5" />}
          label="Currently Serving"
          value={status.currently_serving != null ? `#${status.currently_serving}` : "—"}
        />
        <MetricCard
          icon={<Ticket className="h-5 w-5" />}
          label="Your Token"
          value={`#${status.token_number}`}
          tone="primary"
        />
        <MetricCard
          icon={<Users className="h-5 w-5" />}
          label="People Ahead"
          value={status.people_ahead ?? 0}
        />
        <MetricCard
          icon={<Clock className="h-5 w-5" />}
          label="Estimated Wait"
          value={isNext ? "Now" : formatWait(status.estimated_wait_seconds)}
          tone="mint"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Queue progress */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">Queue Progress</h3>
            <span className="text-sm font-medium text-muted-foreground">
              Position {position} / {total}
            </span>
          </div>
          <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {isNext
              ? "You're at the front of the line."
              : `${status.people_ahead} ${status.people_ahead === 1 ? "person is" : "people are"} ahead of you.`}
          </p>

          {/* Live updates */}
          <div className="mt-6 flex items-center gap-2 rounded-2xl bg-secondary/70 px-4 py-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
            </span>
            <p className="text-sm text-muted-foreground">
              Live — updating in real time from the front desk.
            </p>
          </div>
        </Card>

        {/* Clinic status */}
        <Card>
          <h3 className="text-base font-semibold text-foreground">Clinic Status</h3>
          <div className={`mt-5 flex items-center gap-2 ${clinic.tone}`}>
            {clinic.icon}
            <span className="font-display text-xl font-semibold text-foreground">
              {clinic.label}
            </span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {clinicStatus === "active"
              ? "The queue is moving normally."
              : clinicStatus === "paused"
                ? "The queue is temporarily paused."
                : "The doctor is on a short break."}
          </p>
        </Card>
      </div>

      {/* Notifications */}
      <Card className="mt-4">
        <div className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-foreground" />
          <h3 className="text-base font-semibold text-foreground">Recent Updates</h3>
        </div>
        <ul className="mt-4 space-y-2.5">
          {notifications.map((n, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-2xl border border-border/50 bg-secondary/40 px-4 py-3 text-sm text-foreground"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {n}
            </li>
          ))}
        </ul>
      </Card>
    </DashboardShell>
  );
}
