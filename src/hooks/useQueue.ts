import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Matches the queue_entries row shape from the canonical schema. */
export type QueueEntryRow = {
  id: string;
  token_number: number;
  patient_name: string;
  phone: string;
  status: "waiting" | "in_progress" | "completed" | "skipped" | "no_show";
  user_id: string | null;
  queue_date: string;
  created_at: string;
  updated_at: string;
  served_at: string | null;
  completed_at: string | null;
  recalled_at?: string | null;
  tracking_code?: string | null;
  doctor_id: string;
  doctors?: {
    name: string;
    specialization: string | null;
  };
};

/** @deprecated Use QueueEntryRow instead */
export type Token = QueueEntryRow;

const todayStr = () => new Date().toISOString().slice(0, 10);

export function useQueue() {
  const [tokens, setTokens] = useState<QueueEntryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTokens = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("queue_entries")
        .select("*, doctors(name, specialization)")
        .eq("queue_date", todayStr())
        .order("token_number", { ascending: true });

      if (error) {
        console.error("[useQueue] fetch failed:", error.message, error.code, error.details);
        throw error;
      }
      const entries = (data as QueueEntryRow[]) || [];
      const sorted = entries.sort((a, b) => {
        const timeA = new Date(a.recalled_at || a.created_at).getTime();
        const timeB = new Date(b.recalled_at || b.created_at).getTime();
        return timeA - timeB;
      });
      setTokens(sorted);
    } catch (err) {
      console.error("[useQueue] Error fetching queue entries:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  return { tokens, loading, fetchTokens };
}
