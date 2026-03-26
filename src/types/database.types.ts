/**
 * Aligned with `db/database-schema.sql` + `db/supabase-triggers.sql`.
 *
 * After applying SQL in Supabase, regenerate for exact parity:
 *   bun run db:types
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      plans: {
        Row: {
          id: string
          name: string
          price_mad: number
          max_stores: number
          max_products: number | null
          has_custom_domain: boolean
          has_analytics: boolean
          has_whatsapp: boolean
          has_staff: boolean
          has_api: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          price_mad: number
          max_stores: number
          max_products?: number | null
          has_custom_domain?: boolean
          has_analytics?: boolean
          has_whatsapp?: boolean
          has_staff?: boolean
          has_api?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          price_mad?: number
          max_stores?: number
          max_products?: number | null
          has_custom_domain?: boolean
          has_analytics?: boolean
          has_whatsapp?: boolean
          has_staff?: boolean
          has_api?: boolean
          created_at?: string
        }
        Relationships: []
      }
      wilayas: {
        Row: {
          id: number
          name_fr: string
          name_ar: string
          code: string
        }
        Insert: {
          id: number
          name_fr: string
          name_ar: string
          code: string
        }
        Update: {
          id?: number
          name_fr?: string
          name_ar?: string
          code?: string
        }
        Relationships: []
      }
      shipping_providers: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          logo_url?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          full_name: string
          phone: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string
          phone?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          status: string
          current_period_start: string
          current_period_end: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id: string
          status?: string
          current_period_start?: string
          current_period_end: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          plan_id?: string
          status?: string
          current_period_start?: string
          current_period_end?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          id: string
          user_id: string
          name: string
          slug: string
          description: string | null
          logo_url: string | null
          banner_url: string | null
          theme: string
          theme_config: Json
          custom_domain: string | null
          whatsapp_number: string | null
          is_active: boolean
          meta_title: string | null
          meta_description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          slug: string
          description?: string | null
          logo_url?: string | null
          banner_url?: string | null
          theme?: string
          theme_config?: Json
          custom_domain?: string | null
          whatsapp_number?: string | null
          is_active?: boolean
          meta_title?: string | null
          meta_description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          slug?: string
          description?: string | null
          logo_url?: string | null
          banner_url?: string | null
          theme?: string
          theme_config?: Json
          custom_domain?: string | null
          whatsapp_number?: string | null
          is_active?: boolean
          meta_title?: string | null
          meta_description?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          store_id: string
          name: string
          description: string | null
          category: string | null
          base_price: number
          compare_price: number | null
          images: string[]
          is_active: boolean
          is_featured: boolean
          slug: string
          meta_title: string | null
          meta_description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          name: string
          description?: string | null
          category?: string | null
          base_price: number
          compare_price?: number | null
          images?: string[]
          is_active?: boolean
          is_featured?: boolean
          slug: string
          meta_title?: string | null
          meta_description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          category?: string | null
          base_price?: number
          compare_price?: number | null
          images?: string[]
          is_active?: boolean
          is_featured?: boolean
          slug?: string
          meta_title?: string | null
          meta_description?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      attribute_definitions: {
        Row: {
          id: string
          store_id: string
          name: string
          display_type: string
          is_required: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          name: string
          display_type?: string
          is_required?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          display_type?: string
          is_required?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attribute_definitions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      attribute_values: {
        Row: {
          id: string
          attribute_definition_id: string
          label: string
          value: string
          color_hex: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          attribute_definition_id: string
          label: string
          value: string
          color_hex?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          label?: string
          value?: string
          color_hex?: string | null
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attribute_values_attribute_definition_id_fkey"
            columns: ["attribute_definition_id"]
            isOneToOne: false
            referencedRelation: "attribute_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          id: string
          product_id: string
          sku: string | null
          price_override: number | null
          stock_quantity: number
          images: string[]
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          sku?: string | null
          price_override?: number | null
          stock_quantity?: number
          images?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          sku?: string | null
          price_override?: number | null
          stock_quantity?: number
          images?: string[]
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      variant_attribute_values: {
        Row: {
          id: string
          variant_id: string
          attribute_value_id: string
        }
        Insert: {
          id?: string
          variant_id: string
          attribute_value_id: string
        }
        Update: {
          variant_id?: string
          attribute_value_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variant_attribute_values_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variant_attribute_values_attribute_value_id_fkey"
            columns: ["attribute_value_id"]
            isOneToOne: false
            referencedRelation: "attribute_values"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_zones: {
        Row: {
          id: string
          store_id: string
          wilaya_id: number
          provider_id: string | null
          price_mad: number
          free_shipping_threshold: number | null
          estimated_days_min: number
          estimated_days_max: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          wilaya_id: number
          provider_id?: string | null
          price_mad?: number
          free_shipping_threshold?: number | null
          estimated_days_min?: number
          estimated_days_max?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          wilaya_id?: number
          provider_id?: string | null
          price_mad?: number
          free_shipping_threshold?: number | null
          estimated_days_min?: number
          estimated_days_max?: number
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_zones_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_zones_wilaya_id_fkey"
            columns: ["wilaya_id"]
            isOneToOne: false
            referencedRelation: "wilayas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_zones_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "shipping_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          id: string
          store_id: string
          order_number: string
          status: string
          customer_name: string
          customer_phone: string
          customer_address: string
          customer_city: string
          wilaya_id: number
          customer_notes: string | null
          subtotal_mad: number
          shipping_cost_mad: number
          total_mad: number
          shipping_provider_id: string | null
          tracking_number: string | null
          confirmed_at: string | null
          shipped_at: string | null
          delivered_at: string | null
          returned_at: string | null
          cancelled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          order_number: string
          status?: string
          customer_name: string
          customer_phone: string
          customer_address: string
          customer_city: string
          wilaya_id: number
          customer_notes?: string | null
          subtotal_mad: number
          shipping_cost_mad: number
          total_mad: number
          shipping_provider_id?: string | null
          tracking_number?: string | null
          confirmed_at?: string | null
          shipped_at?: string | null
          delivered_at?: string | null
          returned_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: string
          tracking_number?: string | null
          shipping_provider_id?: string | null
          confirmed_at?: string | null
          shipped_at?: string | null
          delivered_at?: string | null
          returned_at?: string | null
          cancelled_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_wilaya_id_fkey"
            columns: ["wilaya_id"]
            isOneToOne: false
            referencedRelation: "wilayas"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          variant_id: string | null
          product_name: string
          variant_label: string
          product_image: string | null
          quantity: number
          unit_price_mad: number
          total_price_mad: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          variant_id?: string | null
          product_name: string
          variant_label: string
          product_image?: string | null
          quantity: number
          unit_price_mad: number
          total_price_mad: number
          created_at?: string
        }
        Update: {
          product_id?: string | null
          variant_id?: string | null
          product_name?: string
          variant_label?: string
          product_image?: string | null
          quantity?: number
          unit_price_mad?: number
          total_price_mad?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          id: string
          store_id: string
          event_type: string
          product_id: string | null
          order_id: string | null
          session_id: string | null
          wilaya_id: number | null
          referrer: string | null
          utm_source: string | null
          utm_medium: string | null
          utm_campaign: string | null
          device_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          event_type: string
          product_id?: string | null
          order_id?: string | null
          session_id?: string | null
          wilaya_id?: number | null
          referrer?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          device_type?: string | null
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: [
          {
            foreignKeyName: "analytics_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      decrement_stock: {
        Args: { p_variant_id: string; p_quantity: number }
        Returns: void
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T]
