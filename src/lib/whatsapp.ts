export const WHATSAPP_PHONE = '5213141417309';

export const DEFAULT_WHATSAPP_MESSAGE = 'Hola, me gustaría recibir información sobre propiedades en Manzanillo.';

export const buildWhatsappUrl = (message: string) => {
  const safeMessage = message || DEFAULT_WHATSAPP_MESSAGE;
  const encoded = encodeURIComponent(safeMessage);
  return `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encoded}`;
};
