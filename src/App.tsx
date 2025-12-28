import { AuthProvider } from './contexts/AuthContext';
import { useRouter, getRouteParams } from './lib/router';
import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Properties } from './pages/Properties';
import { PropertyDetail } from './pages/PropertyDetail';
import { Login } from './pages/Login';
import { Admin } from './pages/Admin';
import { AgentProfile } from './pages/AgentProfile';
import { FloatingWhatsappButton } from './components/FloatingWhatsappButton';
import { DEFAULT_WHATSAPP_MESSAGE } from './lib/whatsapp';

// Reserved routes that should not be treated as agent usernames
const RESERVED_ROUTES = ['/', '/propiedades', '/login', '/admin'];

function AppContent() {
  const { route, navigate } = useRouter();
  const [whatsappMessage, setWhatsappMessage] = useState(DEFAULT_WHATSAPP_MESSAGE);
  const [whatsappNumber, setWhatsappNumber] = useState<string | undefined>(undefined);

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

    if (route === '/login') {
      return <Login onNavigate={navigate} />;
    }

    if (route === '/admin') {
      return <Admin onNavigate={navigate} />;
    }

    // Check for agent profile route (/:username)
    // Only match if it's not a reserved route and starts with /
    const cleanRoute = route.startsWith('/') ? route : `/${route}`;
    if (!RESERVED_ROUTES.includes(cleanRoute) && !cleanRoute.startsWith('/propiedad/')) {
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

  const isLoginPage = route === '/login';

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
      {!isLoginPage && <Header onNavigate={navigate} currentPath={route} />}
      <main className="flex-1">{renderPage()}</main>
      {!isLoginPage && <Footer onNavigate={navigate} />}
      <FloatingWhatsappButton message={whatsappMessage} phone={whatsappNumber} />
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
