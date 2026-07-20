/**
 * Utility Functions - Validators
 */

import { VALIDATION } from '../constants';

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  return VALIDATION.EMAIL_REGEX.test(email);
}

/**
 * Validate Cameroon phone number
 */
export function isValidPhoneNumber(phone: string): boolean {
  return VALIDATION.PHONE_REGEX.test(phone);
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < VALIDATION.MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${VALIDATION.MIN_PASSWORD_LENGTH} characters`);
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate price
 */
export function isValidPrice(price: number): boolean {
  return price >= 0 && Number.isFinite(price);
}

/**
 * Validate stock quantity
 */
export function isValidStockQuantity(quantity: number): boolean {
  return quantity >= 0 && Number.isInteger(quantity);
}

/**
 * Validate product name
 */
export function isValidProductName(name: string): boolean {
  return (
    name.trim().length > 0 &&
    name.length <= VALIDATION.MAX_PRODUCT_NAME_LENGTH
  );
}

/**
 * Validate SKU
 */
export function isValidSKU(sku: string): boolean {
  // Alphanumeric, dashes, underscores allowed
  return /^[A-Za-z0-9_-]+$/.test(sku);
}

/**
 * Validate image file
 */
export function isValidImageFile(file: { type: string; size: number }): {
  valid: boolean;
  error?: string;
} {
  const maxSizeBytes = VALIDATION.MAX_FILE_SIZE_MB * 1024 * 1024;

  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' };
  }

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size must be less than ${VALIDATION.MAX_FILE_SIZE_MB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Validate URL
 */
export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate loyalty points
 */
export function isValidLoyaltyPoints(points: number): boolean {
  return points >= 0 && Number.isInteger(points);
}
