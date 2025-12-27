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
import { FloatingWhatsappButton } from './components/FloatingWhatsappButton';
import { DEFAULT_WHATSAPP_MESSAGE } from './lib/whatsapp';

function AppContent() {
  const { route, navigate } = useRouter();
  const [whatsappMessage, setWhatsappMessage] = useState(DEFAULT_WHATSAPP_MESSAGE);

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
        />
      );
    }

    if (route === '/login') {
      return <Login onNavigate={navigate} />;
    }

    if (route === '/admin') {
      return <Admin onNavigate={navigate} />;
    }

    return <Home onNavigate={navigate} onUpdateWhatsappMessage={setWhatsappMessage} />;
  };

  const isLoginPage = route === '/login';

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [route]);

  useEffect(() => {
    setWhatsappMessage(DEFAULT_WHATSAPP_MESSAGE);
  }, [route]);

  return (
    <div className="min-h-screen flex flex-col">
      {!isLoginPage && <Header onNavigate={navigate} currentPath={route} />}
      <main className="flex-1">{renderPage()}</main>
      {!isLoginPage && <Footer />}
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
