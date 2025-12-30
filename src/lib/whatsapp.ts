export const DEFAULT_WHATSAPP_PHONE = '52332831999';

export const DEFAULT_WHATSAPP_MESSAGE = 'Hola, me gustaría recibir información sobre propiedades en Manzanillo.';

/**
 * Validates a phone number for WhatsApp
 * Returns null if valid, error message if invalid
 */
export const validatePhoneNumber = (phone: string): string | null => {
  if (!phone || !phone.trim()) {
    return 'El número de teléfono es requerido';
  }
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length < 10) {
    return 'El número debe tener al menos 10 dígitos';
  }
  
  if (cleaned.length > 12) {
    return 'El número es demasiado largo';
  }
  
  return null;
};

/**
 * Formats a phone number as the user types
 * Input: any phone string
 * Output: formatted like +52 332 183 1999
 */
export const formatPhoneAsYouType = (phone: string): string => {
  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Remove + if not at start
  if (cleaned.indexOf('+') > 0) {
    cleaned = cleaned.replace(/\+/g, '');
  }
  
  // Extract just digits for formatting
  const digits = cleaned.replace(/\D/g, '');
  
  if (digits.length === 0) return '';
  
  // Format based on length
  // Target: +52 332 183 1999 (10 local digits, or 12 with country code)
  
  let result = '+';
  
  if (digits.startsWith('52')) {
    // Already has country code
    result += '52';
    const rest = digits.slice(2);
    if (rest.length > 0) result += ' ' + rest.slice(0, 3);
    if (rest.length > 3) result += ' ' + rest.slice(3, 6);
    if (rest.length > 6) result += ' ' + rest.slice(6, 10);
  } else {
    // Assume Mexican number, add 52
    result += '52 ';
    if (digits.length > 0) result += digits.slice(0, 3);
    if (digits.length > 3) result += ' ' + digits.slice(3, 6);
    if (digits.length > 6) result += ' ' + digits.slice(6, 10);
  }
  
  return result.trim();
};

/**
 * Formats a phone number for display (final format)
 * Input: any phone string
 * Output: formatted like +52 332 183 1999
 */
export const formatPhoneDisplay = (phone: string): string => {
  return formatPhoneAsYouType(phone);
};

/**
 * Normalizes a phone number for storage (ready for WhatsApp API)
 * Format: 52 + 10 digits = 523321831999
 */
export const normalizePhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 0) return '';
  
  // If it's a 10-digit Mexican number, add 52 prefix
  if (cleaned.length === 10) {
    return `52${cleaned}`;
  }
  
  // If it starts with 52 and has 12 digits total, it's correct
  if (cleaned.startsWith('52') && cleaned.length === 12) {
    return cleaned;
  }
  
  // If it has 521 prefix (old mobile format), remove the 1
  if (cleaned.startsWith('521') && cleaned.length === 13) {
    return `52${cleaned.slice(3)}`;
  }
  
  // Already formatted or international
  return cleaned;
};

export const buildWhatsappUrl = (message: string, phone?: string) => {
  const safeMessage = message || DEFAULT_WHATSAPP_MESSAGE;
  const safePhone = phone ? normalizePhoneNumber(phone) : DEFAULT_WHATSAPP_PHONE;
  const encoded = encodeURIComponent(safeMessage);
  return `https://api.whatsapp.com/send?phone=${safePhone}&text=${encoded}`;
};

export const formatPhoneForWhatsapp = (phone: string): string => {
  return normalizePhoneNumber(phone);
};
