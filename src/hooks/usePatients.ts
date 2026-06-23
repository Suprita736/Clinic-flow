import { useCallback, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PatientRow = Database["public"]["Tables"]["patients"]["Row"];

export function usePatients() {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPatients = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("*, doctors!patients_preferred_doctor_id_fkey(name)")
        .order("last_visit_date", { ascending: false });

      if (error) {
        console.error("[usePatients] fetch failed:", error);
        throw error;
      }
      // Note: mapping `doctors.name` to a friendly property if needed
      setPatients(data || []);
    } catch (err) {
      console.error("[usePatients] Error fetching patients:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const searchPatients = async (query: string) => {
    if (!query || query.length < 2) return [];
    
    try {
      const { data, error } = await supabase.rpc("search_patients", {
        search_query: query,
      });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("[usePatients] Search failed:", err);
      return [];
    }
  };

  return { patients, loading, fetchPatients, searchPatients };
}
