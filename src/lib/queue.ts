import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type QueueStatus = Database["public"]["Enums"]["queue_status"];
export type ClinicStatus = Database["public"]["Enums"]["clinic_status"];
export type QueueEntry = Database["public"]["Tables"]["queue_entries"]["Row"];
export type ClinicState = Database["public"]["Tables"]["clinic_state"]["Row"];

export interface MyQueueStatus {
  has_entry: boolean;
  token_number?: number;
  my_status?: QueueStatus;
  people_ahead?: number;
  currently_serving: number | null;
  total_waiting: number;
  estimated_wait_seconds?: number;
  clinic_status: ClinicStatus;
  position?: number;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

export async function fetchTodayEntries(): Promise<QueueEntry[]> {
  const { data, error } = await supabase
    .from("queue_entries")
    .select("*")
    .eq("queue_date", todayStr())
    .order("token_number", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchClinicState(): Promise<ClinicState | null> {
  const { data } = await supabase.from("clinic_state").select("*").eq("id", 1).maybeSingle();
  return data ?? null;
}

export async function getMyQueueStatus(): Promise<MyQueueStatus> {
  const { data, error } = await supabase.rpc("get_my_queue_status");
  if (error) throw error;
  return data as unknown as MyQueueStatus;
}

export async function addPatient(name: string, phone: string): Promise<void> {
  const { data: token, error: tErr } = await supabase.rpc("next_token_number");
  if (tErr) throw tErr;
  const { error } = await supabase.from("queue_entries").insert({
    token_number: token as number,
    patient_name: name,
    phone,
    status: "waiting",
  });
  if (error) throw error;
}

export async function joinQueue(userId: string, name: string, phone: string): Promise<void> {
  const { data: token, error: tErr } = await supabase.rpc("next_token_number");
  if (tErr) throw tErr;
  const { error } = await supabase.from("queue_entries").insert({
    token_number: token as number,
    patient_name: name,
    phone,
    user_id: userId,
    status: "waiting",
  });
  if (error) throw error;
}

async function recalcAverage(): Promise<void> {
  const { data } = await supabase
    .from("queue_entries")
    .select("served_at, completed_at")
    .eq("queue_date", todayStr())
    .eq("status", "completed")
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
  await supabase.from("clinic_state").update({ avg_consultation_seconds: avg }).eq("id", 1);
}

export async function callNext(): Promise<void> {
  const entries = await fetchTodayEntries();
  const current = entries.find((e) => e.status === "in_progress");
  const now = new Date().toISOString();

  if (current) {
    await supabase
      .from("queue_entries")
      .update({ status: "completed", completed_at: now })
      .eq("id", current.id);
    await recalcAverage();
  }

  const next = entries.find((e) => e.status === "waiting");
  if (next) {
    await supabase
      .from("queue_entries")
      .update({ status: "in_progress", served_at: now })
      .eq("id", next.id);
    await supabase.from("clinic_state").update({ currently_serving: next.token_number }).eq("id", 1);
  } else {
    await supabase.from("clinic_state").update({ currently_serving: null }).eq("id", 1);
  }
}

export async function skipPatient(id: string): Promise<void> {
  await supabase.from("queue_entries").update({ status: "skipped" }).eq("id", id);
}

export async function completePatient(id: string): Promise<void> {
  await supabase
    .from("queue_entries")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id);
  await recalcAverage();
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
