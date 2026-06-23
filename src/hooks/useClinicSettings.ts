import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useClinicSettings() {
  const [settings, setSettings] = useState<{ id: number; avg_consultation_time: number; queue_paused: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("clinic_state")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setSettings({
          id: data.id,
          avg_consultation_time: Math.round(data.avg_consultation_seconds / 60),
          queue_paused: data.status === "paused" || data.status === "break",
        });
      }
    } catch (err) {
      console.error("[useClinicSettings] fetchSettings error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateConsultationTime = async (minutes: number) => {
    try {
      const seconds = minutes * 60;
      const { error } = await supabase
        .from("clinic_state")
        .update({ avg_consultation_seconds: seconds })
        .eq("id", 1);
      if (error) throw error;
      await fetchSettings();
    } catch (err) {
      console.error("[useClinicSettings] updateConsultationTime error:", err);
      throw err;
    }
  };

  const updateQueuePaused = async (paused: boolean) => {
    try {
      const nextStatus = paused ? "paused" : "active";
      const { error } = await supabase
        .from("clinic_state")
        .update({ status: nextStatus })
        .eq("id", 1);
      if (error) throw error;
      await fetchSettings();
    } catch (err) {
      console.error("[useClinicSettings] updateQueuePaused error:", err);
      throw err;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { settings, loading, fetchSettings, updateConsultationTime, updateQueuePaused };
}
