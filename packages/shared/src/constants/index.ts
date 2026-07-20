/**
 * Shared Constants
 */

// Currencies
export const CURRENCIES = {
  XAF: 'XAF', // Central African CFA franc
  USD: 'USD',
  EUR: 'EUR',
} as const;

export const DEFAULT_CURRENCY = CURRENCIES.XAF;

// Languages
export const LANGUAGES = {
  EN: 'en',
  FR: 'fr',
} as const;

export const DEFAULT_LANGUAGE = LANGUAGES.EN;

// Timezones
export const TIMEZONES = {
  CAMEROON: 'Africa/Douala',
} as const;

export const DEFAULT_TIMEZONE = TIMEZONES.CAMEROON;

// Order Status
export const ORDER_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  FULFILLED: 'fulfilled',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

// Payment Status
export const PAYMENT_STATUSES = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  PAID: 'paid',
  REFUNDED: 'refunded',
} as const;

// Payment Methods
export const PAYMENT_METHODS = {
  CASH: 'cash',
  MTN_MOMO: 'mtn_momo',
  ORANGE_MONEY: 'orange_money',
  BANK_TRANSFER: 'bank_transfer',
} as const;

// Message Direction
export const MESSAGE_DIRECTIONS = {
  INBOUND: 'inbound',
  OUTBOUND: 'outbound',
} as const;

// Message Types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  INTERACTIVE: 'interactive',
  TEMPLATE: 'template',
} as const;

// Message Status
export const MESSAGE_STATUSES = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
} as const;

// Loyalty Transaction Types
export const LOYALTY_TRANSACTION_TYPES = {
  EARN: 'earn',
  REDEEM: 'redeem',
  EXPIRE: 'expire',
  ADJUSTMENT: 'adjustment',
} as const;

// Product Categories (can be extended)
export const PRODUCT_CATEGORIES = {
  DRESSES: 'dresses',
  TOPS: 'tops',
  BOTTOMS: 'bottoms',
  SHOES: 'shoes',
  ACCESSORIES: 'accessories',
  BAGS: 'bags',
  JEWELRY: 'jewelry',
  OUTERWEAR: 'outerwear',
} as const;

// Stock Thresholds
export const STOCK_THRESHOLDS = {
  LOW_STOCK: 10,
  OUT_OF_STOCK: 0,
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// WhatsApp
export const WHATSAPP = {
  MAX_MESSAGE_LENGTH: 4096,
  MAX_BUTTONS: 3,
  MAX_LIST_SECTIONS: 10,
  MAX_LIST_ROWS_PER_SECTION: 10,
} as const;

// Validation
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_PRODUCT_NAME_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 2000,
  PHONE_REGEX: /^\+237[0-9]{9}$/,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

// Image Upload
export const IMAGE_UPLOAD = {
  MAX_FILE_SIZE_MB: 5,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  MAX_IMAGES_PER_PRODUCT: 5,
} as const;

// Loyalty Program Defaults
export const LOYALTY_DEFAULTS = {
  POINTS_PER_XAF: 1, // 1 point per 1 XAF spent
  XAF_PER_POINT: 1, // 1 XAF value per point
  MIN_POINTS_TO_REDEEM: 100,
  POINTS_EXPIRATION_MONTHS: 12,
} as const;
