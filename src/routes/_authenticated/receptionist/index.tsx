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
  Pause,
  Play,
  X,
  QrCode,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useRealtimeQueue } from "@/hooks/useRealtimeQueue";
import { formatWait, skipPatient, recallPatient, markNoShowAndAdvance } from "@/lib/queue";
import { useQueue } from "@/hooks/useQueue";
import { useDoctors } from "@/hooks/useDoctors";
import { useClinicSettings } from "@/hooks/useClinicSettings";
import { useAddPatient } from "@/hooks/useAddPatient";
import { usePatients } from "@/hooks/usePatients";
import { useCallNext } from "@/hooks/useCallNext";
import { useCompleteConsultation } from "@/hooks/useCompleteConsultation";
import { AnalyticsEngine } from "@/lib/analytics-engine";
import { WaitPredictionEngine } from "@/lib/wait-prediction-engine";
import { NotificationService } from "@/lib/NotificationService";
import { DashboardShell, Card, MetricCard } from "@/components/clinic/DashboardShell";
import { TokenSlipActions } from "@/components/clinic/TokenSlipPDF";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/receptionist/")({
  component: ReceptionistDashboard,
});

const STATUS_STYLES: Record<string, string> = {
  waiting: "bg-secondary text-foreground",
  in_progress: "bg-primary text-primary-foreground",
  completed: "bg-mint text-mint-foreground",
  skipped: "bg-destructive/20 text-destructive",
  no_show: "bg-destructive text-destructive-foreground",
};

const STATUS_LABEL: Record<string, string> = {
  waiting: "Waiting",
  in_progress: "In Progress",
  completed: "Completed",
  skipped: "Skipped",
  no_show: "No Show",
};

