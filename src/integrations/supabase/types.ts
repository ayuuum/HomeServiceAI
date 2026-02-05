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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      booking_options: {
        Row: {
          booking_id: string
          id: string
          option_id: string
          option_price: number
          option_quantity: number
          option_title: string
        }
        Insert: {
          booking_id: string
          id?: string
          option_id: string
          option_price: number
          option_quantity?: number
          option_title: string
        }
        Update: {
          booking_id?: string
          id?: string
          option_id?: string
          option_price?: number
          option_quantity?: number
          option_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_options_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_options_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "service_options"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_services: {
        Row: {
          booking_id: string
          created_at: string | null
          id: string
          service_base_price: number
          service_id: string
          service_quantity: number
          service_title: string
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          id?: string
          service_base_price: number
          service_id: string
          service_quantity?: number
          service_title: string
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          id?: string
          service_base_price?: number
          service_id?: string
          service_quantity?: number
          service_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_services_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          additional_charges: Json | null
          approved_preference: number | null
          cancel_token: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          checkout_expires_at: string | null
          collected_at: string | null
          created_at: string | null
          customer_address: string | null
          customer_address_building: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          customer_postal_code: string | null
          diagnosis_has_parking: boolean | null
          diagnosis_notes: string | null
          final_amount: number | null
          gmv_included_at: string | null
          id: string
          line_reminder_sent_at: string | null
          online_payment_status: string | null
          organization_id: string | null
          paid_at: string | null
          payment_method: string | null
          payment_reminder_sent_at: string | null
          payment_status: string | null
          preference1_date: string | null
          preference1_time: string | null
          preference2_date: string | null
          preference2_time: string | null
          preference3_date: string | null
          preference3_time: string | null
          refund_amount: number | null
          refunded_at: string | null
          selected_date: string
          selected_time: string
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          total_price: number
          updated_at: string | null
        }
        Insert: {
          additional_charges?: Json | null
          approved_preference?: number | null
          cancel_token?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          checkout_expires_at?: string | null
          collected_at?: string | null
          created_at?: string | null
          customer_address?: string | null
          customer_address_building?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_postal_code?: string | null
          diagnosis_has_parking?: boolean | null
          diagnosis_notes?: string | null
          final_amount?: number | null
          gmv_included_at?: string | null
          id?: string
          line_reminder_sent_at?: string | null
          online_payment_status?: string | null
          organization_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reminder_sent_at?: string | null
          payment_status?: string | null
          preference1_date?: string | null
          preference1_time?: string | null
          preference2_date?: string | null
          preference2_time?: string | null
          preference3_date?: string | null
          preference3_time?: string | null
          refund_amount?: number | null
          refunded_at?: string | null
          selected_date: string
          selected_time: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          total_price: number
          updated_at?: string | null
        }
        Update: {
          additional_charges?: Json | null
          approved_preference?: number | null
          cancel_token?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          checkout_expires_at?: string | null
          collected_at?: string | null
          created_at?: string | null
          customer_address?: string | null
          customer_address_building?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_postal_code?: string | null
          diagnosis_has_parking?: boolean | null
          diagnosis_notes?: string | null
          final_amount?: number | null
          gmv_included_at?: string | null
          id?: string
          line_reminder_sent_at?: string | null
          online_payment_status?: string | null
          organization_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reminder_sent_at?: string | null
          payment_status?: string | null
          preference1_date?: string | null
          preference1_time?: string | null
          preference2_date?: string | null
          preference2_time?: string | null
          preference3_date?: string | null
          preference3_time?: string | null
          refund_amount?: number | null
          refunded_at?: string | null
          selected_date?: string
          selected_time?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          total_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_recipients: {
        Row: {
          broadcast_id: string
          created_at: string | null
          customer_id: string
          error_message: string | null
          id: string
          line_user_id: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          broadcast_id: string
          created_at?: string | null
          customer_id: string
          error_message?: string | null
          id?: string
          line_user_id: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          broadcast_id?: string
          created_at?: string | null
          customer_id?: string
          error_message?: string | null
          id?: string
          line_user_id?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_recipients_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_recipients_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcasts: {
        Row: {
          created_at: string | null
          failed_count: number | null
          id: string
          message: string
          organization_id: string
          recipient_count: number | null
          segment_filters: Json | null
          sent_count: number | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          failed_count?: number | null
          id?: string
          message: string
          organization_id: string
          recipient_count?: number | null
          segment_filters?: Json | null
          sent_count?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          failed_count?: number | null
          id?: string
          message?: string
          organization_id?: string
          recipient_count?: number | null
          segment_filters?: Json | null
          sent_count?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcasts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          address_building: string | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          id: string
          line_user_id: string | null
          name: string | null
          notes: string | null
          organization_id: string | null
          phone: string | null
          postal_code: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          address_building?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          line_user_id?: string | null
          name?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          postal_code?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          address_building?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          line_user_id?: string | null
          name?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          postal_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      gmv_audit_log: {
        Row: {
          action: string
          booking_id: string
          created_at: string | null
          id: string
          new_amount: number | null
          organization_id: string
          performed_by: string | null
          previous_amount: number | null
          reason: string | null
        }
        Insert: {
          action: string
          booking_id: string
          created_at?: string | null
          id?: string
          new_amount?: number | null
          organization_id: string
          performed_by?: string | null
          previous_amount?: number | null
          reason?: string | null
        }
        Update: {
          action?: string
          booking_id?: string
          created_at?: string | null
          id?: string
          new_amount?: number | null
          organization_id?: string
          performed_by?: string | null
          previous_amount?: number | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gmv_audit_log_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmv_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      line_messages: {
        Row: {
          content: string
          created_at: string
          customer_id: string | null
          direction: string
          id: string
          line_message_id: string | null
          line_user_id: string
          message_type: string
          organization_id: string
          read_at: string | null
          sent_at: string
        }
        Insert: {
          content: string
          created_at?: string
          customer_id?: string | null
          direction: string
          id?: string
          line_message_id?: string | null
          line_user_id: string
          message_type?: string
          organization_id: string
          read_at?: string | null
          sent_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          customer_id?: string | null
          direction?: string
          id?: string
          line_message_id?: string | null
          line_user_id?: string
          message_type?: string
          organization_id?: string
          read_at?: string | null
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "line_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "line_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_billing: {
        Row: {
          billing_month: string
          booking_count: number
          created_at: string | null
          due_at: string | null
          fee_percent: number
          fee_total: number
          gmv_bank_transfer: number
          gmv_cash: number
          gmv_online: number
          gmv_total: number
          hosted_invoice_url: string | null
          id: string
          invoice_status: string | null
          issued_at: string | null
          organization_id: string
          paid_at: string | null
          stripe_invoice_id: string | null
          updated_at: string | null
        }
        Insert: {
          billing_month: string
          booking_count?: number
          created_at?: string | null
          due_at?: string | null
          fee_percent?: number
          fee_total?: number
          gmv_bank_transfer?: number
          gmv_cash?: number
          gmv_online?: number
          gmv_total?: number
          hosted_invoice_url?: string | null
          id?: string
          invoice_status?: string | null
          issued_at?: string | null
          organization_id: string
          paid_at?: string | null
          stripe_invoice_id?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_month?: string
          booking_count?: number
          created_at?: string | null
          due_at?: string | null
          fee_percent?: number
          fee_total?: number
          gmv_bank_transfer?: number
          gmv_cash?: number
          gmv_online?: number
          gmv_total?: number
          hosted_invoice_url?: string | null
          id?: string
          invoice_status?: string | null
          issued_at?: string | null
          organization_id?: string
          paid_at?: string | null
          stripe_invoice_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_billing_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          organization_id: string
          read_at: string | null
          resource_id: string | null
          resource_type: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          organization_id: string
          read_at?: string | null
          resource_id?: string | null
          resource_type?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          organization_id?: string
          read_at?: string | null
          resource_id?: string | null
          resource_type?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          admin_email: string | null
          admin_line_user_id: string | null
          billing_customer_id: string | null
          billing_payment_method_status: string | null
          booking_headline: string | null
          brand_color: string | null
          business_hours: Json | null
          checkout_expiry_hours: number | null
          created_at: string | null
          header_layout: string | null
          id: string
          line_ai_enabled: boolean | null
          line_ai_escalation_keywords: Json | null
          line_ai_system_prompt: string | null
          line_bot_user_id: string | null
          line_channel_secret: string | null
          line_channel_token: string | null
          line_liff_id: string | null
          line_reminder_hours_before: number[] | null
          logo_url: string | null
          name: string
          payment_enabled: boolean | null
          platform_fee_percent: number | null
          slug: string
          stripe_account_id: string | null
          stripe_account_status: string | null
          updated_at: string | null
          welcome_message: string | null
        }
        Insert: {
          admin_email?: string | null
          admin_line_user_id?: string | null
          billing_customer_id?: string | null
          billing_payment_method_status?: string | null
          booking_headline?: string | null
          brand_color?: string | null
          business_hours?: Json | null
          checkout_expiry_hours?: number | null
          created_at?: string | null
          header_layout?: string | null
          id?: string
          line_ai_enabled?: boolean | null
          line_ai_escalation_keywords?: Json | null
          line_ai_system_prompt?: string | null
          line_bot_user_id?: string | null
          line_channel_secret?: string | null
          line_channel_token?: string | null
          line_liff_id?: string | null
          line_reminder_hours_before?: number[] | null
          logo_url?: string | null
          name: string
          payment_enabled?: boolean | null
          platform_fee_percent?: number | null
          slug: string
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          updated_at?: string | null
          welcome_message?: string | null
        }
        Update: {
          admin_email?: string | null
          admin_line_user_id?: string | null
          billing_customer_id?: string | null
          billing_payment_method_status?: string | null
          booking_headline?: string | null
          brand_color?: string | null
          business_hours?: Json | null
          checkout_expiry_hours?: number | null
          created_at?: string | null
          header_layout?: string | null
          id?: string
          line_ai_enabled?: boolean | null
          line_ai_escalation_keywords?: Json | null
          line_ai_system_prompt?: string | null
          line_bot_user_id?: string | null
          line_channel_secret?: string | null
          line_channel_token?: string | null
          line_liff_id?: string | null
          line_reminder_hours_before?: number[] | null
          logo_url?: string | null
          name?: string
          payment_enabled?: boolean | null
          platform_fee_percent?: number | null
          slug?: string
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          updated_at?: string | null
          welcome_message?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          organization_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          name?: string | null
          organization_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_blocks: {
        Row: {
          block_date: string
          block_time: string | null
          block_type: string
          created_at: string | null
          id: string
          notes: string | null
          organization_id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          block_date: string
          block_time?: string | null
          block_type?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          block_date?: string
          block_time?: string | null
          block_type?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_blocks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_options: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          organization_id: string | null
          price: number
          service_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          organization_id?: string | null
          price: number
          service_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          organization_id?: string | null
          price?: number
          service_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_options_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_options_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          base_price: number
          category: string
          created_at: string | null
          description: string
          duration: number
          id: string
          image_url: string
          is_active: boolean | null
          organization_id: string | null
          quantity_discounts: Json | null
          requires_prepayment: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          base_price: number
          category: string
          created_at?: string | null
          description: string
          duration: number
          id?: string
          image_url: string
          is_active?: boolean | null
          organization_id?: string | null
          quantity_discounts?: Json | null
          requires_prepayment?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          category?: string
          created_at?: string | null
          description?: string
          duration?: number
          id?: string
          image_url?: string
          is_active?: boolean | null
          organization_id?: string | null
          quantity_discounts?: Json | null
          requires_prepayment?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          event_type: string
          id: string
          organization_id: string | null
          payload: Json | null
          processed_at: string | null
          stripe_event_id: string
        }
        Insert: {
          event_type: string
          id?: string
          organization_id?: string | null
          payload?: Json | null
          processed_at?: string | null
          stripe_event_id: string
        }
        Update: {
          event_type?: string
          id?: string
          organization_id?: string | null
          payload?: Json | null
          processed_at?: string | null
          stripe_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_webhook_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_booking_by_token: { Args: { p_token: string }; Returns: boolean }
      create_customer_secure:
        | {
            Args: {
              p_address?: string
              p_address_building?: string
              p_email?: string
              p_line_user_id?: string
              p_name?: string
              p_organization_id: string
              p_phone?: string
              p_postal_code?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_address?: string
              p_address_building?: string
              p_avatar_url?: string
              p_email?: string
              p_line_user_id?: string
              p_name?: string
              p_organization_id: string
              p_phone?: string
              p_postal_code?: string
            }
            Returns: string
          }
      find_or_create_customer: {
        Args: {
          p_address?: string
          p_address_building?: string
          p_avatar_url?: string
          p_email?: string
          p_line_user_id?: string
          p_name: string
          p_organization_id: string
          p_phone?: string
          p_postal_code?: string
        }
        Returns: string
      }
      get_booking_by_cancel_token: {
        Args: { p_token: string }
        Returns: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          id: string
          organization_id: string
          selected_date: string
          selected_time: string
          status: string
          total_price: number
        }[]
      }
      get_organization_public: {
        Args: { org_slug: string }
        Returns: {
          booking_headline: string
          brand_color: string
          business_hours: Json
          created_at: string
          header_layout: string
          id: string
          line_liff_id: string
          logo_url: string
          name: string
          slug: string
          updated_at: string
          welcome_message: string
        }[]
      }
      get_user_organization_id: { Args: never; Returns: string }
      reschedule_booking_by_token: {
        Args: { p_new_date: string; p_new_time: string; p_token: string }
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
