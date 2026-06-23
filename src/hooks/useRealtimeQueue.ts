import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RealtimeQueueOptions {
  /**
   * When provided, the queue subscription is scoped server-side to rows
   * belonging to this user. Patients pass their own id so they never receive
   * other patients' row payloads over the channel. Receptionists omit it to
   * receive all queue changes.
   */
  userId?: string;
}

/**
 * Subscribes to live changes on the queue_entries + clinic_state tables and invokes
 * the latest callback whenever anything changes. No page refresh needed.
 */
export function useRealtimeQueue(onChange: () => void, options: RealtimeQueueOptions = {}) {
  const cbRef = useRef(onChange);
  cbRef.current = onChange;
  const { userId } = options;

  useEffect(() => {
    const channelName = userId ? `clinicflow-queue-${userId}` : "clinicflow-queue-all";
    const queueFilter = userId
      ? { event: "*" as const, schema: "public", table: "queue_entries", filter: `user_id=eq.${userId}` }
      : { event: "*" as const, schema: "public", table: "queue_entries" };

    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", queueFilter, () => cbRef.current())
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clinic_state" },
        () => cbRef.current(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
