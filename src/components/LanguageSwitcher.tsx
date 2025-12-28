import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../i18n';

interface LanguageSwitcherProps {
  variant?: 'header' | 'footer' | 'compact';
}

export function LanguageSwitcher({ variant = 'header' }: LanguageSwitcherProps) {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguage();

  if (variant === 'compact') {
    return (
      <button
        onClick={() => changeLanguage(currentLanguage === 'en' ? 'es' : 'en')}
        className="flex items-center space-x-1 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
        title={t('common.language')}
      >
        <Globe className="h-5 w-5" />
        <span className="uppercase font-medium text-sm">{currentLanguage}</span>
      </button>
    );
  }

  return (
    <div className="flex items-center space-x-1 bg-white/10 rounded-lg p-1">
      <button
        onClick={() => changeLanguage('en')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          currentLanguage === 'en'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-white/90 hover:text-white hover:bg-white/10'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => changeLanguage('es')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          currentLanguage === 'es'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-white/90 hover:text-white hover:bg-white/10'
        }`}
      >
        ES
      </button>
    </div>
  );
}
