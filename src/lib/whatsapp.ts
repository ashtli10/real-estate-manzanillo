export const DEFAULT_WHATSAPP_PHONE = '5213141417309';

export const DEFAULT_WHATSAPP_MESSAGE = 'Hola, me gustaría recibir información sobre propiedades en Manzanillo.';

export const buildWhatsappUrl = (message: string, phone?: string) => {
  const safeMessage = message || DEFAULT_WHATSAPP_MESSAGE;
  const safePhone = phone || DEFAULT_WHATSAPP_PHONE;
  const encoded = encodeURIComponent(safeMessage);
  return `https://api.whatsapp.com/send?phone=${safePhone}&text=${encoded}`;
};

export const formatPhoneForWhatsapp = (phone: string): string => {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If it starts with country code, use as-is
  if (cleaned.length >= 10) {
    return cleaned;
  }
  
  // Assume Mexico if no country code
  return `521${cleaned}`;
};
