import { Building2, MapPin, Heart, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';

interface FooterProps {
  onNavigate?: (path: string) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const { t } = useTranslation();

  const handleNavigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.hash = path;
    }
  };

  return (
    <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-400 p-2.5 rounded-xl">
                <Building2 className="h-7 w-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{t('brand.name')}</h3>
                <p className="text-sm text-gray-400">{t('brand.tagline')}</p>
              </div>
            </div>
            <p className="text-gray-300 leading-relaxed text-sm">
              {t('footer.description')}
            </p>
            
            {/* Language Switcher */}
            <div className="mt-6">
              <p className="text-sm text-gray-400 mb-2">{t('common.language')}</p>
              <LanguageSwitcher variant="footer" />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-cyan-300">{t('footer.quickLinks')}</h4>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() => handleNavigate('/')}
                  className="text-gray-300 hover:text-white transition-colors text-sm flex items-center gap-2"
                >
                  <span>→</span> {t('nav.home')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigate('/propiedades')}
                  className="text-gray-300 hover:text-white transition-colors text-sm flex items-center gap-2"
                >
                  <span>→</span> {t('nav.properties')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigate('/propiedades?listing=sale')}
                  className="text-gray-300 hover:text-white transition-colors text-sm flex items-center gap-2"
                >
                  <span>→</span> {t('common.forSale')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigate('/propiedades?listing=rent')}
                  className="text-gray-300 hover:text-white transition-colors text-sm flex items-center gap-2"
                >
                  <span>→</span> {t('common.forRent')}
                </button>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-cyan-300">{t('footer.contact')}</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-300 text-sm">Ciudad de México</p>
                  <p className="text-gray-400 text-xs">México</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                <a
                  href="mailto:info@habitex.mx"
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  info@habitex.mx
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700/50 mt-10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm text-center md:text-left">
              © {new Date().getFullYear()} {t('brand.name')}. {t('footer.allRights')}
            </p>
            <p className="text-gray-500 text-xs flex items-center gap-1">
              {t('footer.madeWith')} <Heart className="h-3 w-3 text-red-400 fill-red-400" /> {t('footer.inManzanillo')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
