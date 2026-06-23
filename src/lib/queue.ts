import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { NotificationService } from "./NotificationService";

export type QueueStatus = Database["public"]["Enums"]["queue_status"];
export type ClinicStatus = Database["public"]["Enums"]["clinic_status"];
export type QueueEntry = Database["public"]["Tables"]["queue_entries"]["Row"];
export type ClinicState = Database["public"]["Tables"]["clinic_state"]["Row"];

const todayStr = () => new Date().toISOString().slice(0, 10);

export async function fetchTodayEntries(): Promise<QueueEntry[]> {
  const { data, error } = await supabase
    .from("queue_entries")
    .select("*")
    .eq("queue_date", todayStr())
    .order("token_number", { ascending: true });
  if (error) throw error;
  const entries = (data ?? []) as QueueEntry[];
  return entries.sort((a, b) => {
    const timeA = new Date(a.recalled_at || a.created_at).getTime();
    const timeB = new Date(b.recalled_at || b.created_at).getTime();
    return timeA - timeB;
  });
}

export async function fetchClinicState(): Promise<ClinicState | null> {
  const { data } = await supabase.from("clinic_state").select("*").eq("id", 1).maybeSingle();
  return data ?? null;
}

export async function addPatient(name: string, phone: string, doctorId: string): Promise<number> {
  const { data: token, error: tErr } = await supabase.rpc("next_token_number", { p_doctor_id: doctorId });
  if (tErr) throw tErr;
  const { error } = await supabase.from("queue_entries").insert({
    token_number: token as number,
    patient_name: name,
    phone,
    status: "waiting",
    doctor_id: doctorId,
  });
  if (error) throw error;
  return token as number;
}


async function recalcAverage(doctorId: string): Promise<void> {
  const { data } = await supabase
    .from("queue_entries")
    .select("served_at, completed_at")
    .eq("queue_date", todayStr())
    .eq("status", "completed")
    .eq("doctor_id", doctorId)
    .not("served_at", "is", null)
    .not("completed_at", "is", null);
  if (!data || data.length === 0) return;
  const durations = data
    .map((r) =>
      r.served_at && r.completed_at
        ? (new Date(r.completed_at).getTime() - new Date(r.served_at).getTime()) / 1000
        : 0,
    )
    .filter((d) => d > 0);
  if (durations.length === 0) return;
  const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
  await supabase.from("doctors").update({ avg_consultation_seconds: avg }).eq("id", doctorId);
}

export async function callNext(doctorId: string, doctorName: string): Promise<void> {
  const entries = await fetchTodayEntries();
  const doctorEntries = entries.filter(e => e.doctor_id === doctorId);
  const current = doctorEntries.find((e) => e.status === "in_progress");
  const now = new Date().toISOString();

  if (current) {
    await supabase
      .from("queue_entries")
      .update({ status: "completed", completed_at: now })
      .eq("id", current.id);
    await recalcAverage(doctorId);
  }

  const next = doctorEntries.find((e) => e.status === "waiting");
  if (next) {
    await supabase
      .from("queue_entries")
      .update({ status: "in_progress", served_at: now })
      .eq("id", next.id);
    await supabase.from("doctors").update({ currently_serving: next.token_number }).eq("id", doctorId);
  } else {
    await supabase.from("doctors").update({ currently_serving: null }).eq("id", doctorId);
  }

  // Trigger notifications for the next ones in line
  const waitingEntries = doctorEntries.filter((e) => e.status === "waiting" && e.id !== next?.id);
  
  if (waitingEntries.length > 0) {
    const youAreNextPatient = waitingEntries[0];
    NotificationService.sendYouAreNext(youAreNextPatient.patient_name, doctorName);
  }

  if (waitingEntries.length > 2) {
    const threeAwayPatient = waitingEntries[2];
    const { data: docData } = await supabase.from("doctors").select("avg_consultation_seconds").eq("id", doctorId).single();
    const fallbackAvg = docData?.avg_consultation_seconds ? Math.round(docData.avg_consultation_seconds / 60) : 8;
    NotificationService.sendThreeAway(threeAwayPatient.patient_name, 3 * fallbackAvg, doctorName);
  }
}

export async function skipPatient(id: string, doctorId: string): Promise<void> {
  await supabase.from("queue_entries").update({ status: "skipped" }).eq("id", id);
  // Nudge doctors table so every patient's live position recalculates.
  await supabase.from("doctors").update({ is_active: true }).eq("id", doctorId);
}

export async function completePatient(id: string, doctorId: string): Promise<void> {
  await supabase
    .from("queue_entries")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id);
  await recalcAverage(doctorId);
}

export async function recallPatient(id: string, doctorId: string): Promise<void> {
  await supabase
    .from("queue_entries")
    .update({
      status: "waiting",
      recalled_at: new Date().toISOString(),
    })
    .eq("id", id);
  // Nudge doctors table so every patient's live position recalculates.
  await supabase.from("doctors").update({ is_active: true }).eq("id", doctorId);
}

export async function markNoShowAndAdvance(id: string, doctorId: string, doctorName: string): Promise<void> {
  // Mark the patient as no_show
  await supabase.from("queue_entries").update({ status: "no_show" }).eq("id", id);
  
  // And then call the next patient
  const entries = await fetchTodayEntries();
  const doctorEntries = entries.filter(e => e.doctor_id === doctorId);
  const next = doctorEntries.find((e) => e.status === "waiting");
  const now = new Date().toISOString();
  if (next) {
    await supabase
      .from("queue_entries")
      .update({ status: "in_progress", served_at: now })
      .eq("id", next.id);
    await supabase.from("doctors").update({ currently_serving: next.token_number }).eq("id", doctorId);
  } else {
    await supabase.from("doctors").update({ currently_serving: null }).eq("id", doctorId);
  }

  // Trigger notifications for the next ones in line
  const waitingEntries = doctorEntries.filter((e) => e.status === "waiting" && e.id !== next?.id && e.id !== id);
  
  if (waitingEntries.length > 0) {
    const youAreNextPatient = waitingEntries[0];
    NotificationService.sendYouAreNext(youAreNextPatient.patient_name, doctorName);
  }

  if (waitingEntries.length > 2) {
    const threeAwayPatient = waitingEntries[2];
    const { data: docData } = await supabase.from("doctors").select("avg_consultation_seconds").eq("id", doctorId).single();
    const fallbackAvg = docData?.avg_consultation_seconds ? Math.round(docData.avg_consultation_seconds / 60) : 8;
    NotificationService.sendThreeAway(threeAwayPatient.patient_name, 3 * fallbackAvg, doctorName);
  }
}

export async function setClinicStatus(status: ClinicStatus): Promise<void> {
  await supabase.from("clinic_state").update({ status }).eq("id", 1);
}

export function formatWait(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return "0 min";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
