import { AuthProvider } from './contexts/AuthContext';
import { useRouter, getRouteParams } from './lib/router';
import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Properties } from './pages/Properties';
import { PropertyDetail } from './pages/PropertyDetail';
import { Login } from './pages/Login';
import { AgentProfile } from './pages/AgentProfile';
import { InvitePage } from './pages/InvitePage';
import { OnboardingPage } from './pages/OnboardingPage';
import { Dashboard } from './pages/Dashboard';
import { FloatingWhatsappButton } from './components/FloatingWhatsappButton';
import { DEFAULT_WHATSAPP_MESSAGE } from './lib/whatsapp';

// Reserved routes that should not be treated as agent usernames
const RESERVED_ROUTES = ['/', '/propiedades', '/login', '/dashboard', '/onboarding'];

function AppContent() {
  const { route, navigate } = useRouter();
  const [whatsappMessage, setWhatsappMessage] = useState(DEFAULT_WHATSAPP_MESSAGE);
  const [whatsappNumber, setWhatsappNumber] = useState<string | undefined>(undefined);

  // Get query params from window.location
  const getQueryParam = (param: string): string | null => {
    const params = new URLSearchParams(window.location.search);
    return params.get(param);
  };

  const renderPage = () => {
    if (route === '/' || route === '') {
      return <Home onNavigate={navigate} onUpdateWhatsappMessage={setWhatsappMessage} />;
    }

    if (route === '/propiedades') {
      return <Properties onNavigate={navigate} onUpdateWhatsappMessage={setWhatsappMessage} />;
    }

    const propertyParams = getRouteParams(route, '/propiedad/:slug');
    if (propertyParams) {
      return (
        <PropertyDetail
          propertySlug={propertyParams.slug}
          onNavigate={navigate}
          onUpdateWhatsappMessage={setWhatsappMessage}
          onUpdateWhatsappNumber={setWhatsappNumber}
        />
      );
    }

    // Invitation route
    const inviteParams = getRouteParams(route, '/invite/:token');
    if (inviteParams) {
      return <InvitePage token={inviteParams.token} onNavigate={navigate} />;
    }

    // Onboarding route
    if (route === '/onboarding') {
      const token = getQueryParam('token');
      if (token) {
        return <OnboardingPage token={token} onNavigate={navigate} />;
      }
      navigate('/');
      return null;
    }

    // Dashboard route
    if (route === '/dashboard') {
      return <Dashboard onNavigate={navigate} />;
    }

    if (route === '/login') {
      return <Login onNavigate={navigate} />;
    }

    // Check for agent profile route (/:username)
    // Only match if it's not a reserved route and starts with /
    const cleanRoute = route.startsWith('/') ? route : `/${route}`;
    const isReserved = RESERVED_ROUTES.includes(cleanRoute) || 
                       cleanRoute.startsWith('/propiedad/') || 
                       cleanRoute.startsWith('/invite/');
    
    if (!isReserved) {
      const username = cleanRoute.slice(1); // Remove leading /
      if (username && !username.includes('/')) {
        return (
          <AgentProfile
            username={username}
            onNavigate={navigate}
            onUpdateWhatsappNumber={setWhatsappNumber}
          />
        );
      }
    }

    return <Home onNavigate={navigate} onUpdateWhatsappMessage={setWhatsappMessage} />;
  };

  const isAuthPage = route === '/login' || route.startsWith('/invite/') || route === '/onboarding';
  const isDashboardPage = route === '/dashboard';
  const hideHeaderFooter = isAuthPage || isDashboardPage;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [route]);

  // Reset WhatsApp to defaults when route changes
  useEffect(() => {
    setWhatsappMessage(DEFAULT_WHATSAPP_MESSAGE);
    setWhatsappNumber(undefined);
  }, [route]);

  return (
    <div className="min-h-screen flex flex-col">
      {!hideHeaderFooter && <Header onNavigate={navigate} currentPath={route} />}
      <main className="flex-1">{renderPage()}</main>
      {!hideHeaderFooter && <Footer onNavigate={navigate} />}
      {!isAuthPage && <FloatingWhatsappButton message={whatsappMessage} phone={whatsappNumber} />}
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
