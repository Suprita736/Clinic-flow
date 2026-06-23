import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinicSettings } from "./useClinicSettings";
import { WaitPredictionEngine } from "@/lib/wait-prediction-engine";
import type { QueueEntryRow } from "./useQueue";

export type PatientQueueStatus = {
  has_entry: boolean;
  token_number?: number;
  my_status?: "waiting" | "in_progress" | "completed" | "skipped" | "no_show";
  people_ahead?: number;
  currently_serving: number | null;
  total_waiting: number;
  estimated_wait_minutes?: number;
  position?: number;
};

export function usePatientQueue(userId: string | undefined) {
  const [status, setStatus] = useState<PatientQueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const { settings } = useClinicSettings();

  const fetchStatus = useCallback(async () => {
    try {

      // 1. Fetch patient queue status from the security definer function
      const { data: queueData, error: queueErr } = await supabase.rpc("get_my_queue_status");

      if (queueErr) throw queueErr;

      const queueStatus = queueData as any;

      // 2. Fetch the active consultation (served_at timestamp)
      const { data: activeData, error: activeErr } = await supabase.rpc("get_active_consultation");
      if (activeErr) throw activeErr;

      const activeList = activeData as { token_number: number; served_at: string }[] | null;
      const activeConsultation = activeList && activeList.length > 0 ? activeList[0] : null;

      // 3. Compute metrics
      const currently_serving = activeConsultation ? activeConsultation.token_number : (queueStatus?.currently_serving || null);
      const total_waiting = queueStatus?.total_waiting || 0;

      let myStatus: PatientQueueStatus = {
        has_entry: queueStatus?.has_entry || false,
        currently_serving,
        total_waiting
      };

      if (queueStatus?.has_entry) {
        myStatus.token_number = queueStatus.token_number;
        myStatus.my_status = queueStatus.my_status;
        myStatus.people_ahead = queueStatus.people_ahead ?? 0;
        myStatus.position = queueStatus.queue_position ?? 1;

        if (myStatus.my_status === "waiting") {
          const fallbackAvg = settings?.avg_consultation_time || 8;

          // Construct a mock QueueEntryRow for the wait prediction engine
          const mockActiveEntry = activeConsultation ? {
            token_number: activeConsultation.token_number,
            served_at: activeConsultation.served_at,
          } as QueueEntryRow : undefined;

          myStatus.estimated_wait_minutes = WaitPredictionEngine.calculateEstimatedWait(
            myStatus.people_ahead ?? 0,
            fallbackAvg,
            mockActiveEntry
          );
        } else if (myStatus.my_status === "in_progress") {
          myStatus.people_ahead = 0;
          myStatus.estimated_wait_minutes = 0;
          myStatus.position = 0;
        }
      }

      setStatus(myStatus);
    } catch (err) {
      console.error("[usePatientQueue] Error fetching patient queue status:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, settings?.avg_consultation_time]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { status, loading, fetchStatus };
}
