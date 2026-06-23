export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      clinic_state: {
        Row: {
          avg_consultation_seconds: number
          currently_serving: number | null
          id: number
          status: Database["public"]["Enums"]["clinic_status"]
          updated_at: string
        }
        Insert: {
          avg_consultation_seconds?: number
          currently_serving?: number | null
          id?: number
          status?: Database["public"]["Enums"]["clinic_status"]
          updated_at?: string
        }
        Update: {
          avg_consultation_seconds?: number
          currently_serving?: number | null
          id?: number
          status?: Database["public"]["Enums"]["clinic_status"]
          updated_at?: string
        }
        Relationships: []
      }
      doctors: {
        Row: {
          avg_consultation_seconds: number | null
          created_at: string | null
          currently_serving: number | null
          id: string
          is_active: boolean | null
          name: string
          specialization: string | null
          status: Database["public"]["Enums"]["clinic_status"] | null
        }
        Insert: {
          avg_consultation_seconds?: number | null
          created_at?: string | null
          currently_serving?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          specialization?: string | null
          status?: Database["public"]["Enums"]["clinic_status"] | null
        }
        Update: {
          avg_consultation_seconds?: number | null
          created_at?: string | null
          currently_serving?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          specialization?: string | null
          status?: Database["public"]["Enums"]["clinic_status"] | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          phone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          id: string
          phone: string
          name: string
          visit_count: number | null
          last_visit_date: string | null
          preferred_doctor_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          phone: string
          name: string
          visit_count?: number | null
          last_visit_date?: string | null
          preferred_doctor_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          phone?: string
          name?: string
          visit_count?: number | null
          last_visit_date?: string | null
          preferred_doctor_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_preferred_doctor_id_fkey"
            columns: ["preferred_doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          }
        ]
      }
      queue_entries: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          patient_name: string
          phone: string
          queue_date: string
          served_at: string | null
          status: Database["public"]["Enums"]["queue_status"]
          token_number: number
          tracking_code: string | null
          updated_at: string
          user_id: string | null
          recalled_at: string | null
          doctor_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          patient_name: string
          phone?: string
          queue_date?: string
          served_at?: string | null
          status?: Database["public"]["Enums"]["queue_status"]
          token_number: number
          tracking_code?: string | null
          updated_at?: string
          user_id?: string | null
          recalled_at?: string | null
          doctor_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          patient_name?: string
          phone?: string
          queue_date?: string
          served_at?: string | null
          status?: Database["public"]["Enums"]["queue_status"]
          token_number?: number
          tracking_code?: string | null
          updated_at?: string
          user_id?: string | null
          recalled_at?: string | null
          doctor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_entries_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          }
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_active_consultation: {
        Args: { p_doctor_id: string }
        Returns: {
          token_number: number
          served_at: string
        }[]
      }
      get_my_queue_status: { Args: never; Returns: Json }
      get_queue_status_by_token: {
        Args: { p_token_number: number }
        Returns: {
          token_number: number
          patient_name: string
          status: Database["public"]["Enums"]["queue_status"]
          people_ahead: number
          currently_serving: number
          total_waiting: number
          estimated_wait_seconds: number
          clinic_status: Database["public"]["Enums"]["clinic_status"]
          queue_position: number
        }[]
      }
      get_queue_status_by_tracking_code: {
        Args: { _tracking_code: string }
        Returns: {
          token_number: number
          patient_name: string
          status: Database["public"]["Enums"]["queue_status"]
          people_ahead: number
          currently_serving: number
          total_waiting: number
          estimated_wait_seconds: number
          clinic_status: Database["public"]["Enums"]["clinic_status"]
          queue_position: number
          tracking_code: string
          doctor_name: string
          doctor_specialization: string
        }[]
      }
      debug_auth: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_token_number: { Args: { p_doctor_id: string }; Returns: number }
      search_patients: {
        Args: { search_query: string }
        Returns: {
          id: string
          name: string
          phone: string
          visit_count: number
          last_visit_date: string
          preferred_doctor_id: string
        }[]
      }
      perform_daily_reset: { Args: never; Returns: void }
    }
    Enums: {
      app_role: "patient" | "receptionist"
      clinic_status: "active" | "paused" | "break"
      queue_status: "waiting" | "in_progress" | "completed" | "skipped" | "no_show"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["patient", "receptionist"],
      clinic_status: ["active", "paused", "break"],
      queue_status: ["waiting", "in_progress", "completed", "skipped", "no_show"],
    },
  },
} as const
