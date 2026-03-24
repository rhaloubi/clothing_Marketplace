/**
 * Auto-generated Supabase database types.
 *
 * DO NOT EDIT MANUALLY.
 * Regenerate with: npm run db:types
 * (requires SUPABASE_PROJECT_ID in your .env)
 *
 * Until your Supabase project is created and the schema is applied,
 * this file exports a minimal placeholder so TypeScript doesn't complain.
 * Replace this entire file with the output of `supabase gen types typescript`.
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
        }
        Update: {
          name?: string
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
          shipping_cost_mad?: number
          total_mad: number
          shipping_provider_id?: string | null
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
        }
        Update: Record<string, never> // append-only, never update
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}