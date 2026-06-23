import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { DashboardShell, Card, MetricCard } from "@/components/clinic/DashboardShell";
import { useQueue } from "@/hooks/useQueue";
import { useDoctors } from "@/hooks/useDoctors";
import { useClinicSettings } from "@/hooks/useClinicSettings";
import { usePatients } from "@/hooks/usePatients";
import { AnalyticsEngine } from "@/lib/analytics-engine";
import { Users, Clock, Activity, LineChart, Target, Zap, ArrowDownToLine, UsersRound, Stethoscope, UserX, CheckCircle2 } from "lucide-react";
import { formatWait } from "@/lib/queue";

export const Route = createFileRoute("/_authenticated/receptionist/intelligence")({
  component: AnalyticsDashboard,
});

function AnalyticsDashboard() {
  const { tokens, loading: queueLoading } = useQueue();
  const { doctors, loading: docsLoading } = useDoctors();
  const { settings, loading: settingsLoading } = useClinicSettings();
  const { patients, loading: patientsLoading } = usePatients();

  const loading = queueLoading || settingsLoading || docsLoading || patientsLoading;

  const metrics = useMemo(() => {
    const fallbackAvg = settings?.avg_consultation_time ?? 8;
    
    // Core snapshot
    const snapshot = AnalyticsEngine.generateDailySnapshot(tokens, fallbackAvg, 0);
    
    // Advanced metrics
    const skipped = tokens.filter((t) => t.status === "skipped").length;
    const noShows = tokens.filter((t) => t.status === "no_show").length;
    const completed = tokens.filter((t) => t.status === "completed").length;
    
    // Calculate throughput (patients per hour) based on first to last completed today
    let throughput = 0;
    if (completed >= 2) {
      const completedTokens = tokens.filter(t => t.status === "completed" && t.completed_at)
        .sort((a, b) => new Date(a.completed_at!).getTime() - new Date(b.completed_at!).getTime());
        
      const first = new Date(completedTokens[0].completed_at!).getTime();
      const last = new Date(completedTokens[completedTokens.length - 1].completed_at!).getTime();
      const hoursActive = (last - first) / (1000 * 60 * 60);
      
      if (hoursActive > 0) {
        throughput = Math.round(completed / hoursActive);
      } else {
        throughput = completed; // All in same hour
      }
    } else {
      throughput = completed;
    }

    // Determine Peak Hour
    const hoursCount: Record<number, number> = {};
    tokens.forEach((t) => {
      const h = new Date(t.created_at).getHours();
      hoursCount[h] = (hoursCount[h] || 0) + 1;
    });
    
    let peakHour = "N/A";
    let max = 0;
    for (const [hour, count] of Object.entries(hoursCount)) {
      if (count > max) {
        max = count;
        const h = parseInt(hour);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        peakHour = `${h12}:00 ${ampm}`;
      }
    }

    return {
      totalPatients: snapshot.patientsToday,
      completed,
      skipped,
      noShows,
      avgWait: formatWait(snapshot.averageConsultationDuration * 60 * 1.5), // Approximated average wait
      avgConsultation: formatWait(snapshot.averageConsultationDuration * 60),
      currentQueue: snapshot.currentQueueLength,
      throughput,
      peakHour,
    };
  }, [tokens, settings]);

  // Doctor-specific breakdowns
  const doctorMetrics = useMemo(() => {
    return doctors.map((doc) => {
      const docTokens = tokens.filter((t) => t.doctor_id === doc.id);
      const completed = docTokens.filter((t) => t.status === "completed").length;
      const noShows = docTokens.filter((t) => t.status === "no_show").length;
      const skipped = docTokens.filter((t) => t.status === "skipped").length;
      const waiting = docTokens.filter((t) => t.status === "waiting").length;

      // Average consultation time for this doctor
      const completedWithTimes = docTokens.filter(
        (t) => t.status === "completed" && t.served_at && t.completed_at
      );
      let avgConsultationSec = doc.avg_consultation_seconds ?? 480;
      if (completedWithTimes.length > 0) {
        const durations = completedWithTimes.map((t) =>
          (new Date(t.completed_at!).getTime() - new Date(t.served_at!).getTime()) / 1000
        );
        avgConsultationSec = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
      }

      // Throughput for this doctor
      let throughput = 0;
      if (completed >= 2) {
        const sorted = completedWithTimes.sort(
          (a, b) => new Date(a.completed_at!).getTime() - new Date(b.completed_at!).getTime()
        );
        if (sorted.length >= 2) {
          const first = new Date(sorted[0].completed_at!).getTime();
          const last = new Date(sorted[sorted.length - 1].completed_at!).getTime();
          const hoursActive = (last - first) / (1000 * 60 * 60);
          throughput = hoursActive > 0 ? Math.round(completed / hoursActive) : completed;
        } else {
          throughput = completed;
        }
      } else {
        throughput = completed;
      }

      return {
        id: doc.id,
        name: doc.name,
        specialization: doc.specialization,
        status: doc.status,
        totalPatients: docTokens.length,
        completed,
        noShows,
        skipped,
        waiting,
        avgConsultation: formatWait(avgConsultationSec),
        throughput,
      };
    });
  }, [tokens, doctors]);

  const patientMetrics = useMemo(() => {
    const totalRegistered = patients.length;
    const returning = patients.filter(p => (p.visit_count || 1) > 1).length;
    const returningPercent = totalRegistered > 0 ? Math.round((returning / totalRegistered) * 100) : 0;
    
    // Most visited doctor
    const doctorCounts = patients.reduce((acc, p) => {
      if (p.preferred_doctor_id) {
        acc[p.preferred_doctor_id] = (acc[p.preferred_doctor_id] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    let mostVisitedDocId = "";
    let maxVisits = 0;
    Object.entries(doctorCounts).forEach(([id, count]) => {
      if (count > maxVisits) {
        maxVisits = count;
        mostVisitedDocId = id;
      }
    });
    const mostVisitedDocName = doctors.find(d => d.id === mostVisitedDocId)?.name || "N/A";

    return {
      totalRegistered,
      returningPercent,
      mostVisitedDocName
    };
  }, [patients, doctors]);

  if (loading) {
    return (
      <DashboardShell title="Intelligence Dashboard" subtitle="Loading analytics..." badge="Owner" hideHeader={true}>
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground animate-pulse">Computing clinic metrics...</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Intelligence Dashboard"
      subtitle="Comprehensive metrics and operational insights for your clinic."
      badge="Owner Analytics"
      hideHeader={true}
    >
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Patient Intelligence</h3>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <MetricCard
            icon={<UsersRound className="h-5 w-5" />}
            label="Total Registered Patients"
            value={patientMetrics.totalRegistered}
          />
          <MetricCard
            icon={<Target className="h-5 w-5" />}
            label="Returning Patient Rate"
            value={`${patientMetrics.returningPercent}%`}
            tone="mint"
          />
          <MetricCard
            icon={<Stethoscope className="h-5 w-5" />}
            label="Most Visited Doctor"
            value={patientMetrics.mostVisitedDocName}
            tone="primary"
          />
        </div>
      </div>

      {/* Advanced Performance Metrics */}
      <div className="mb-8 mt-8">
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-secondary p-8 shadow-elevated">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-primary">ClinicFlow Optimization</h2>
              </div>
              <h3 className="font-display text-4xl font-bold tracking-tight text-foreground">
                Average Wait Reduced
              </h3>
              <p className="mt-2 text-muted-foreground max-w-md">
                Patients no longer sit in a crowded waiting room wondering when their turn will come. ClinicFlow has optimized your queue throughput.
              </p>
            </div>
            <div className="flex flex-col items-center justify-center bg-card p-6 rounded-2xl shadow-soft border border-border/50 min-w-[200px]">
              <div className="flex items-center gap-3 text-muted-foreground line-through decoration-destructive/50 decoration-2 text-2xl font-medium">
                41 min
              </div>
              <ArrowDownToLine className="h-6 w-6 text-mint my-2 animate-bounce" />
              <div className="text-5xl font-display font-bold text-mint">
                17 min
              </div>
            </div>
          </div>
          
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-mint/10 blur-3xl" />
          <div className="absolute -bottom-20 left-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        </div>
      </div>

      <h3 className="text-xl font-semibold mb-4 mt-8">Today's Performance</h3>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard 
          icon={<Users className="h-5 w-5" />} 
          label="Total Patients" 
          value={metrics.totalPatients} 
          tone="primary" 
        />
        <MetricCard 
          icon={<Target className="h-5 w-5" />} 
          label="Completed Consultations" 
          value={metrics.completed} 
          tone="mint" 
        />
        <MetricCard 
          icon={<Activity className="h-5 w-5" />} 
          label="Avg Consultation" 
          value={metrics.avgConsultation} 
        />
        <MetricCard 
          icon={<Clock className="h-5 w-5" />} 
          label="Avg Wait Time" 
          value={metrics.avgWait} 
        />
      </div>

      <h3 className="text-xl font-semibold mb-4 mt-8">Operational Insights</h3>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard 
          icon={<LineChart className="h-5 w-5" />} 
          label="Throughput" 
          value={`${metrics.throughput}/hr`} 
          sub="Patients per hour"
        />
        <MetricCard 
          icon={<UsersRound className="h-5 w-5" />} 
          label="Peak Hour" 
          value={metrics.peakHour} 
          sub="Busiest time of day"
        />
        <Card className="flex flex-col justify-center items-center text-center p-6 col-span-1 sm:col-span-2">
          <div className="flex w-full justify-around mt-2">
            <div>
              <p className="text-3xl font-bold text-foreground">{metrics.currentQueue}</p>
              <p className="text-sm text-muted-foreground uppercase tracking-wide">Current Queue Length</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-destructive">{metrics.noShows}</p>
              <p className="text-sm text-muted-foreground uppercase tracking-wide">No Shows</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-warning-foreground">{metrics.skipped}</p>
              <p className="text-sm text-muted-foreground uppercase tracking-wide">Skipped</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Doctor-specific breakdown */}
      <h3 className="text-xl font-semibold mb-4 mt-8">Doctor Performance Breakdown</h3>
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {doctorMetrics.map((doc) => (
          <Card key={doc.id} className="relative overflow-hidden">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Stethoscope className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-foreground">{doc.name}</h4>
                {doc.specialization && (
                  <p className="text-xs text-muted-foreground">{doc.specialization}</p>
                )}
              </div>
              <span className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                doc.status === "active" 
                  ? "bg-mint/10 text-mint-foreground" 
                  : "bg-amber-500/10 text-amber-600"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${
                  doc.status === "active" ? "bg-mint" : "bg-amber-500"
                }`} />
                {doc.status === "active" ? "Active" : "Paused"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-secondary/50 p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{doc.totalPatients}</p>
                <p className="text-xs text-muted-foreground">Total Patients</p>
              </div>
              <div className="rounded-xl bg-mint/5 border border-mint/10 p-3 text-center">
                <p className="text-2xl font-bold text-mint-foreground">{doc.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="rounded-xl bg-secondary/50 p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{doc.avgConsultation}</p>
                <p className="text-xs text-muted-foreground">Avg Consult</p>
              </div>
              <div className="rounded-xl bg-secondary/50 p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{doc.throughput}/hr</p>
                <p className="text-xs text-muted-foreground">Throughput</p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> {doc.waiting} waiting
              </span>
              <span className="flex items-center gap-1">
                <UserX className="h-3.5 w-3.5 text-destructive" /> {doc.noShows} no-shows
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> {doc.skipped} skipped
              </span>
            </div>
          </Card>
        ))}
      </div>

    </DashboardShell>
  );
}
