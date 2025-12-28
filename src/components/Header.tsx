import { useState } from 'react';
import { Home, Building2, LogIn, LogOut, Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { LanguageSwitcher } from './LanguageSwitcher';

interface HeaderProps {
  onNavigate: (path: string) => void;
  currentPath: string;
}

export function Header({ onNavigate, currentPath }: HeaderProps) {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/', labelKey: 'nav.home', icon: Home },
    { path: '/propiedades', labelKey: 'nav.properties', icon: Building2 },
  ];

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 md:py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => onNavigate('/')}
            className="flex items-center space-x-3 group"
          >
            <div className="bg-white/10 backdrop-blur-sm p-2 rounded-xl group-hover:bg-white/20 transition-all">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div className="text-left hidden sm:block">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">{t('brand.name')}</h1>
              <p className="text-xs md:text-sm text-blue-100 hidden md:block">{t('brand.tagline')}</p>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => onNavigate(item.path)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${
                  currentPath === item.path
                    ? 'bg-white text-blue-600 shadow-md font-semibold'
                    : 'hover:bg-white/10'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{t(item.labelKey)}</span>
              </button>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-2 md:space-x-3">
            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Auth Actions - Desktop */}
            <div className="hidden md:flex items-center space-x-2">
              {user ? (
                <>
                  <button
                    onClick={() => onNavigate('/admin')}
                    className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${
                      currentPath.startsWith('/admin')
                        ? 'bg-white text-blue-600 shadow-md font-semibold'
                        : 'hover:bg-white/10'
                    }`}
                  >
                    <span className="font-medium">{t('nav.dashboard')}</span>
                  </button>
                  <button
                    onClick={signOut}
                    className="flex items-center space-x-2 px-4 py-2.5 rounded-xl hover:bg-red-500/20 transition-all"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">{t('common.logout')}</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onNavigate('/login')}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
                >
                  <LogIn className="h-5 w-5" />
                  <span className="font-medium">{t('common.login')}</span>
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2.5 hover:bg-white/10 rounded-xl transition-all"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-white/20 pt-4 space-y-2 animate-in slide-in-from-top-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  onNavigate(item.path);
                  closeMobileMenu();
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                  currentPath === item.path
                    ? 'bg-white text-blue-600 shadow-md font-semibold'
                    : 'hover:bg-white/10'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{t(item.labelKey)}</span>
              </button>
            ))}
            
            <div className="border-t border-white/20 pt-3 mt-3">
              {user ? (
                <>
                  <button
                    onClick={() => {
                      onNavigate('/admin');
                      closeMobileMenu();
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all"
                  >
                    <Building2 className="h-5 w-5" />
                    <span className="font-medium">{t('nav.dashboard')}</span>
                  </button>
                  <button
                    onClick={() => {
                      signOut();
                      closeMobileMenu();
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-red-500/20 transition-all"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">{t('common.logout')}</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    onNavigate('/login');
                    closeMobileMenu();
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all"
                >
                  <LogIn className="h-5 w-5" />
                  <span className="font-medium">{t('common.login')}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
