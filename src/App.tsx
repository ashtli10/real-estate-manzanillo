import { AuthProvider } from './contexts/AuthContext';
import { useRouter, getRouteParams } from './lib/router';
import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './pages/Home';
import { Properties } from './pages/Properties';
import { PropertyDetail } from './pages/PropertyDetail';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { FloatingWhatsappButton } from './components/FloatingWhatsappButton';
import { DEFAULT_WHATSAPP_MESSAGE } from './lib/whatsapp';
import type { RouteProtection } from './types/auth';

/**
 * Route configuration with protection levels
 */
interface RouteMatch {
  component: React.ReactNode;
  protection: RouteProtection;
  hideHeader?: boolean;
  hideFooter?: boolean;
}

function AppContent() {
  const { route, navigate } = useRouter();
  const [whatsappMessage, setWhatsappMessage] = useState(DEFAULT_WHATSAPP_MESSAGE);

  /**
   * Route matching and rendering
   * Returns the component and its protection level
   */
  const getRoute = (): RouteMatch => {
    // Public routes
    if (route === '/' || route === '') {
      return {
        component: <Home onNavigate={navigate} onUpdateWhatsappMessage={setWhatsappMessage} />,
        protection: 'public',
      };
    }

    if (route === '/propiedades') {
      return {
        component: <Properties onNavigate={navigate} onUpdateWhatsappMessage={setWhatsappMessage} />,
        protection: 'public',
      };
    }

    // Property detail - public
    const propertyParams = getRouteParams(route, '/propiedad/:slug');
    if (propertyParams) {
      return {
        component: (
          <PropertyDetail
            propertySlug={propertyParams.slug}
            onNavigate={navigate}
            onUpdateWhatsappMessage={setWhatsappMessage}
          />
        ),
        protection: 'public',
      };
    }

    // Auth routes - public (but redirect if logged in handled in component)
    if (route === '/login') {
      return {
        component: <Login onNavigate={navigate} />,
        protection: 'public',
        hideHeader: true,
        hideFooter: true,
      };
    }

    // Signup with invitation token
    if (route.startsWith('/signup')) {
      // Extract token from query string if present
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token') || '';
      return {
        component: <Signup onNavigate={navigate} invitationToken={token} />,
        protection: 'public',
        hideHeader: true,
        hideFooter: true,
      };
    }

    // User dashboard - requires auth
    if (route === '/dashboard') {
      return {
        component: <Dashboard onNavigate={navigate} />,
        protection: 'auth',
      };
    }

    // 404 - fallback to home
    return {
      component: <Home onNavigate={navigate} onUpdateWhatsappMessage={setWhatsappMessage} />,
      protection: 'public',
    };
  };

  const currentRoute = getRoute();
  const showHeader = !currentRoute.hideHeader;
  const showFooter = !currentRoute.hideFooter;

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [route]);

  // Reset WhatsApp message on route change
  useEffect(() => {
    setWhatsappMessage(DEFAULT_WHATSAPP_MESSAGE);
  }, [route]);

  return (
    <div className="min-h-screen flex flex-col">
      {showHeader && <Header onNavigate={navigate} currentPath={route} />}
      <main className="flex-1">
        <ProtectedRoute protection={currentRoute.protection} onNavigate={navigate}>
          {currentRoute.component}
        </ProtectedRoute>
      </main>
      {showFooter && <Footer />}
      <FloatingWhatsappButton message={whatsappMessage} />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
