/**
 * Protected Route Component
 * Handles route protection based on auth state, subscription, and roles
 */

import { ReactNode } from 'react';
import { useAuthState } from '../contexts/AuthContext';
import type { RouteProtection } from '../types/auth';
import { Loader2, Lock, CreditCard, AlertTriangle } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  protection: RouteProtection;
  onNavigate: (path: string) => void;
}

/**
 * Loading component while checking auth state
 */
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-sky-600 mx-auto mb-4" />
        <p className="text-gray-600">Cargando...</p>
      </div>
    </div>
  );
}

/**
 * Access denied component for unauthorized users
 */
function AccessDenied({ 
  type, 
  onNavigate 
}: { 
  type: 'auth' | 'subscription' | 'admin';
  onNavigate: (path: string) => void;
}) {
  const configs = {
    auth: {
      icon: Lock,
      title: 'Inicia sesión para continuar',
      description: 'Necesitas una cuenta para acceder a esta página.',
      buttonText: 'Iniciar Sesión',
      buttonPath: '/login',
    },
    subscription: {
      icon: CreditCard,
      title: 'Suscripción requerida',
      description: 'Necesitas una suscripción activa para acceder a esta función.',
      buttonText: 'Ver Planes',
      buttonPath: '/planes',
    },
    admin: {
      icon: AlertTriangle,
      title: 'Acceso restringido',
      description: 'No tienes permisos para acceder a esta página.',
      buttonText: 'Volver al Inicio',
      buttonPath: '/',
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Icon className="h-8 w-8 text-sky-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {config.title}
        </h1>
        <p className="text-gray-600 mb-8">
          {config.description}
        </p>
        <button
          onClick={() => onNavigate(config.buttonPath)}
          className="w-full bg-sky-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-sky-700 transition-colors"
        >
          {config.buttonText}
        </button>
      </div>
    </div>
  );
}

/**
 * Protected Route wrapper component
 * 
 * @param protection - Level of protection required
 *   - 'public': No protection, anyone can access
 *   - 'auth': Must be logged in
 *   - 'subscribed': Must have active subscription
 *   - 'admin': Must be an admin user
 */
export function ProtectedRoute({ 
  children, 
  protection, 
  onNavigate,
}: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, hasActiveSubscription, isLoading } = useAuthState();

  // Show loading while checking auth state
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Public routes don't need protection
  if (protection === 'public') {
    return <>{children}</>;
  }

  // Check authentication for all protected routes
  if (!isAuthenticated) {
    return <AccessDenied type="auth" onNavigate={onNavigate} />;
  }

  // Admin routes require admin role
  if (protection === 'admin') {
    if (!isAdmin) {
      return <AccessDenied type="admin" onNavigate={onNavigate} />;
    }
    return <>{children}</>;
  }

  // Subscribed routes require active subscription (admins bypass this)
  if (protection === 'subscribed') {
    if (!hasActiveSubscription && !isAdmin) {
      return <AccessDenied type="subscription" onNavigate={onNavigate} />;
    }
    return <>{children}</>;
  }

  // 'auth' protection - just needs to be logged in (already checked above)
  return <>{children}</>;
}
