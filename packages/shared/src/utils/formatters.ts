/**
 * Utility Functions - Formatters
 */

/**
 * Format currency amount
 */
export function formatCurrency(
  amount: number,
  currency: string = 'XAF',
  locale: string = 'fr-CM'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format phone number
 */
export function formatPhoneNumber(phone: string): string {
  // Assume Cameroon format: +237XXXXXXXXX
  if (phone.startsWith('+237')) {
    const number = phone.substring(4);
    return `+237 ${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`;
  }
  return phone;
}

/**
 * Format date
 */
export function formatDate(
  date: string | Date,
  locale: string = 'fr-CM',
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options || {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(dateObj);
}

/**
 * Format date time
 */
export function formatDateTime(
  date: string | Date,
  locale: string = 'fr-CM'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date, locale: string = 'fr-CM'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return locale === 'fr' ? 'à l\'instant' : 'just now';
  } else if (diffMins < 60) {
    return locale === 'fr' ? `il y a ${diffMins} min` : `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return locale === 'fr' ? `il y a ${diffHours}h` : `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return locale === 'fr' ? `il y a ${diffDays}j` : `${diffDays}d ago`;
  } else {
    return formatDate(dateObj, locale);
  }
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format number with thousand separators
 */
export function formatNumber(value: number, locale: string = 'fr-CM'): string {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * Truncate text
 */
export function truncate(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Generate order number
 */
export function generateOrderNumber(prefix: string = 'ORD'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Normalize phone number to E.164 format
 */
export function normalizePhoneNumber(phone: string, countryCode: string = '+237'): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If starts with country code (without +), add +
  if (digits.startsWith('237')) {
    return `+${digits}`;
  }
  
  // If doesn't start with country code, add it
  if (!digits.startsWith(countryCode.replace('+', ''))) {
    return `${countryCode}${digits}`;
  }
  
  return `+${digits}`;
}
