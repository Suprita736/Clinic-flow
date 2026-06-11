import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to live changes on the queue + clinic state tables and invokes
 * the latest callback whenever anything changes. No page refresh needed.
 */
export function useRealtimeQueue(onChange: () => void) {
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  useEffect(() => {
    const channel = supabase
      .channel("clinicflow-queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_entries" },
        () => cbRef.current(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clinic_state" },
        () => cbRef.current(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
