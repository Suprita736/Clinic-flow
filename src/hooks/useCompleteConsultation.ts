import { supabase } from "@/integrations/supabase/client";

const todayStr = () => new Date().toISOString().slice(0, 10);

export function useCompleteConsultation() {
  const completeConsultation = async (doctorId: string) => {
    // Find the currently in-progress entry for today
    const { data: activeEntries, error: fetchErr } = await supabase
      .from("queue_entries")
      .select("*")
      .eq("queue_date", todayStr())
      .eq("doctor_id", doctorId)
      .eq("status", "in_progress")
      .limit(1);

    if (fetchErr) {
      console.error("[useCompleteConsultation] fetch failed:", fetchErr.message, fetchErr.code, fetchErr.details);
      throw new Error(`Failed to find active consultation: ${fetchErr.message}`);
    }

    const active = activeEntries?.[0];

    if (active) {
      const { error: updateErr } = await supabase
        .from("queue_entries")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", active.id);

      if (updateErr) {
        console.error("[useCompleteConsultation] update failed:", updateErr.message, updateErr.code, updateErr.details);
        throw new Error(`Failed to complete consultation: ${updateErr.message}`);
      }

      // Clear currently serving in doctors table
      await supabase
        .from("doctors")
        .update({ currently_serving: null })
        .eq("id", doctorId);
    } else {
      throw new Error("No active consultation found to complete.");
    }
  };

  return { completeConsultation };
}
