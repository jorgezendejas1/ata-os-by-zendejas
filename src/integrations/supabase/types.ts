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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      attendance_records: {
        Row: {
          companyId: string
          companyName: string
          createdAt: string
          dateRegistered: string
          history: Json | null
          id: string
          plannedCount: number | null
          promoterCount: number
          scheduleId: string
          scheduleTime: string
          supervisorSignature: string
          terminalId: string
          terminalName: string
          timeRegistered: string
          userId: string
          zoneId: string | null
          zoneName: string | null
        }
        Insert: {
          companyId: string
          companyName: string
          createdAt?: string
          dateRegistered: string
          history?: Json | null
          id: string
          plannedCount?: number | null
          promoterCount?: number
          scheduleId: string
          scheduleTime: string
          supervisorSignature?: string
          terminalId: string
          terminalName: string
          timeRegistered: string
          userId: string
          zoneId?: string | null
          zoneName?: string | null
        }
        Update: {
          companyId?: string
          companyName?: string
          createdAt?: string
          dateRegistered?: string
          history?: Json | null
          id?: string
          plannedCount?: number | null
          promoterCount?: number
          scheduleId?: string
          scheduleTime?: string
          supervisorSignature?: string
          terminalId?: string
          terminalName?: string
          timeRegistered?: string
          userId?: string
          zoneId?: string | null
          zoneName?: string | null
        }
        Relationships: []
      }
      config: {
        Row: {
          id: string
          value: Json
        }
        Insert: {
          id: string
          value?: Json
        }
        Update: {
          id?: string
          value?: Json
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          content: string
          date: string
          id: string
          recipients: string
          subject: string
        }
        Insert: {
          content: string
          date: string
          id: string
          recipients: string
          subject: string
        }
        Update: {
          content?: string
          date?: string
          id?: string
          recipients?: string
          subject?: string
        }
        Relationships: []
      }
      promoters: {
        Row: {
          active: boolean
          company_id: string
          created_at: string | null
          id: string
          name: string
          terminal_id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string | null
          id?: string
          name: string
          terminal_id: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string | null
          id?: string
          name?: string
          terminal_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      staffing: {
        Row: {
          companyId: string
          count: number
          date: string
          id: string
          terminalId: string
          zoneId: string
        }
        Insert: {
          companyId: string
          count?: number
          date: string
          id?: string
          terminalId: string
          zoneId?: string
        }
        Update: {
          companyId?: string
          count?: number
          date?: string
          id?: string
          terminalId?: string
          zoneId?: string
        }
        Relationships: []
      }
      targets: {
        Row: {
          companyId: string
          count: number
          id: string
          terminalId: string
          zoneId: string
        }
        Insert: {
          companyId: string
          count?: number
          id?: string
          terminalId: string
          zoneId?: string
        }
        Update: {
          companyId?: string
          count?: number
          id?: string
          terminalId?: string
          zoneId?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          createdAt: string
          dueDate: string
          id: string
          priority: string
          status: string
          title: string
        }
        Insert: {
          createdAt?: string
          dueDate: string
          id: string
          priority?: string
          status?: string
          title: string
        }
        Update: {
          createdAt?: string
          dueDate?: string
          id?: string
          priority?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          assignedTerminals: string[] | null
          createdAt: string
          email: string
          id: string
          name: string
          password_hash: string
          role: string
        }
        Insert: {
          assignedTerminals?: string[] | null
          createdAt?: string
          email: string
          id: string
          name: string
          password_hash: string
          role?: string
        }
        Update: {
          assignedTerminals?: string[] | null
          createdAt?: string
          email?: string
          id?: string
          name?: string
          password_hash?: string
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
