import { useEffect, useRef, useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { QrCode, Clock, Users, Activity, Loader2, User, CheckCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/clinic/DashboardShell";
import { formatWait } from "@/lib/queue";
import { NotificationService } from "@/lib/NotificationService";

export const Route = createFileRoute("/track/$trackingCode")({
  component: TrackByCodePage,
});

function TrackByCodePage() {
  const { trackingCode } = Route.useParams();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (data && previousStatus !== data.status) {
      if (previousStatus === "waiting" && data.status === "in_progress") {
        NotificationService.notifyPatientCalled(data.patient_name, data.token_number, data.doctor_name);
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("ClinicFlow", {
            body: `It's your turn with ${data.doctor_name}. Please proceed to the consultation room.`,
          });
        }
      } else if (previousStatus === "in_progress" && data.status === "completed") {
        NotificationService.notifyConsultationComplete(data.patient_name, data.doctor_name);
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("ClinicFlow", {
            body: `Consultation Complete. Thank you for visiting!`,
          });
        }
      }
      setPreviousStatus(data.status);
    }
  }, [data, previousStatus]);

  // Use a ref so the Supabase realtime callback always calls the LATEST
  // fetchStatus — avoiding stale closure issues.
  const fetchStatusRef = useRef<() => void>(() => { });

  const fetchStatus = useCallback(async () => {
    console.log("[TrackPage] fetchStatus called");
    try {
      const { data: result, error: rpcError } = await supabase.rpc(
        "get_queue_status_by_tracking_code",
        { _tracking_code: trackingCode }
      );

      if (rpcError) throw rpcError;

      if (result && result.length > 0 && result[0].token_number !== 0) {
        console.log("[TrackPage] status updated", result[0]);
        setData(result[0]);
        setError(null);
      } else {
        setError("Token not found or no longer active for today.");
        setData(null);
      }
    } catch (err) {
      console.error("Failed to fetch token status:", err);
      setError("Failed to load queue status.");
    } finally {
      setLoading(false);
    }
  }, [trackingCode]);

  // Keep the ref up-to-date with the latest fetchStatus on every render
  useEffect(() => {
    fetchStatusRef.current = fetchStatus;
  });

  // Initial fetch
  useEffect(() => {
    if (!trackingCode) {
      setError("Invalid tracking code.");
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchStatus();
  }, [trackingCode, fetchStatus]);

  // Realtime subscriptions — both queue_entries AND doctors
  // The callback always calls fetchStatusRef.current so it NEVER has a stale closure.
  useEffect(() => {
    if (!trackingCode) return;

    const channel = supabase
      .channel(`track-page-${trackingCode}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "queue_entries",
        },
        (payload) => {
          console.log("[TrackPage] Realtime event received");
          console.log("[TrackPage] queue_entries update received", payload);
          // Always uses the latest fetchStatus via ref — no stale closure
          fetchStatusRef.current();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "doctors",
        },
        (payload) => {
          console.log("[TrackPage] Realtime event received");
          console.log("[TrackPage] doctor update received", payload);
          fetchStatusRef.current();
        }
      )
      .subscribe((status) => {
        console.log("REALTIME STATUS:", status);
        if (status === "SUBSCRIBED") {
          console.log("[TrackPage] Realtime channel subscribed successfully");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trackingCode]); // Only re-subscribe when trackingCode changes

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Loading live status...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-destructive/10 text-destructive p-4 rounded-full mb-6">
          <QrCode className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Token Unavailable</h1>
        <p className="text-muted-foreground max-w-md">
          {error || "This token could not be found. It may be from a previous day or entered incorrectly."}
        </p>
      </div>
    );
  }

  const {
    status,
    patient_name,
    token_number,
    estimated_wait_seconds,
    people_ahead,
    clinic_status,
    doctor_name,
    doctor_specialization,
  } = data;

  const isPaused = clinic_status === "paused" || clinic_status === "break";

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8 flex flex-col items-center justify-center">
      <Card className="w-full max-w-md p-6 sm:p-8 shadow-xl border-t-4 border-t-primary relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center relative z-10">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Live Queue Status
          </p>
          <h1 className="text-5xl font-display font-bold text-foreground mb-2">
            #{token_number}
          </h1>
          <p className="text-lg font-medium text-foreground flex items-center justify-center gap-2">
            <User className="h-4 w-4" /> {patient_name}
          </p>

          {doctor_name && (
            <div className="mt-3 inline-flex flex-col items-center justify-center rounded-2xl bg-secondary/50 px-4 py-2 border border-border/50">
              <span className="text-sm font-semibold text-foreground">{doctor_name}</span>
              {doctor_specialization && (
                <span className="text-xs text-muted-foreground">{doctor_specialization}</span>
              )}
            </div>
          )}

          <div className="my-8 space-y-4">
            {status === "in_progress" && (
              <div className="bg-primary/10 border border-primary/20 p-6 rounded-2xl animate-in fade-in zoom-in duration-500">
                <Activity className="h-10 w-10 text-primary mx-auto mb-3 animate-pulse" />
                <h2 className="text-2xl font-bold text-primary">It's Your Turn!</h2>
                <p className="text-sm text-primary/80 mt-1">Please proceed to the doctor's room.</p>
              </div>
            )}

            {status === "waiting" && isPaused && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl">
                <Clock className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                <h2 className="text-xl font-bold text-amber-600">Queue is Paused</h2>
                <p className="text-sm text-amber-600/80 mt-1">The clinic is temporarily on break. Check back shortly.</p>
              </div>
            )}

            {status === "waiting" && !isPaused && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary p-5 rounded-2xl flex flex-col items-center justify-center">
                  <Clock className="h-6 w-6 text-primary mb-2" />
                  <span className="text-3xl font-bold text-foreground">
                    {estimated_wait_seconds > 0 ? formatWait(estimated_wait_seconds) : "< 1m"}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Est. Wait</span>
                </div>
                <div className="bg-secondary p-5 rounded-2xl flex flex-col items-center justify-center">
                  <Users className="h-6 w-6 text-primary mb-2" />
                  <span className="text-3xl font-bold text-foreground">
                    {people_ahead}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Ahead of You</span>
                </div>
              </div>
            )}

            {status === "completed" && (
              <div className="bg-mint/10 border border-mint/20 p-6 rounded-2xl animate-in fade-in zoom-in duration-500">
                <CheckCircle className="h-10 w-10 text-mint-foreground mx-auto mb-3" />
                <h2 className="text-xl font-bold text-mint-foreground">Consultation Complete</h2>
                <p className="text-sm text-mint-foreground/80 mt-1">Thank you for visiting. We hope to see you again!</p>
              </div>
            )}

            {status === "skipped" && (
              <div className="bg-destructive/10 border border-destructive/20 p-6 rounded-2xl">
                <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
                <h2 className="text-xl font-bold text-destructive">You Were Skipped</h2>
                <p className="text-sm text-destructive/80 mt-1">Please see the receptionist to be re-added.</p>
              </div>
            )}

            {status === "no_show" && (
              <div className="bg-destructive/10 border border-destructive/20 p-6 rounded-2xl">
                <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
                <h2 className="text-xl font-bold text-destructive">Marked as No Show</h2>
                <p className="text-sm text-destructive/80 mt-1">Your token was marked as a no-show. Please see the receptionist.</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <p className="text-xs text-muted-foreground">Live • Updates automatically</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
