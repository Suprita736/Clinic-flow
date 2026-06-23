import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type DoctorRow = Database["public"]["Tables"]["doctors"]["Row"];

export function useDoctors() {
  const [allDoctors, setAllDoctors] = useState<DoctorRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDoctors = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("doctors")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("[useDoctors] fetch failed:", error.message, error.code, error.details);
        throw error;
      }
      setAllDoctors((data as DoctorRow[]) || []);
    } catch (err) {
      console.error("[useDoctors] Error fetching doctors:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  // Active-only doctors for dropdowns / queue assignment
  const doctors = allDoctors.filter(d => d.is_active);

  const updateDoctorStatus = async (doctorId: string, paused: boolean) => {
    const nextStatus = paused ? "paused" : "active";
    const { error } = await supabase
      .from("doctors")
      .update({ status: nextStatus })
      .eq("id", doctorId);
    if (error) throw error;
    await fetchDoctors();
  };

  const updateDoctorConsultationTime = async (doctorId: string, minutes: number) => {
    const seconds = minutes * 60;
    const { error } = await supabase
      .from("doctors")
      .update({ avg_consultation_seconds: seconds })
      .eq("id", doctorId);
    if (error) throw error;
    await fetchDoctors();
  };

  const addDoctor = async (name: string, specialization: string) => {
    const { error } = await supabase.from("doctors").insert({
      name,
      specialization,
      is_active: true,
      status: "active",
    });
    if (error) throw error;
    await fetchDoctors();
  };

  const editDoctor = async (id: string, name: string, specialization: string, is_active: boolean) => {
    const { error } = await supabase.from("doctors").update({
      name,
      specialization,
      is_active,
    }).eq("id", id);
    if (error) throw error;
    await fetchDoctors();
  };

  const deleteDoctor = async (id: string) => {
    // Check if there are active queue entries for this doctor TODAY
    const today = new Date().toISOString().slice(0, 10);
    const { data: activeEntries, error: checkErr } = await supabase
      .from("queue_entries")
      .select("id")
      .eq("doctor_id", id)
      .eq("queue_date", today)
      .in("status", ["waiting", "in_progress"]);

    if (checkErr) throw checkErr;
    
    if (activeEntries && activeEntries.length > 0) {
      throw new Error("Cannot delete doctor with active queue entries today. Please complete or reassign them first.");
    }

    // Actually delete the doctor row
    const { error } = await supabase.from("doctors").delete().eq("id", id);
    if (error) throw error;
    await fetchDoctors();
  };

  return { doctors, allDoctors, loading, fetchDoctors, updateDoctorStatus, updateDoctorConsultationTime, addDoctor, editDoctor, deleteDoctor };
}
