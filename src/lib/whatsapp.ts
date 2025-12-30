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
  
  if (cleaned.length > 15) {
    return 'El número es demasiado largo';
  }
  
  return null;
};

/**
 * Formats a phone number for display
 * Input: any phone string
 * Output: formatted like +52 314 141 7309
 */
export const formatPhoneDisplay = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 0) return '';
  
  // If it's a Mexican number (starts with 52 and has enough digits)
  if (cleaned.startsWith('52') && cleaned.length >= 12) {
    const rest = cleaned.slice(2);
    if (rest.startsWith('1') && rest.length === 11) {
      // Has mobile prefix: +52 1 XXX XXX XXXX
      return `+52 1 ${rest.slice(1, 4)} ${rest.slice(4, 7)} ${rest.slice(7)}`;
    }
    // Format: +52 XXX XXX XXXX
    return `+52 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`;
  }
  
  // If it's just 10 digits (local Mexican format)
  if (cleaned.length === 10) {
    return `+52 1 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  
  // For other formats, just add + if it looks international
  if (cleaned.length > 10) {
    return `+${cleaned}`;
  }
  
  return cleaned;
};

/**
 * Normalizes a phone number for storage (ready for WhatsApp API)
 * Strips all non-numeric characters and ensures country code
 */
export const normalizePhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 0) return '';
  
  // If it's a 10-digit Mexican number, add 521 prefix
  if (cleaned.length === 10) {
    return `521${cleaned}`;
  }
  
  // If it starts with 52 but missing the 1 for mobile (12 digits total: 52 + 10)
  if (cleaned.startsWith('52') && cleaned.length === 12) {
    return `521${cleaned.slice(2)}`;
  }
  
  // Already has full country code with mobile prefix or international
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
