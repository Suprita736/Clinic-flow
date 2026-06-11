import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Loader2,
  Users,
  CheckCircle2,
  Clock,
  UserX,
  UserPlus,
  ChevronRight,
  SkipForward,
  Pause,
  Play,
  Coffee,
  Timer,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useRealtimeQueue } from "@/hooks/useRealtimeQueue";
import {
  fetchTodayEntries,
  fetchClinicState,
  addPatient,
  callNext,
  skipPatient,
  setClinicStatus,
  formatWait,
  type QueueEntry,
  type ClinicState,
  type QueueStatus,
} from "@/lib/queue";
import { DashboardShell, Card, MetricCard } from "@/components/clinic/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/receptionist")({
  component: ReceptionistDashboard,
});

const STATUS_STYLES: Record<QueueStatus, string> = {
  waiting: "bg-secondary text-foreground",
  in_progress: "bg-primary text-primary-foreground",
  completed: "bg-mint text-mint-foreground",
  skipped: "bg-destructive/10 text-destructive",
};

const STATUS_LABEL: Record<QueueStatus, string> = {
  waiting: "Waiting",
  in_progress: "In Progress",
  completed: "Completed",
  skipped: "Skipped",
};

function ReceptionistDashboard() {
  const { role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [clinic, setClinic] = useState<ClinicState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!authLoading && role && role !== "receptionist") {
      navigate({ to: "/patient" });
    }
  }, [authLoading, role, navigate]);

  const load = useCallback(async () => {
    try {
      const [e, c] = await Promise.all([fetchTodayEntries(), fetchClinicState()]);
      setEntries(e);
      setClinic(c);
    } catch {
      // ignore transient
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeQueue(load);

  const metrics = useMemo(() => {
    const waiting = entries.filter((e) => e.status === "waiting").length;
    const served = entries.filter((e) => e.status === "completed").length;
    const noShows = entries.filter((e) => e.status === "skipped").length;
    return { waiting, served, noShows };
  }, [entries]);

  const wrap = async (fn: () => Promise<void>, ok?: string) => {
    setBusy(true);
    try {
      await fn();
      if (ok) toast.success(ok);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Enter the patient's name");
      return;
    }
    await wrap(async () => {
      await addPatient(name.trim(), phone.trim());
      setName("");
      setPhone("");
    }, "Patient added & token generated");
  };

  if (loading) {
    return (
      <DashboardShell title="Front Desk" subtitle="Loading the live queue…" badge="Receptionist">
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardShell>
    );
  }

  const clinicStatus = clinic?.status ?? "active";
  const avgWait = formatWait(clinic?.avg_consultation_seconds);
  const currentWaitPrediction = formatWait((clinic?.avg_consultation_seconds ?? 900) * metrics.waiting);

  return (
    <DashboardShell
      title="Front Desk"
      subtitle="Manage your live clinic queue."
      badge="Receptionist"
    >
      {/* Top metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={<Users className="h-5 w-5" />} label="Patients Waiting" value={metrics.waiting} tone="primary" />
        <MetricCard icon={<CheckCircle2 className="h-5 w-5" />} label="Served Today" value={metrics.served} />
        <MetricCard icon={<Clock className="h-5 w-5" />} label="Avg Consultation" value={avgWait} tone="mint" />
        <MetricCard icon={<UserX className="h-5 w-5" />} label="No Shows" value={metrics.noShows} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Add patient */}
        <Card>
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-foreground" />
            <h3 className="text-base font-semibold text-foreground">Add Patient</h3>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">A token is generated automatically.</p>
          <form onSubmit={handleAdd} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Patient Name</Label>
              <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-phone">Phone Number</Label>
              <Input id="p-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 0000" maxLength={20} />
            </div>
            <Button type="submit" variant="pill" className="w-full" size="lg" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Patient"}
            </Button>
          </form>
        </Card>

        {/* Queue controls */}
        <Card className="lg:col-span-2">
          <h3 className="text-base font-semibold text-foreground">Queue Controls</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Status:{" "}
            <span className="font-medium text-foreground capitalize">
              {clinicStatus === "break" ? "doctor on break" : clinicStatus}
            </span>
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Button variant="hero" className="col-span-2 sm:col-span-1" disabled={busy} onClick={() => wrap(callNext, "Called next patient")}>
              Call Next <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="pillOutline"
              disabled={busy || clinicStatus === "active"}
              onClick={() => wrap(() => setClinicStatus("active"), "Queue resumed")}
            >
              <Play className="h-4 w-4" /> Resume
            </Button>
            <Button
              variant="pillOutline"
              disabled={busy || clinicStatus === "paused"}
              onClick={() => wrap(() => setClinicStatus("paused"), "Queue paused")}
            >
              <Pause className="h-4 w-4" /> Pause
            </Button>
            <Button
              variant="pillOutline"
              disabled={busy || clinicStatus === "break"}
              onClick={() => wrap(() => setClinicStatus("break"), "Marked: doctor on break")}
            >
              <Coffee className="h-4 w-4" /> Break
            </Button>
          </div>

          {/* Analytics */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-secondary/60 p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Timer className="h-4 w-4" />
                <span className="text-xs font-medium">Rolling Avg</span>
              </div>
              <p className="mt-2 font-display text-xl font-semibold text-foreground">{avgWait}</p>
            </div>
            <div className="rounded-2xl bg-secondary/60 p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-medium">Served Today</span>
              </div>
              <p className="mt-2 font-display text-xl font-semibold text-foreground">{metrics.served}</p>
            </div>
            <div className="rounded-2xl bg-secondary/60 p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-medium">Wait Prediction</span>
              </div>
              <p className="mt-2 font-display text-xl font-semibold text-foreground">{currentWaitPrediction}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Queue table */}
      <Card className="mt-4 p-0">
        <div className="flex items-center justify-between p-6 pb-4">
          <h3 className="text-base font-semibold text-foreground">Current Queue</h3>
          <span className="text-sm text-muted-foreground">{entries.length} today</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-y border-border/60 bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-6 py-3 font-medium">Token</th>
                <th className="px-6 py-3 font-medium">Patient</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">
                    No patients in the queue yet. Add one to get started.
                  </td>
                </tr>
              )}
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-border/40 last:border-0">
                  <td className="px-6 py-4 font-display text-lg font-semibold text-foreground">
                    #{e.token_number}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-foreground">{e.patient_name}</p>
                    {e.phone && <p className="text-xs text-muted-foreground">{e.phone}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[e.status]}`}>
                      {STATUS_LABEL[e.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {(e.status === "waiting" || e.status === "in_progress") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => wrap(() => skipPatient(e.id), "Patient skipped")}
                      >
                        <SkipForward className="h-4 w-4" /> Skip
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </DashboardShell>
  );
}
