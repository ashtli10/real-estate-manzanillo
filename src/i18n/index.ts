import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { en } from './en';
import { es } from './es';

const resources = {
  en: { translation: en },
  es: { translation: es },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'es',
    defaultNS: 'translation',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'language',
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

// Export a hook for language switching
export const useLanguage = () => {
  const changeLanguage = async (lang: 'en' | 'es', userId?: string, supabase?: unknown) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
    
    // If user is logged in and supabase client is provided, save preference to profile
    if (userId && supabase) {
      try {
        // Type assertion since we can't import supabase types here without circular deps
        const client = supabase as { from: (table: string) => { update: (data: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<unknown> } } };
        await client
          .from('profiles')
          .update({ language_preference: lang })
          .eq('id', userId);
      } catch (error) {
        console.error('Failed to save language preference:', error);
      }
    }
  };

  const currentLanguage = (i18n.language?.substring(0, 2) || 'es') as 'en' | 'es';

  return {
    currentLanguage,
    changeLanguage,
    isEnglish: currentLanguage === 'en',
    isSpanish: currentLanguage === 'es',
  };
};

// Simple language change without profile update (for use in components without auth context)
export const changeLanguageSimple = (lang: 'en' | 'es') => {
  i18n.changeLanguage(lang);
  localStorage.setItem('language', lang);
};
