export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      credits: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          balance: number
          last_monthly_refresh: string | null
          monthly_credits_used: number
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          balance?: number
          last_monthly_refresh?: string | null
          monthly_credits_used?: number
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          balance?: number
          last_monthly_refresh?: string | null
          monthly_credits_used?: number
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          id: string
          created_at: string
          user_id: string
          amount: number
          balance_after: number
          transaction_type: string
          reference_id: string | null
          description: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          amount: number
          balance_after: number
          transaction_type: string
          reference_id?: string | null
          description?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          amount?: number
          balance_after?: number
          transaction_type?: string
          reference_id?: string | null
          description?: string | null
        }
        Relationships: []
      }
      invitation_tokens: {
        Row: {
          id: string
          created_at: string
          token: string
          email: string | null
          trial_days: number
          expires_at: string
          used_at: string | null
          used_by: string | null
          created_by: string | null
          notes: string
        }
        Insert: {
          id?: string
          created_at?: string
          token?: string
          email?: string | null
          trial_days?: number
          expires_at: string
          used_at?: string | null
          used_by?: string | null
          created_by?: string | null
          notes?: string
        }
        Update: {
          id?: string
          created_at?: string
          token?: string
          email?: string | null
          trial_days?: number
          expires_at?: string
          used_at?: string | null
          used_by?: string | null
          created_by?: string | null
          notes?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          email: string
          full_name: string
          phone_number: string
          whatsapp_number: string
          username: string | null
          company_name: string
          bio: string
          location: string
          profile_image: string
          cover_image: string
          is_visible: boolean
          onboarding_completed: boolean
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          email: string
          full_name?: string
          phone_number?: string
          whatsapp_number?: string
          username?: string | null
          company_name?: string
          bio?: string
          location?: string
          profile_image?: string
          cover_image?: string
          is_visible?: boolean
          onboarding_completed?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          email?: string
          full_name?: string
          phone_number?: string
          whatsapp_number?: string
          username?: string | null
          company_name?: string
          bio?: string
          location?: string
          profile_image?: string
          cover_image?: string
          is_visible?: boolean
          onboarding_completed?: boolean
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          status: string
          trial_starts_at: string | null
          trial_ends_at: string | null
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: string
          trial_starts_at?: string | null
          trial_ends_at?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: string
          trial_starts_at?: string | null
          trial_ends_at?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          characteristics: Json | null
          created_at: string | null
          currency: string | null
          custom_bonuses: Json | null
          description: string | null
          display_order: number | null
          id: string
          images: string[] | null
          is_featured: boolean | null
          is_for_rent: boolean | null
          is_for_sale: boolean | null
          location_address: string | null
          location_city: string | null
          location_lat: number | null
          location_lng: number | null
          location_neighborhood: string | null
          location_state: string | null
          price: number
          property_type: string
          rent_currency: string | null
          rent_price: number | null
          show_map: boolean | null
          slug: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
          videos: string[] | null
        }
        Insert: {
          characteristics?: Json | null
          created_at?: string | null
          currency?: string | null
          custom_bonuses?: Json | null
          description?: string | null
          display_order?: number | null
          id?: string
          images?: string[] | null
          is_featured?: boolean | null
          is_for_rent?: boolean | null
          is_for_sale?: boolean | null
          location_address?: string | null
          location_city?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_neighborhood?: string | null
          location_state?: string | null
          price: number
          property_type: string
          rent_currency?: string | null
          rent_price?: number | null
          show_map?: boolean | null
          slug?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          videos?: string[] | null
        }
        Update: {
          characteristics?: Json | null
          created_at?: string | null
          currency?: string | null
          custom_bonuses?: Json | null
          description?: string | null
          display_order?: number | null
          id?: string
          images?: string[] | null
          is_featured?: boolean | null
          is_for_rent?: boolean | null
          is_for_sale?: boolean | null
          location_address?: string | null
          location_city?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_neighborhood?: string | null
          location_state?: string | null
          price?: number
          property_type?: string
          rent_currency?: string | null
          rent_price?: number | null
          show_map?: boolean | null
          slug?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          videos?: string[] | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: { check_role: string; check_user_id: string }
        Returns: boolean
      }
      has_active_subscription: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      validate_invitation_token: {
        Args: { invite_token: string }
        Returns: { is_valid: boolean; token_email: string | null; token_trial_days: number }[]
      }
      use_invitation_token: {
        Args: { invite_token: string; user_uuid: string }
        Returns: boolean
      }
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
