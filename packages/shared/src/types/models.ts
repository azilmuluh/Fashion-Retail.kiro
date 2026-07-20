/**
 * Business Logic Types
 * Domain models and interfaces
 */

import { Database } from './database.types';

// Convenience type helpers
type Tables = Database['public']['Tables'];

export type Retailer = Tables['retailers']['Row'];
export type RetailerInsert = Tables['retailers']['Insert'];
export type RetailerUpdate = Tables['retailers']['Update'];

export type Product = Tables['products']['Row'];
export type ProductInsert = Tables['products']['Insert'];
export type ProductUpdate = Tables['products']['Update'];

export type Customer = Tables['customers']['Row'];
export type CustomerInsert = Tables['customers']['Insert'];
export type CustomerUpdate = Tables['customers']['Update'];

export type Order = Tables['orders']['Row'];
export type OrderInsert = Tables['orders']['Insert'];
export type OrderUpdate = Tables['orders']['Update'];

export type OrderItem = Tables['order_items']['Row'];
export type OrderItemInsert = Tables['order_items']['Insert'];
export type OrderItemUpdate = Tables['order_items']['Update'];

export type Message = Tables['messages']['Row'];
export type MessageInsert = Tables['messages']['Insert'];
export type MessageUpdate = Tables['messages']['Update'];

export type LoyaltyProgram = Tables['loyalty_programs']['Row'];
export type LoyaltyProgramInsert = Tables['loyalty_programs']['Insert'];
export type LoyaltyProgramUpdate = Tables['loyalty_programs']['Update'];

export type LoyaltyPoints = Tables['loyalty_points']['Row'];
export type LoyaltyPointsInsert = Tables['loyalty_points']['Insert'];
export type LoyaltyPointsUpdate = Tables['loyalty_points']['Update'];

export type LoyaltyTransaction = Tables['loyalty_transactions']['Row'];
export type LoyaltyTransactionInsert = Tables['loyalty_transactions']['Insert'];
export type LoyaltyTransactionUpdate = Tables['loyalty_transactions']['Update'];

// Enums
export type OrderStatus = Database['public']['Enums']['order_status'];
export type PaymentStatus = Database['public']['Enums']['payment_status'];
export type MessageDirection = Database['public']['Enums']['message_direction'];
export type MessageType = Database['public']['Enums']['message_type'];
export type MessageStatus = Database['public']['Enums']['message_status'];
export type LoyaltyTransactionType = Database['public']['Enums']['loyalty_transaction_type'];

// Extended types with relationships
export interface ProductWithStock extends Product {
  is_low_stock: boolean;
  is_out_of_stock: boolean;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
  customer: Customer;
}

export interface OrderWithDetails extends Order {
  items: (OrderItem & { product: Product })[];
  customer: Customer;
}

export interface CustomerWithStats extends Customer {
  loyalty_points?: LoyaltyPoints;
  recent_orders?: Order[];
}

// API Response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

// WhatsApp Message types
export interface WhatsAppTextMessage {
  type: 'text';
  text: {
    body: string;
  };
}

export interface WhatsAppInteractiveMessage {
  type: 'interactive';
  interactive: {
    type: 'button' | 'list';
    header?: {
      type: 'text';
      text: string;
    };
    body: {
      text: string;
    };
    footer?: {
      text: string;
    };
    action: {
      buttons?: Array<{
        type: 'reply';
        reply: {
          id: string;
          title: string;
        };
      }>;
      button?: string;
      sections?: Array<{
        title: string;
        rows: Array<{
          id: string;
          title: string;
          description?: string;
        }>;
      }>;
    };
  };
}

export interface WhatsAppImageMessage {
  type: 'image';
  image: {
    link?: string;
    id?: string;
    caption?: string;
  };
}

export type WhatsAppMessage = 
  | WhatsAppTextMessage 
  | WhatsAppInteractiveMessage 
  | WhatsAppImageMessage;

// Loyalty Program Rules
export interface LoyaltyProgramRules {
  earn_rules: {
    points_per_purchase: number;
    minimum_purchase_amount?: number;
    bonus_multipliers?: {
      category?: Record<string, number>;
      customer_tier?: Record<string, number>;
    };
  };
  redemption_rules: {
    minimum_points_to_redeem: number;
    maximum_points_per_order?: number;
    allowed_categories?: string[];
  };
  expiration_rules?: {
    enabled: boolean;
    months_until_expiration?: number;
  };
  tier_rules?: {
    tiers: Array<{
      name: string;
      minimum_lifetime_points: number;
      benefits?: string[];
    }>;
  };
}

// Analytics types
export interface InventoryStats {
  total_products: number;
  total_stock_value: number;
  low_stock_items: number;
  out_of_stock_items: number;
  categories: Record<string, number>;
}

export interface SalesStats {
  total_revenue: number;
  total_orders: number;
  average_order_value: number;
  period_comparison?: {
    revenue_change: number;
    orders_change: number;
  };
}

export interface CustomerStats {
  total_customers: number;
  new_customers_this_month: number;
  repeat_customer_rate: number;
  average_customer_value: number;
}
