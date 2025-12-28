import { Home, Building2, LogIn, LogOut, Globe } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

interface HeaderProps {
  onNavigate: (path: string) => void;
  currentPath: string;
}

export function Header({ onNavigate, currentPath }: HeaderProps) {
  const { user, signOut } = useAuth();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'es' ? 'en' : 'es';
    i18n.changeLanguage(newLang);
  };

  const navItems = [
    { path: '/', label: t('nav.home'), icon: Home },
    { path: '/propiedades', label: t('nav.properties'), icon: Building2 },
  ];

  return (
    <header className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate('/')}
            className="flex items-center space-x-3 group"
          >
            <img 
              src="/branding/BN_small_square.png" 
              alt="BN Inmobiliaria Logo" 
              className="h-16 w-16 object-contain group-hover:scale-110 transition-transform"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <div className="text-left">
              <h1 className="text-2xl font-bold tracking-tight">BN Inmobiliaria</h1>
              <p className="text-sm text-blue-100">Tu hogar ideal en Manzanillo</p>
            </div>
          </button>

          <nav className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => onNavigate(item.path)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  currentPath === item.path
                    ? 'bg-white text-blue-600 shadow-md'
                    : 'hover:bg-blue-400 hover:bg-opacity-30'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
            {user ? (
              <>
                <button
                  onClick={() => onNavigate('/dashboard')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                    currentPath.startsWith('/dashboard')
                      ? 'bg-white text-blue-600 shadow-md'
                      : 'hover:bg-blue-400 hover:bg-opacity-30'
                  }`}
                >
                  <Building2 className="h-5 w-5" />
                  <span className="font-medium">{t('nav.dashboard')}</span>
                </button>
                <button
                  onClick={signOut}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-red-500 hover:bg-opacity-30 transition-all"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">{t('nav.logout')}</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => onNavigate('/login')}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-all"
                aria-label={t('nav.login')}
                title={t('nav.login')}
              >
                <LogIn className="h-5 w-5 text-white" />
                <span className="sr-only">{t('nav.login')}</span>
              </button>
            )}
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-all"
              title={i18n.language === 'es' ? 'Switch to English' : 'Cambiar a Español'}
            >
              <Globe className="h-5 w-5" />
              <span className="sr-only">{i18n.language.toUpperCase()}</span>
            </button>
          </nav>

          <button
            className="md:hidden p-2 hover:bg-blue-400 hover:bg-opacity-30 rounded-lg"
            onClick={() => {
              const menu = document.getElementById('mobile-menu');
              menu?.classList.toggle('hidden');
            }}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <div id="mobile-menu" className="hidden md:hidden mt-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => {
                onNavigate(item.path);
                document.getElementById('mobile-menu')?.classList.add('hidden');
              }}
              className={`w-full flex items-center space-x-2 px-4 py-3 rounded-lg transition-all ${
                currentPath === item.path
                  ? 'bg-white text-blue-600 shadow-md'
                  : 'hover:bg-blue-400 hover:bg-opacity-30'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
          {user ? (
            <>
              <button
                onClick={() => {
                  onNavigate('/dashboard');
                  document.getElementById('mobile-menu')?.classList.add('hidden');
                }}
                className="w-full flex items-center space-x-2 px-4 py-3 rounded-lg hover:bg-blue-400 hover:bg-opacity-30 transition-all"
              >
                <Building2 className="h-5 w-5" />
                <span className="font-medium">{t('nav.dashboard')}</span>
              </button>
              <button
                onClick={signOut}
                className="w-full flex items-center space-x-2 px-4 py-3 rounded-lg hover:bg-red-500 hover:bg-opacity-30 transition-all"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">{t('nav.logout')}</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                onNavigate('/login');
                document.getElementById('mobile-menu')?.classList.add('hidden');
              }}
              className="w-full flex items-center space-x-2 px-4 py-3 rounded-lg hover:bg-blue-400 hover:bg-opacity-30 transition-all"
            >
              <LogIn className="h-5 w-5" />
              <span className="font-medium">{t('nav.login')}</span>
            </button>
          )}
          {/* Mobile Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="w-full flex items-center space-x-2 px-4 py-3 rounded-lg hover:bg-blue-400 hover:bg-opacity-30 transition-all"
          >
            <Globe className="h-5 w-5" />
            <span className="font-medium">{i18n.language === 'es' ? 'English' : 'Español'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
