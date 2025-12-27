/**
 * Zod Validation Schemas
 * Centralized validation for all forms with security focus
 */

import { z } from 'zod';

// =============================================================================
// COMMON VALIDATORS
// =============================================================================

/**
 * Sanitize string to prevent XSS - removes HTML tags
 * For display purposes, use DOMPurify separately
 */
const sanitizeString = (val: string) => 
  val.replace(/<[^>]*>/g, '').trim();

/**
 * Mexican phone number validation
 * Accepts formats: +52XXXXXXXXXX, 52XXXXXXXXXX, XXXXXXXXXX (10 digits)
 */
export const mexicanPhoneSchema = z
  .string()
  .transform(val => val.replace(/[\s\-()]/g, '')) // Remove spaces, dashes, parens
  .refine(
    val => /^(\+?52)?[0-9]{10}$/.test(val),
    { message: 'Ingresa un número de teléfono mexicano válido (10 dígitos)' }
  );

/**
 * URL-safe slug validation
 */
export const slugSchema = z
  .string()
  .min(3, 'El slug debe tener al menos 3 caracteres')
  .max(100, 'El slug no puede exceder 100 caracteres')
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'El slug solo puede contener letras minúsculas, números y guiones'
  );

/**
 * Email validation with additional security checks
 */
export const emailSchema = z
  .string()
  .email('Ingresa un correo electrónico válido')
  .max(254, 'El correo es demasiado largo')
  .transform(val => val.toLowerCase().trim());

/**
 * Password validation with strength requirements
 */
export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(128, 'La contraseña no puede exceder 128 caracteres')
  .regex(/[A-Z]/, 'Debe contener al menos una letra mayúscula')
  .regex(/[a-z]/, 'Debe contener al menos una letra minúscula')
  .regex(/[0-9]/, 'Debe contener al menos un número');

/**
 * Strong password for registration
 */
export const strongPasswordSchema = passwordSchema
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Debe contener al menos un carácter especial');

// =============================================================================
// AUTHENTICATION SCHEMAS
// =============================================================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'La contraseña es requerida'),
});

export const signupSchema = z.object({
  email: emailSchema,
  password: strongPasswordSchema,
  confirmPassword: z.string(),
  invitationToken: z.string().min(1, 'El token de invitación es requerido'),
}).refine(
  data => data.password === data.confirmPassword,
  {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  }
);

// =============================================================================
// PROFILE SCHEMAS
// =============================================================================

export const profileSchema = z.object({
  fullName: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .transform(sanitizeString),
  phone: mexicanPhoneSchema.optional().or(z.literal('')),
  companyName: z
    .string()
    .max(100, 'El nombre de la empresa no puede exceder 100 caracteres')
    .transform(sanitizeString)
    .optional()
    .or(z.literal('')),
  languagePreference: z.enum(['es', 'en']).default('es'),
});

export const onboardingSchema = profileSchema.extend({
  acceptTerms: z.literal(true, {
    message: 'Debes aceptar los términos y condiciones',
  }),
});

// =============================================================================
// INVITATION SCHEMAS
// =============================================================================

export const createInvitationSchema = z.object({
  email: emailSchema.optional().or(z.literal('')),
  trialDays: z
    .number()
    .int('Los días de prueba deben ser un número entero')
    .min(1, 'Mínimo 1 día de prueba')
    .max(90, 'Máximo 90 días de prueba')
    .default(14),
  expiresInDays: z
    .number()
    .int('Los días de expiración deben ser un número entero')
    .min(1, 'El link debe ser válido por al menos 1 día')
    .max(30, 'El link no puede ser válido por más de 30 días')
    .default(7),
});

// =============================================================================
// PROPERTY SCHEMAS
// =============================================================================

export const propertyImageSchema = z.object({
  url: z.string().url('URL de imagen inválida'),
  alt: z.string().max(200).optional(),
  order: z.number().int().min(0).optional(),
});

export const propertyVideoSchema = z.object({
  url: z.string().url('URL de video inválida'),
  type: z.enum(['youtube', 'vimeo', 'upload']),
  title: z.string().max(200).optional(),
});

export const propertyCharacteristicSchema = z.object({
  key: z.string().min(1).max(50),
  label: z.string().min(1).max(100),
  value: z.string().min(1).max(200),
});

export const propertyLocationSchema = z.object({
  address: z.string().max(200).optional(),
  city: z.string().min(1, 'La ciudad es requerida').max(100),
  state: z.string().min(1, 'El estado es requerido').max(100),
  neighborhood: z.string().max(100).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export const propertySchema = z.object({
  title: z
    .string()
    .min(5, 'El título debe tener al menos 5 caracteres')
    .max(200, 'El título no puede exceder 200 caracteres')
    .transform(sanitizeString),
  slug: slugSchema,
  description: z
    .string()
    .max(10000, 'La descripción no puede exceder 10,000 caracteres')
    .transform(sanitizeString)
    .optional(),
  propertyType: z.enum(['casa', 'departamento', 'terreno', 'local', 'oficina']),
  propertyCondition: z.enum(['nuevo', 'usado']),
  isForSale: z.boolean().default(false),
  isForRent: z.boolean().default(false),
  price: z.number().positive('El precio debe ser mayor a 0').optional(),
  currency: z.enum(['MXN', 'USD']).default('MXN'),
  rentPrice: z.number().positive('El precio de renta debe ser mayor a 0').optional(),
  rentCurrency: z.enum(['MXN', 'USD']).default('MXN'),
  location: propertyLocationSchema,
  showMap: z.boolean().default(true),
  nearBeach: z.boolean().default(false),
  isPublished: z.boolean().default(false),
  images: z.array(propertyImageSchema).default([]),
  videos: z.array(propertyVideoSchema).default([]),
  characteristics: z.array(propertyCharacteristicSchema).default([]),
}).refine(
  data => data.isForSale || data.isForRent,
  {
    message: 'La propiedad debe estar en venta, en renta, o ambos',
    path: ['isForSale'],
  }
).refine(
  data => !data.isForSale || (data.isForSale && data.price && data.price > 0),
  {
    message: 'El precio de venta es requerido cuando está en venta',
    path: ['price'],
  }
).refine(
  data => !data.isForRent || (data.isForRent && data.rentPrice && data.rentPrice > 0),
  {
    message: 'El precio de renta es requerido cuando está en renta',
    path: ['rentPrice'],
  }
);

// =============================================================================
// CREDIT SCHEMAS
// =============================================================================

export const creditTopUpSchema = z.object({
  amount: z
    .number()
    .int('La cantidad debe ser un número entero')
    .min(10, 'Mínimo 10 créditos')
    .max(1000, 'Máximo 1000 créditos por compra'),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type PropertyInput = z.infer<typeof propertySchema>;
export type CreditTopUpInput = z.infer<typeof creditTopUpSchema>;
