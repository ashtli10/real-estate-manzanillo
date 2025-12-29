import { ReactNode, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, CreditCard } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';

interface SubscriptionGuardProps {
  userId: string | undefined;
  children: ReactNode;
  onNavigate: (path: string) => void;
  fallback?: ReactNode;
}

/**
 * SubscriptionGuard - Protects routes that require an active subscription
 * 
 * Access is granted if:
 * - User has active subscription
 * - User is in trial period
 * - User has past_due status (grace period)
 * 
 * Access is denied if:
 * - No subscription exists
 * - Subscription is canceled
 * - Trial has expired
 */
export function SubscriptionGuard({
  userId,
  children,
  onNavigate,
  fallback,
}: SubscriptionGuardProps) {
  const {
    subscription,
    loading,
    isPastDue,
    canAccessDashboard,
    createCheckoutSession,
  } = useSubscription(userId);

  // Redirect to login if no user - must be before any conditional returns
  useEffect(() => {
    if (!loading && !userId) {
      onNavigate('/login');
    }
  }, [userId, loading, onNavigate]);

  // Handle checkout redirect
  const handleSubscribe = useCallback(async () => {
    const url = await createCheckoutSession();
    if (url) {
      window.location.href = url;
    }
  }, [createCheckoutSession]);

  // If loading, show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Verificando suscripción...</p>
        </div>
      </div>
    );
  }

  // If no user, show nothing (redirect will happen via useEffect)
  if (!userId) {
    return null;
  }

  // Check access
  const hasAccess = canAccessDashboard();

  // If no access, show subscription required screen
  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-cyan-500 to-blue-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Suscripción Requerida
            </h2>
            <p className="text-gray-600">
              Para acceder al panel de agente necesitas una suscripción activa.
            </p>
          </div>

          {subscription && subscription.status === 'canceled' && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-gray-700 text-sm">
                Tu suscripción fue cancelada. Reactívala para continuar usando la plataforma.
              </p>
            </div>
          )}

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-2">Plan Agente</h3>
            <p className="text-3xl font-bold text-blue-900">
              $199 <span className="text-lg font-normal text-blue-700">MXN/mes</span>
            </p>
            <ul className="mt-3 space-y-2 text-sm text-blue-800">
              <li>✓ Publicaciones ilimitadas</li>
              <li>✓ 50 créditos IA gratis cada mes</li>
              <li>✓ Estadísticas de propiedades</li>
              <li>✓ Perfil público personalizado</li>
              <li>✓ Soporte prioritario</li>
            </ul>
          </div>

          <button
            onClick={handleSubscribe}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white py-3 px-4 rounded-lg font-semibold shadow-lg transition-all"
          >
            Suscribirme ahora
          </button>

          <button
            onClick={() => onNavigate('/')}
            className="w-full mt-3 bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-medium transition-all"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // Show warning banner for past due
  if (isPastDue) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Warning banner */}
        <div className="bg-amber-500 text-white px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">
                Tu pago está pendiente. Actualiza tu método de pago para evitar la suspensión.
              </span>
            </div>
            <button
              onClick={async () => {
                const url = await createCheckoutSession();
                if (url) window.location.href = url;
              }}
              className="bg-white text-amber-600 px-4 py-1.5 rounded-lg font-medium text-sm hover:bg-amber-50 transition-colors"
            >
              Actualizar pago
            </button>
          </div>
        </div>
        {/* Render children with warning context */}
        {children}
      </div>
    );
  }

  // Full access granted
  return <>{children}</>;
}

/**
 * PaywallBanner - A smaller inline component for showing subscription status
 */
export function PaywallBanner({ userId }: { userId: string | undefined }) {
  const { subscription, getStatusMessage } = useSubscription(userId);

  if (!subscription) return null;

  const status = getStatusMessage();

  return (
    <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
      status.color === 'green' ? 'bg-green-100 text-green-700' :
      status.color === 'blue' ? 'bg-blue-100 text-blue-700' :
      status.color === 'yellow' ? 'bg-amber-100 text-amber-700' :
      status.color === 'red' ? 'bg-red-100 text-red-700' :
      'bg-gray-100 text-gray-700'
    }`}>
      {status.color === 'yellow' && <AlertTriangle className="h-4 w-4" />}
      <span className="font-medium text-sm">{status.message}</span>
    </div>
  );
}