function ReceptionistDashboard() {
  const { role, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const { tokens, loading: queueLoading, fetchTokens } = useQueue();
  const { doctors, loading: docsLoading, updateDoctorStatus } = useDoctors();
  const { settings, loading: settingsLoading, fetchSettings } = useClinicSettings();
  const { addPatient } = useAddPatient();
  const { callNext } = useCallNext();
  const { completeConsultation } = useCompleteConsultation();

  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedQRToken, setSelectedQRToken] = useState<{ tokenNumber: number; patientName: string; trackingCode: string; doctorName: string; doctorSpecialization: string } | null>(null);

  const [globalDoctorId, setGlobalDoctorId] = useState<string>("");
  const [formDoctorId, setFormDoctorId] = useState<string>("");

  const [nowTime, setNowTime] = useState(Date.now());
  const [dismissedNoShowId, setDismissedNoShowId] = useState<string | null>(null);

  const { searchPatients } = usePatients();
  const [patientSuggestions, setPatientSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounced search
  useEffect(() => {
    if (name.length >= 2) {
      const delayFn = setTimeout(async () => {
        const results = await searchPatients(name);
        setPatientSuggestions(results);
      }, 300);
      return () => clearTimeout(delayFn);
    } else {
      setPatientSuggestions([]);
    }
  }, [name]);

  const selectPatient = (p: any) => {
    setName(p.name);
    setPhone(p.phone || "");
    if (p.preferred_doctor_id && doctors.some(d => d.id === p.preferred_doctor_id)) {
      setFormDoctorId(p.preferred_doctor_id);
    }
    setShowSuggestions(false);
  };

  const loading = queueLoading || settingsLoading || docsLoading;

  useEffect(() => {
    if (doctors.length > 0 && !globalDoctorId) {
      setGlobalDoctorId(doctors[0].id);
      setFormDoctorId(doctors[0].id);
    }
  }, [doctors, globalDoctorId]);



  const load = useCallback(() => {
    fetchTokens();
    fetchSettings();
  }, [fetchTokens, fetchSettings]);

  useEffect(() => {
    if (role === "receptionist") {
      const runReset = async () => {
        const { error } = await supabase.rpc("perform_daily_reset");
        if (error) {
          console.error("[ReceptionistDashboard] Daily reset check failed:", error);
        }
      };
      runReset();
    }
  }, [role]);

  useRealtimeQueue(load);

  const doctorTokens = useMemo(() => tokens.filter(t => t.doctor_id === globalDoctorId), [tokens, globalDoctorId]);
  const selectedDoctor = useMemo(() => doctors.find(d => d.id === globalDoctorId), [doctors, globalDoctorId]);

  const inProgressEntry = useMemo(() => doctorTokens.find(t => t.status === "in_progress"), [doctorTokens]);

  useEffect(() => {
    if (!inProgressEntry) {
      setDismissedNoShowId(null);
      return;
    }
    const interval = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [inProgressEntry?.id]);

  const countdownSeconds = useMemo(() => {
    if (!inProgressEntry || !inProgressEntry.served_at) return 0;
    const elapsed = Math.floor((nowTime - new Date(inProgressEntry.served_at).getTime()) / 1000);
    return Math.max(30 - elapsed, 0);
  }, [inProgressEntry, nowTime]);

  const metrics = useMemo(() => {
    const fallbackAvg = selectedDoctor?.avg_consultation_seconds ? Math.round(selectedDoctor.avg_consultation_seconds / 60) : 8;
    const rollingAvg = AnalyticsEngine.calculateRollingAverage(doctorTokens, fallbackAvg);

    const waitingLength = doctorTokens.filter((e) => e.status === "waiting").length;
    const avgWaitTimeMinutes = WaitPredictionEngine.calculateEstimatedWait(
      waitingLength,
      rollingAvg,
      inProgressEntry
    );

    const snapshot = AnalyticsEngine.generateDailySnapshot(doctorTokens, fallbackAvg, avgWaitTimeMinutes);

    return {
      waiting: snapshot.currentQueueLength,
      served: snapshot.completedToday,
      noShows: doctorTokens.filter(t => t.status === "skipped" || t.status === "no_show").length,
      rollingAvg: snapshot.averageConsultationDuration,
      avgWaitTime: snapshot.averageWaitTime,
      patientsToday: snapshot.patientsToday,
    };
  }, [doctorTokens, selectedDoctor, inProgressEntry]);

  const wrap = async (fn: () => Promise<void>, ok?: string) => {
    setBusy(true);
    try {
      await fn();
      if (ok) toast.success(ok);
    } catch (err) {
      console.error("[ReceptionistDashboard] action failed:", err);
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
    setBusy(true);
    try {
      if (!formDoctorId) {
        toast.error("Please select a doctor");
        return;
      }
      const { tokenNumber, trackingCode } = await addPatient(name.trim(), phone.trim(), formDoctorId);
      toast.success("Patient added & token generated");
      
      const dName = doctors.find(d => d.id === formDoctorId)?.name || "";
      const dSpec = doctors.find(d => d.id === formDoctorId)?.specialization || "";
      
      NotificationService.sendTokenCreated(name.trim(), tokenNumber, trackingCode, dName);
      setName("");
      setPhone("");
      setSelectedQRToken({ tokenNumber, patientName: name.trim(), trackingCode, doctorName: dName, doctorSpecialization: dSpec });
    } catch (err) {
      console.error("[ReceptionistDashboard] action failed:", err);
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
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

  const isPaused = selectedDoctor?.status === "paused" || selectedDoctor?.status === "break";
  const clinicStatus = isPaused ? "paused" : "active";
  const avgWait = formatWait(metrics.rollingAvg * 60);
  const currentWaitPrediction = formatWait(metrics.avgWaitTime * 60);

  return (
    <DashboardShell
      title="Front Desk"
      subtitle="Manage your live clinic queue."
      badge="Receptionist"
      hideHeader={true}
    >
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="w-full sm:max-w-[280px]">
          <Label className="mb-1.5 block text-sm text-muted-foreground">Select Doctor</Label>
          <Select value={globalDoctorId} onValueChange={(val) => { setGlobalDoctorId(val); setFormDoctorId(val); }}>
            <SelectTrigger className="w-full bg-card">
              <SelectValue placeholder="Select Doctor" />
            </SelectTrigger>
            <SelectContent>
              {doctors.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name} — {d.specialization}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Top metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={<Users className="h-5 w-5" />} label="Patients Waiting" value={metrics.waiting} tone="primary" />
        <MetricCard icon={<CheckCircle2 className="h-5 w-5" />} label="Served Today" value={metrics.served} />
        <MetricCard icon={<Clock className="h-5 w-5" />} label="Avg Consultation" value={avgWait} tone="mint" />
        <MetricCard icon={<UserX className="h-5 w-5" />} label="Skipped / No Shows" value={metrics.noShows} />
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
            <div className="space-y-1.5 relative">
              <Label htmlFor="p-name">Patient Name</Label>
              <Input 
                id="p-name" 
                value={name} 
                onChange={(e) => {
                  setName(e.target.value);
                  setShowSuggestions(true);
                }} 
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="John Doe" 
                maxLength={100} 
                autoComplete="off"
              />
              {showSuggestions && patientSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-border/50 bg-card shadow-card overflow-hidden">
                  {patientSuggestions.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors border-b border-border/30 last:border-0"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectPatient(p);
                      }}
                    >
                      <span className="font-medium text-foreground block">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.phone} • {p.visit_count} visits</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-phone">Phone Number</Label>
              <Input id="p-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 0000" maxLength={20} />
            </div>
            <div className="space-y-1.5">
              <Label>Assign To Doctor</Label>
              <Select value={formDoctorId} onValueChange={setFormDoctorId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={!name.trim() || busy || !formDoctorId} className="w-full">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Add Patient & Assign Token"}
            </Button>
          </form>
        </Card>

        {/* Queue controls */}
        <Card className="lg:col-span-2">
          <h3 className="text-base font-semibold text-foreground">Queue Controls</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Status:{" "}
            <span className="font-medium text-foreground capitalize">
              {clinicStatus}
            </span>
          </p>

          {!selectedDoctor && (
            <div className="mt-4 text-sm text-muted-foreground p-4 bg-secondary rounded-xl">
              Please select a doctor to manage their queue.
            </div>
          )}

          {selectedDoctor && countdownSeconds === 0 && inProgressEntry && inProgressEntry.id !== dismissedNoShowId && (
            <div className="mt-4 rounded-md bg-destructive/10 p-4 border border-destructive/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-destructive">No Show Detected?</p>
                <p className="text-sm text-destructive/80">
                  Patient #{inProgressEntry.token_number} has not arrived after 30 seconds.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setDismissedNoShowId(inProgressEntry.id)}>Dismiss</Button>
                <Button variant="destructive" size="sm" disabled={busy} onClick={() => wrap(() => markNoShowAndAdvance(inProgressEntry.id, globalDoctorId, selectedDoctor?.name || ""), "Marked No Show and Called Next")}>Mark No-Show & Next</Button>
              </div>
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Button variant="hero" className="col-span-1" disabled={busy || !selectedDoctor} onClick={() => wrap(() => callNext(globalDoctorId), "Called next patient")}>
              Call Next <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="hero" className="col-span-1 bg-mint text-mint-foreground hover:bg-mint/90" disabled={busy || !selectedDoctor} onClick={() => wrap(() => completeConsultation(globalDoctorId), "Consultation completed")}>
              Complete <CheckCircle2 className="h-4 w-4" />
            </Button>
            <Button
              variant="pillOutline"
              disabled={busy || !isPaused || !selectedDoctor}
              onClick={() => wrap(() => updateDoctorStatus(globalDoctorId, false), "Queue resumed")}
            >
              <Play className="h-4 w-4" /> Resume
            </Button>
            <Button
              variant="pillOutline"
              disabled={busy || isPaused || !selectedDoctor}
              onClick={() => wrap(() => updateDoctorStatus(globalDoctorId, true), "Queue paused")}
            >
              <Pause className="h-4 w-4" /> Pause
            </Button>
          </div>
        </Card>
      </div>

      {/* Queue table */}
      <Card className="mt-4 p-0">
        <div className="flex items-center justify-between p-6 pb-4">
          <h3 className="text-base font-semibold text-foreground">Current Queue</h3>
          <span className="text-sm text-muted-foreground">{doctorTokens.length} today for {selectedDoctor?.name || 'Selected Doctor'}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-y border-border/60 bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-6 py-3 font-medium">Token</th>
                <th className="px-6 py-3 font-medium">Patient</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {doctorTokens.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">
                    No patients in the queue for this doctor.
                  </td>
                </tr>
              )}
              {doctorTokens.map((e) => (
                <tr key={e.id} className="border-b border-border/40 last:border-0">
                  <td className="px-6 py-4 font-display text-lg font-semibold text-foreground">
                    #{e.token_number}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-foreground">
                      {e.patient_name}
                    </p>
                    {e.phone && <p className="text-xs text-muted-foreground">{e.phone}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[e.status]}`}>
                      {STATUS_LABEL[e.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setSelectedQRToken({ tokenNumber: e.token_number, patientName: e.patient_name, trackingCode: e.tracking_code || `${e.token_number}`, doctorName: selectedDoctor?.name || "", doctorSpecialization: selectedDoctor?.specialization || "" })}>
                        <QrCode className="h-4 w-4" />
                      </Button>
                      {e.status === "waiting" && (
                        <Button variant="outline" size="sm" className="h-8 text-destructive border-destructive/20 hover:bg-destructive/10" disabled={busy} onClick={() => wrap(() => skipPatient(e.id, globalDoctorId), "Patient skipped")}>
                          Skip
                        </Button>
                      )}
                      {(e.status === "skipped" || e.status === "no_show") && (
                        <Button variant="outline" size="sm" className="h-8 text-mint border-mint/20 hover:bg-mint/10" disabled={busy} onClick={() => wrap(() => recallPatient(e.id, globalDoctorId), "Patient recalled")}>
                          Recall
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* QR Code Modal */}
      {selectedQRToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-sm animate-in fade-in zoom-in-95 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Patient QR Token</h3>
              <Button variant="ghost" size="icon" className="-mr-2 -mt-2" onClick={() => setSelectedQRToken(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="text-center">
                <p className="text-3xl font-bold">#{selectedQRToken.tokenNumber}</p>
                <p className="text-muted-foreground mt-1">{selectedQRToken.patientName}</p>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border">
                <QRCodeSVG
                  value={`${window.location.origin}/track/${selectedQRToken.trackingCode}`}
                  size={200}
                  level="M"
                />
              </div>

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Scan this code to track wait time live.
                </p>
                <a
                  href={`${window.location.origin}/track/${selectedQRToken.trackingCode}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline block"
                >
                  {window.location.origin}/track/{selectedQRToken.trackingCode}
                </a>
              </div>

              <TokenSlipActions 
                tokenNumber={selectedQRToken.tokenNumber} 
                patientName={selectedQRToken.patientName} 
                trackingCode={selectedQRToken.trackingCode} 
                doctorName={selectedQRToken.doctorName}
                doctorSpecialization={selectedQRToken.doctorSpecialization}
              />

              <Button className="w-full" onClick={() => setSelectedQRToken(null)}>
                Done
              </Button>
            </div>
          </Card>
        </div>
      )}
    </DashboardShell>
  );
}
