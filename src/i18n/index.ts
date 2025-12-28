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
    fallbackLng: 'en',
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
  const changeLanguage = (lang: 'en' | 'es') => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const currentLanguage = i18n.language?.substring(0, 2) as 'en' | 'es';

  return {
    currentLanguage: currentLanguage || 'en',
    changeLanguage,
    isEnglish: currentLanguage === 'en',
    isSpanish: currentLanguage === 'es',
  };
};
