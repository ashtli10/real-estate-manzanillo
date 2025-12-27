/**
 * i18next Configuration
 * Multi-language support for Spanish and English
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Spanish translations
const es = {
  translation: {
    // Common
    common: {
      loading: 'Cargando...',
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      create: 'Crear',
      search: 'Buscar',
      filter: 'Filtrar',
      all: 'Todos',
      yes: 'Sí',
      no: 'No',
      confirm: 'Confirmar',
      back: 'Volver',
      next: 'Siguiente',
      previous: 'Anterior',
      close: 'Cerrar',
      copy: 'Copiar',
      copied: '¡Copiado!',
      error: 'Error',
      success: 'Éxito',
    },
    
    // Navigation
    nav: {
      home: 'Inicio',
      properties: 'Propiedades',
      dashboard: 'Panel',
      admin: 'Administrador',
      login: 'Iniciar sesión',
      logout: 'Cerrar sesión',
      signup: 'Registrarse',
    },
    
    // Auth
    auth: {
      email: 'Correo electrónico',
      password: 'Contraseña',
      confirmPassword: 'Confirmar contraseña',
      forgotPassword: '¿Olvidaste tu contraseña?',
      noAccount: '¿No tienes cuenta?',
      hasAccount: '¿Ya tienes cuenta?',
      loginTitle: 'Iniciar sesión',
      signupTitle: 'Crear cuenta',
      invitationRequired: 'Se requiere invitación para registrarse',
      invalidToken: 'Enlace de invitación no válido',
      tokenExpired: 'Este enlace ha expirado',
      tokenUsed: 'Este enlace ya fue utilizado',
    },
    
    // Dashboard
    dashboard: {
      title: '¡Hola{{name}}!',
      subtitle: 'Gestiona tus propiedades, créditos y suscripción',
      overview: 'Resumen',
      myProperties: 'Mis Propiedades',
      credits: 'Créditos IA',
      subscription: 'Suscripción',
      profile: 'Mi Perfil',
      adminPanel: 'Panel Admin',
      noProperties: 'No tienes propiedades aún',
      publishFirst: 'Publicar mi primera propiedad',
      recentActivity: 'Actividad reciente',
      noActivity: 'Aún no hay actividad',
    },
    
    // Credits
    credits: {
      title: 'Créditos de IA',
      balance: 'Balance total',
      freeRemaining: 'Gratis restantes',
      purchased: 'Comprados',
      buyMore: 'Comprar más créditos',
      priceNote: '1 MXN = 1 crédito',
      popular: 'Popular',
      bestValue: 'Mejor valor',
      whatFor: '¿Para qué sirven los créditos?',
      generateDescription: 'Generar descripción',
      generateDescriptionDesc: 'IA crea una descripción atractiva',
      enhancePhotos: 'Mejorar fotos',
      enhancePhotosDesc: 'Optimiza la iluminación y colores',
      priceSuggestions: 'Sugerencias de precio',
      priceSuggestionsDesc: 'Análisis de mercado con IA',
      virtualTour: 'Tour virtual',
      virtualTourDesc: 'Genera un recorrido 3D',
    },
    
    // Subscription
    subscription: {
      title: 'Mi Suscripción',
      standardPlan: 'Plan Estándar',
      pricePerMonth: '{{price}} MXN / mes',
      status: {
        trialing: 'Período de prueba',
        active: 'Activa',
        past_due: 'Pago pendiente',
        canceled: 'Cancelada',
        paused: 'Pausada',
        none: 'Sin suscripción',
      },
      trialEnds: 'Tu período de prueba termina en {{days}} días',
      nextRenewal: 'Próxima renovación en {{days}} días',
      subscribe: 'Suscribirse ahora',
      manage: 'Administrar suscripción',
      benefits: {
        unlimited: 'Publicaciones ilimitadas de propiedades',
        freeCredits: '50 créditos de IA gratis cada mes',
        stats: 'Estadísticas de visualizaciones',
        whatsapp: 'Contacto directo por WhatsApp',
        support: 'Soporte prioritario',
      },
    },
    
    // Properties
    property: {
      title: 'Propiedades',
      search: 'Buscar propiedades...',
      type: 'Tipo',
      price: 'Precio',
      bedrooms: 'Recámaras',
      bathrooms: 'Baños',
      size: 'Tamaño',
      parking: 'Estacionamiento',
      nearBeach: 'Cerca de la playa',
      forSale: 'En Venta',
      forRent: 'En Renta',
      featured: 'Destacada',
      contact: 'Contactar',
      details: 'Detalles',
      amenities: 'Amenidades',
      location: 'Ubicación',
      description: 'Descripción',
      addProperty: 'Agregar propiedad',
      editProperty: 'Editar propiedad',
      deleteProperty: 'Eliminar propiedad',
      types: {
        casa: 'Casa',
        departamento: 'Departamento',
        terreno: 'Terreno',
        comercial: 'Comercial',
        bodega: 'Bodega',
      },
    },
    
    // Admin
    admin: {
      title: 'Panel de Administración',
      properties: 'Propiedades',
      invitations: 'Invitaciones',
      newInvitation: 'Nueva invitación',
      invitationCreated: '¡Invitación creada!',
      shareLink: 'Comparte este enlace:',
      trialDays: 'Días de prueba',
      expiresIn: 'El enlace expira en (días)',
      emailOptional: 'Email (opcional)',
      active: 'Activa',
      expired: 'Expirada',
      used: 'Usada',
    },
    
    // Profile
    profile: {
      title: 'Mi Perfil',
      fullName: 'Nombre completo',
      phone: 'Teléfono / WhatsApp',
      company: 'Empresa / Inmobiliaria',
      language: 'Idioma preferido',
      editProfile: 'Editar perfil',
      saveChanges: 'Guardar cambios',
    },
    
    // Errors
    errors: {
      required: 'Este campo es requerido',
      invalidEmail: 'Correo electrónico no válido',
      passwordMin: 'La contraseña debe tener al menos 8 caracteres',
      passwordMatch: 'Las contraseñas no coinciden',
      generic: 'Ocurrió un error. Intenta de nuevo.',
      notFound: 'No encontrado',
      unauthorized: 'No autorizado',
    },
  },
};

// English translations
const en = {
  translation: {
    // Common
    common: {
      loading: 'Loading...',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      create: 'Create',
      search: 'Search',
      filter: 'Filter',
      all: 'All',
      yes: 'Yes',
      no: 'No',
      confirm: 'Confirm',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      close: 'Close',
      copy: 'Copy',
      copied: 'Copied!',
      error: 'Error',
      success: 'Success',
    },
    
    // Navigation
    nav: {
      home: 'Home',
      properties: 'Properties',
      dashboard: 'Dashboard',
      admin: 'Admin',
      login: 'Log in',
      logout: 'Log out',
      signup: 'Sign up',
    },
    
    // Auth
    auth: {
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm password',
      forgotPassword: 'Forgot your password?',
      noAccount: "Don't have an account?",
      hasAccount: 'Already have an account?',
      loginTitle: 'Log in',
      signupTitle: 'Create account',
      invitationRequired: 'Invitation required to sign up',
      invalidToken: 'Invalid invitation link',
      tokenExpired: 'This link has expired',
      tokenUsed: 'This link has already been used',
    },
    
    // Dashboard
    dashboard: {
      title: 'Hello{{name}}!',
      subtitle: 'Manage your properties, credits, and subscription',
      overview: 'Overview',
      myProperties: 'My Properties',
      credits: 'AI Credits',
      subscription: 'Subscription',
      profile: 'My Profile',
      adminPanel: 'Admin Panel',
      noProperties: "You don't have any properties yet",
      publishFirst: 'Publish my first property',
      recentActivity: 'Recent activity',
      noActivity: 'No activity yet',
    },
    
    // Credits
    credits: {
      title: 'AI Credits',
      balance: 'Total balance',
      freeRemaining: 'Free remaining',
      purchased: 'Purchased',
      buyMore: 'Buy more credits',
      priceNote: '1 MXN = 1 credit',
      popular: 'Popular',
      bestValue: 'Best value',
      whatFor: 'What are credits for?',
      generateDescription: 'Generate description',
      generateDescriptionDesc: 'AI creates an attractive description',
      enhancePhotos: 'Enhance photos',
      enhancePhotosDesc: 'Optimize lighting and colors',
      priceSuggestions: 'Price suggestions',
      priceSuggestionsDesc: 'AI market analysis',
      virtualTour: 'Virtual tour',
      virtualTourDesc: 'Generate a 3D walkthrough',
    },
    
    // Subscription
    subscription: {
      title: 'My Subscription',
      standardPlan: 'Standard Plan',
      pricePerMonth: '{{price}} MXN / month',
      status: {
        trialing: 'Trial period',
        active: 'Active',
        past_due: 'Past due',
        canceled: 'Canceled',
        paused: 'Paused',
        none: 'No subscription',
      },
      trialEnds: 'Your trial ends in {{days}} days',
      nextRenewal: 'Next renewal in {{days}} days',
      subscribe: 'Subscribe now',
      manage: 'Manage subscription',
      benefits: {
        unlimited: 'Unlimited property listings',
        freeCredits: '50 free AI credits every month',
        stats: 'View statistics',
        whatsapp: 'Direct WhatsApp contact',
        support: 'Priority support',
      },
    },
    
    // Properties
    property: {
      title: 'Properties',
      search: 'Search properties...',
      type: 'Type',
      price: 'Price',
      bedrooms: 'Bedrooms',
      bathrooms: 'Bathrooms',
      size: 'Size',
      parking: 'Parking',
      nearBeach: 'Near beach',
      forSale: 'For Sale',
      forRent: 'For Rent',
      featured: 'Featured',
      contact: 'Contact',
      details: 'Details',
      amenities: 'Amenities',
      location: 'Location',
      description: 'Description',
      addProperty: 'Add property',
      editProperty: 'Edit property',
      deleteProperty: 'Delete property',
      types: {
        casa: 'House',
        departamento: 'Apartment',
        terreno: 'Land',
        comercial: 'Commercial',
        bodega: 'Warehouse',
      },
    },
    
    // Admin
    admin: {
      title: 'Admin Panel',
      properties: 'Properties',
      invitations: 'Invitations',
      newInvitation: 'New invitation',
      invitationCreated: 'Invitation created!',
      shareLink: 'Share this link:',
      trialDays: 'Trial days',
      expiresIn: 'Link expires in (days)',
      emailOptional: 'Email (optional)',
      active: 'Active',
      expired: 'Expired',
      used: 'Used',
    },
    
    // Profile
    profile: {
      title: 'My Profile',
      fullName: 'Full name',
      phone: 'Phone / WhatsApp',
      company: 'Company / Agency',
      language: 'Preferred language',
      editProfile: 'Edit profile',
      saveChanges: 'Save changes',
    },
    
    // Errors
    errors: {
      required: 'This field is required',
      invalidEmail: 'Invalid email address',
      passwordMin: 'Password must be at least 8 characters',
      passwordMatch: 'Passwords do not match',
      generic: 'An error occurred. Please try again.',
      notFound: 'Not found',
      unauthorized: 'Unauthorized',
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es,
      en,
    },
    fallbackLng: 'es',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;
