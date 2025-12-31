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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      credits: {
        Row: {
          balance: number | null
          created_at: string
          free_credits_remaining: number | null
          id: string
          last_free_credit_reset: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string
          free_credits_remaining?: number | null
          id?: string
          last_free_credit_reset?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string
          free_credits_remaining?: number | null
          id?: string
          last_free_credit_reset?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invitation_tokens: {
        Row: {
          created_at: string
          created_by: string
          email: string | null
          expires_at: string
          id: string
          notes: string | null
          token: string
          trial_days: number | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          email?: string | null
          expires_at: string
          id?: string
          notes?: string | null
          token: string
          trial_days?: number | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string | null
          expires_at?: string
          id?: string
          notes?: string | null
          token?: string
          trial_days?: number | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bio: string | null
          company_name: string | null
          cover_image: string | null
          created_at: string
          email: string
          email_verified: boolean | null
          full_name: string | null
          id: string
          is_visible: boolean | null
          language_preference: string | null
          location: string | null
          onboarding_completed: boolean | null
          phone_number: string | null
          profile_image: string | null
          stripe_customer_id: string | null
          updated_at: string
          username: string | null
          whatsapp_number: string | null
        }
        Insert: {
          bio?: string | null
          company_name?: string | null
          cover_image?: string | null
          created_at?: string
          email: string
          email_verified?: boolean | null
          full_name?: string | null
          id: string
          is_visible?: boolean | null
          language_preference?: string | null
          location?: string | null
          onboarding_completed?: boolean | null
          phone_number?: string | null
          profile_image?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          username?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          email?: string
          full_name?: string | null
          phone_number?: string | null
          whatsapp_number?: string | null
          username?: string | null
          company_name?: string | null
          bio?: string | null
          location?: string | null
          profile_image?: string | null
          cover_image?: string | null
          is_visible?: boolean | null
          onboarding_completed?: boolean | null
          stripe_customer_id?: string | null
          language_preference?: string | null
          email_verified?: boolean | null
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
          status: string | null
          plan_type: string | null
          trial_ends_at: string | null
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean | null
          canceled_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: string | null
          plan_type?: string | null
          trial_ends_at?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: string | null
          plan_type?: string | null
          trial_ends_at?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean | null
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
      video_generation_jobs: {
        Row: {
          id: string
          user_id: string
          property_id: string
          status: 'pending' | 'processing' | 'images_ready' | 'script_ready' | 'completed' | 'failed'
          selected_images: string[]
          notes: string | null
          image_urls: string[] | null
          script: Array<{ dialogue: string; action: string; emotion: string }> | null
          video_url: string | null
          error_message: string | null
          credits_charged: number
          credits_refunded: boolean
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          property_id: string
          status?: 'pending' | 'processing' | 'images_ready' | 'script_ready' | 'completed' | 'failed'
          selected_images: string[]
          notes?: string | null
          image_urls?: string[] | null
          script?: Array<{ dialogue: string; action: string; emotion: string }> | null
          video_url?: string | null
          error_message?: string | null
          credits_charged?: number
          credits_refunded?: boolean
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          property_id?: string
          status?: 'pending' | 'processing' | 'images_ready' | 'script_ready' | 'completed' | 'failed'
          selected_images?: string[]
          notes?: string | null
          image_urls?: string[] | null
          script?: Array<{ dialogue: string; action: string; emotion: string }> | null
          video_url?: string | null
          error_message?: string | null
          credits_charged?: number
          credits_refunded?: boolean
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_credits: {
        Args: {
          p_user_id: string
          p_amount: number
          p_type: string
          p_description?: string
        }
        Returns: boolean
      }
      deduct_credits: {
        Args: {
          p_user_id: string
          p_amount: number
          p_description?: string
        }
        Returns: boolean
      }
      get_agent_dashboard_stats: {
        Args: {
          agent_user_id?: string
        }
        Returns: {
          user_id: string
          total_properties: number
          active_properties: number
        }[]
      }
      get_subscription_status: {
        Args: {
          check_user_id: string
        }
        Returns: {
          status: string
          plan_type: string
          trial_ends_at: string | null
          current_period_end: string | null
          is_active: boolean
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
        }[]
      }
      get_user_credits: {
        Args: {
          check_user_id: string
        }
        Returns: {
          balance: number
          free_credits_remaining: number
          last_free_credits_reset: string | null
        }[]
      }
      has_active_subscription: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: { check_role: string; check_user_id: string }
        Returns: boolean
      }
      use_invitation_token: {
        Args: { invite_token: string; user_uuid: string }
        Returns: boolean
      }
      validate_invitation_token: {
        Args: { invite_token: string }
        Returns: { is_valid: boolean; token_email: string | null; token_trial_days: number }[]
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
