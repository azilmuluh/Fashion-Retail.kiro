/**
 * Database Types
 * TypeScript types generated from Supabase schema
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
      retailers: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          email: string
          business_name: string
          phone_number: string
          whatsapp_number: string
          business_address: string | null
          logo_url: string | null
          currency: string
          timezone: string
          is_active: boolean
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          email: string
          business_name: string
          phone_number: string
          whatsapp_number: string
          business_address?: string | null
          logo_url?: string | null
          currency?: string
          timezone?: string
          is_active?: boolean
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          email?: string
          business_name?: string
          phone_number?: string
          whatsapp_number?: string
          business_address?: string | null
          logo_url?: string | null
          currency?: string
          timezone?: string
          is_active?: boolean
          metadata?: Json | null
        }
      }
      products: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          retailer_id: string
          name: string
          description: string | null
          category: string
          price: number
          currency: string
          stock_quantity: number
          low_stock_threshold: number
          sku: string | null
          barcode: string | null
          images: string[]
          sizes: string[]
          colors: string[]
          is_active: boolean
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          retailer_id: string
          name: string
          description?: string | null
          category: string
          price: number
          currency?: string
          stock_quantity?: number
          low_stock_threshold?: number
          sku?: string | null
          barcode?: string | null
          images?: string[]
          sizes?: string[]
          colors?: string[]
          is_active?: boolean
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          retailer_id?: string
          name?: string
          description?: string | null
          category?: string
          price?: number
          currency?: string
          stock_quantity?: number
          low_stock_threshold?: number
          sku?: string | null
          barcode?: string | null
          images?: string[]
          sizes?: string[]
          colors?: string[]
          is_active?: boolean
          metadata?: Json | null
        }
      }
      customers: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          retailer_id: string
          phone_number: string
          name: string | null
          email: string | null
          preferred_language: string
          total_orders: number
          total_spent: number
          last_order_date: string | null
          notes: string | null
          tags: string[]
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          retailer_id: string
          phone_number: string
          name?: string | null
          email?: string | null
          preferred_language?: string
          total_orders?: number
          total_spent?: number
          last_order_date?: string | null
          notes?: string | null
          tags?: string[]
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          retailer_id?: string
          phone_number?: string
          name?: string | null
          email?: string | null
          preferred_language?: string
          total_orders?: number
          total_spent?: number
          last_order_date?: string | null
          notes?: string | null
          tags?: string[]
          metadata?: Json | null
        }
      }
      orders: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          retailer_id: string
          customer_id: string
          order_number: string
          status: 'pending' | 'confirmed' | 'processing' | 'fulfilled' | 'delivered' | 'cancelled'
          total_amount: number
          currency: string
          payment_status: 'pending' | 'partial' | 'paid' | 'refunded'
          payment_method: string | null
          delivery_address: string | null
          delivery_notes: string | null
          fulfilled_at: string | null
          delivered_at: string | null
          cancelled_at: string | null
          cancellation_reason: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          retailer_id: string
          customer_id: string
          order_number: string
          status?: 'pending' | 'confirmed' | 'processing' | 'fulfilled' | 'delivered' | 'cancelled'
          total_amount: number
          currency?: string
          payment_status?: 'pending' | 'partial' | 'paid' | 'refunded'
          payment_method?: string | null
          delivery_address?: string | null
          delivery_notes?: string | null
          fulfilled_at?: string | null
          delivered_at?: string | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          retailer_id?: string
          customer_id?: string
          order_number?: string
          status?: 'pending' | 'confirmed' | 'processing' | 'fulfilled' | 'delivered' | 'cancelled'
          total_amount?: number
          currency?: string
          payment_status?: 'pending' | 'partial' | 'paid' | 'refunded'
          payment_method?: string | null
          delivery_address?: string | null
          delivery_notes?: string | null
          fulfilled_at?: string | null
          delivered_at?: string | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
          metadata?: Json | null
        }
      }
      order_items: {
        Row: {
          id: string
          created_at: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          subtotal: number
          size: string | null
          color: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          subtotal: number
          size?: string | null
          color?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
          subtotal?: number
          size?: string | null
          color?: string | null
          metadata?: Json | null
        }
      }
      messages: {
        Row: {
          id: string
          created_at: string
          retailer_id: string
          customer_id: string
          direction: 'inbound' | 'outbound'
          message_type: 'text' | 'image' | 'interactive' | 'template'
          content: string
          whatsapp_message_id: string | null
          status: 'sent' | 'delivered' | 'read' | 'failed'
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          retailer_id: string
          customer_id: string
          direction: 'inbound' | 'outbound'
          message_type?: 'text' | 'image' | 'interactive' | 'template'
          content: string
          whatsapp_message_id?: string | null
          status?: 'sent' | 'delivered' | 'read' | 'failed'
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          retailer_id?: string
          customer_id?: string
          direction?: 'inbound' | 'outbound'
          message_type?: 'text' | 'image' | 'interactive' | 'template'
          content?: string
          whatsapp_message_id?: string | null
          status?: 'sent' | 'delivered' | 'read' | 'failed'
          metadata?: Json | null
        }
      }
      loyalty_programs: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          retailer_id: string
          name: string
          description: string | null
          points_per_currency: number
          currency_per_point: number
          is_active: boolean
          rules: Json
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          retailer_id: string
          name: string
          description?: string | null
          points_per_currency?: number
          currency_per_point?: number
          is_active?: boolean
          rules?: Json
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          retailer_id?: string
          name?: string
          description?: string | null
          points_per_currency?: number
          currency_per_point?: number
          is_active?: boolean
          rules?: Json
          metadata?: Json | null
        }
      }
      loyalty_points: {
        Row: {
          id: string
          created_at: string
          retailer_id: string
          customer_id: string
          points_balance: number
          lifetime_points: number
          points_redeemed: number
          tier: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          retailer_id: string
          customer_id: string
          points_balance?: number
          lifetime_points?: number
          points_redeemed?: number
          tier?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          retailer_id?: string
          customer_id?: string
          points_balance?: number
          lifetime_points?: number
          points_redeemed?: number
          tier?: string | null
          metadata?: Json | null
        }
      }
      loyalty_transactions: {
        Row: {
          id: string
          created_at: string
          retailer_id: string
          customer_id: string
          points_change: number
          transaction_type: 'earn' | 'redeem' | 'expire' | 'adjustment'
          reference_id: string | null
          reference_type: string | null
          description: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          retailer_id: string
          customer_id: string
          points_change: number
          transaction_type: 'earn' | 'redeem' | 'expire' | 'adjustment'
          reference_id?: string | null
          reference_type?: string | null
          description: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          retailer_id?: string
          customer_id?: string
          points_change?: number
          transaction_type?: 'earn' | 'redeem' | 'expire' | 'adjustment'
          reference_id?: string | null
          reference_type?: string | null
          description?: string
          metadata?: Json | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      order_status: 'pending' | 'confirmed' | 'processing' | 'fulfilled' | 'delivered' | 'cancelled'
      payment_status: 'pending' | 'partial' | 'paid' | 'refunded'
      message_direction: 'inbound' | 'outbound'
      message_type: 'text' | 'image' | 'interactive' | 'template'
      message_status: 'sent' | 'delivered' | 'read' | 'failed'
      loyalty_transaction_type: 'earn' | 'redeem' | 'expire' | 'adjustment'
    }
  }
}
