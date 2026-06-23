import { supabase } from "@/integrations/supabase/client";

const todayStr = () => new Date().toISOString().slice(0, 10);

export function useCallNext() {
  const callNext = async (doctorId: string) => {
    const now = new Date().toISOString();

    // Complete the currently in-progress entry (if any)
    const { data: activeEntries, error: activeErr } = await supabase
      .from("queue_entries")
      .select("*")
      .eq("queue_date", todayStr())
      .eq("doctor_id", doctorId)
      .eq("status", "in_progress")
      .limit(1);

    if (activeErr) {
      console.error("[useCallNext] fetch active failed:", activeErr.message, activeErr.code, activeErr.details);
      throw new Error(`Failed to fetch active entry: ${activeErr.message}`);
    }

    if (activeEntries && activeEntries.length > 0) {
      const active = activeEntries[0];
      const { error: completeErr } = await supabase
        .from("queue_entries")
        .update({ status: "completed", completed_at: now })
        .eq("id", active.id);

      if (completeErr) {
        console.error("[useCallNext] complete active failed:", completeErr.message, completeErr.code, completeErr.details);
        throw new Error(`Failed to complete current entry: ${completeErr.message}`);
      }
    }

    // Find the next waiting entry
    const { data: waitingEntries, error: waitErr } = await supabase
      .from("queue_entries")
      .select("*")
      .eq("queue_date", todayStr())
      .eq("doctor_id", doctorId)
      .eq("status", "waiting");

    if (waitErr) {
      console.error("[useCallNext] fetch waiting failed:", waitErr.message, waitErr.code, waitErr.details);
      throw new Error(`Failed to fetch next patient: ${waitErr.message}`);
    }

    const sortedWaiting = (waitingEntries || []).sort((a, b) => {
      const timeA = new Date(a.recalled_at || a.created_at).getTime();
      const timeB = new Date(b.recalled_at || b.created_at).getTime();
      return timeA - timeB;
    });

    const next = sortedWaiting[0];

    if (next) {
      // Mark as in_progress
      const { error: updateErr } = await supabase
        .from("queue_entries")
        .update({ status: "in_progress", served_at: now })
        .eq("id", next.id);

      if (updateErr) {
        console.error("[useCallNext] update next failed:", updateErr.message, updateErr.code, updateErr.details);
        throw new Error(`Failed to call next patient: ${updateErr.message}`);
      }

      // Update doctors table to reflect who's being served
      await supabase
        .from("doctors")
        .update({ currently_serving: next.token_number })
        .eq("id", doctorId);
    } else {
      // No one waiting — clear currently serving
      await supabase
        .from("doctors")
        .update({ currently_serving: null })
        .eq("id", doctorId);
    }
  };

  return { callNext };
}
