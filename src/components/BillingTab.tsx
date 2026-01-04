import { useEffect, useState } from 'react';
import {
  CreditCard,
  Sparkles,
  Check,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { useCredits, CREDIT_PACKS } from '../hooks/useCredits';
import { supabase } from '../integrations/supabase/client';

interface BillingTabProps {
  userId: string;
}

export function BillingTab({ userId }: BillingTabProps) {
  const {
    subscription,
    loading: subLoading,
    isActive,
    isTrialing,
    trialDaysRemaining,
    createCheckoutSession,
    createPortalSession,
    getStatusMessage,
  } = useSubscription(userId);

  const {
    loading: creditsLoading,
    totalCredits,
    freeCredits,
    paidCredits,
    purchaseCredits,
  } = useCredits(userId);

  const [purchasingCredits, setPurchasingCredits] = useState<number | null>(null);
  const [managingSubscription, setManagingSubscription] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [creditTransactions, setCreditTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const url = await createCheckoutSession();
      if (url) {
        window.location.href = url;
      }
    } finally {
      setSubscribing(false);
    }
  };

  const handleManageSubscription = async () => {
    setManagingSubscription(true);
    try {
      const url = await createPortalSession();
      if (url) {
        window.location.href = url;
      }
    } finally {
      setManagingSubscription(false);
    }
  };

  const handlePurchaseCredits = async (amount: number) => {
    setPurchasingCredits(amount);
    try {
      const url = await purchaseCredits(amount);
      if (url) {
        window.location.href = url;
      }
    } finally {
      setPurchasingCredits(null);
    }
  };

  const status = getStatusMessage();

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoadingTransactions(true);
      try {
        const { data, error } = await supabase
          .from('credit_transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setCreditTransactions(data);
      } catch (err) {
        console.error('Error fetching credit transactions:', err);
      } finally {
        setLoadingTransactions(false);
      }
    };

    fetchTransactions();
  }, [userId]);

  if (subLoading || creditsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Subscription Section */}
      <div className="bg-card rounded-xl shadow-soft p-6">
        <h3 className="font-semibold text-foreground text-lg mb-4">Tu Suscripción</h3>
        
        <div className="flex items-start justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="font-bold text-xl">Plan Agente</p>
            <p className="text-muted-foreground">$199 MXN/mes</p>
            
            {isTrialing && trialDaysRemaining !== null && (
              <div className="flex items-center gap-2 mt-2 text-blue-600">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {trialDaysRemaining} días de prueba restantes
                </span>
              </div>
            )}
            
            {isActive && subscription?.current_period_end && !isTrialing && (
              <p className="text-sm text-muted-foreground mt-2">
                Próxima facturación: {new Date(subscription.current_period_end).toLocaleDateString('es-MX')}
              </p>
            )}

            {subscription?.cancel_at_period_end && (
              <div className="flex items-center gap-2 mt-2 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Se cancelará al final del período
                </span>
              </div>
            )}
          </div>
          
          <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            status.color === 'green' ? 'bg-green-100 text-green-700' :
            status.color === 'blue' ? 'bg-blue-100 text-blue-700' :
            status.color === 'yellow' ? 'bg-amber-100 text-amber-700' :
            status.color === 'red' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {status.message}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-3">
          {!subscription || subscription.status === 'canceled' ? (
            <button
              onClick={handleSubscribe}
              disabled={subscribing}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-colors disabled:opacity-50"
            >
              {subscribing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              {subscribing ? 'Procesando...' : 'Suscribirme'}
            </button>
          ) : (
            <button
              onClick={handleManageSubscription}
              disabled={managingSubscription}
              className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors disabled:opacity-50"
            >
              {managingSubscription ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              {managingSubscription ? 'Cargando...' : 'Administrar suscripción'}
            </button>
          )}
        </div>

        {/* Features */}
        <div className="mt-6 border-t border-border pt-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Incluido en tu plan:</h4>
          <ul className="grid grid-cols-2 gap-2">
            {[
              'Publicaciones ilimitadas',
              '50 créditos IA/mes',
              'Estadísticas detalladas',
              'Perfil público',
              'Soporte prioritario',
              'Generador de videos (pronto)',
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
                <Check className="h-4 w-4 text-green-500" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Credits Section */}
      <div className="bg-card rounded-xl shadow-soft p-6">
        <h3 className="font-semibold text-foreground text-lg mb-4">Créditos de IA</h3>
        
        <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total disponible</p>
                <p className="text-3xl font-bold text-foreground">{totalCredits}</p>
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="text-muted-foreground">Gratis: <span className="font-medium text-foreground">{freeCredits}</span></p>
              <p className="text-muted-foreground">Comprados: <span className="font-medium text-foreground">{paidCredits}</span></p>
            </div>
          </div>
        </div>

        {/* Credit Packs */}
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Comprar créditos:</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {CREDIT_PACKS.map((pack) => (
            <button
              key={pack.amount}
              onClick={() => handlePurchaseCredits(pack.amount)}
              disabled={purchasingCredits !== null}
              className={`p-4 border-2 rounded-lg text-center hover:border-primary transition-colors disabled:opacity-50 ${
                purchasingCredits === pack.amount ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              {purchasingCredits === pack.amount ? (
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              ) : (
                <>
                  <p className="text-2xl font-bold text-foreground">{pack.amount}</p>
                  <p className="text-xs text-muted-foreground">créditos</p>
                  <p className="text-sm font-medium text-primary mt-1">{pack.priceFormatted}</p>
                </>
              )}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          Los créditos se usan para herramientas de IA como el generador de videos. 
          Los créditos gratis se renuevan mensualmente con tu suscripción.
        </p>
      </div>

      {/* Invoices placeholder */}
      <div className="bg-card rounded-xl shadow-soft p-6">
        <h3 className="font-semibold text-foreground text-lg mb-4">Historial de facturación</h3>
        <p className="text-muted-foreground text-sm">
          Accede a tus facturas e historial de pagos desde el{' '}
          <button
            onClick={handleManageSubscription}
            className="text-primary hover:underline"
          >
            portal de facturación
          </button>
          .
        </p>
      </div>

      {/* Credit Transactions Section */}
      <div className="bg-card rounded-xl shadow-soft p-6">
        <h3 className="font-semibold text-foreground text-lg mb-4">Historial de Créditos</h3>
        {loadingTransactions ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : creditTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-2">
                    Fecha
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-2">
                    Concepto
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-2">
                    Créditos
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {creditTransactions.map((transaction) => {
                  const concept = getTransactionConcept(transaction.transaction_type);
                  return (
                    <tr key={transaction.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-2 text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(transaction.created_at).toLocaleDateString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            transaction.amount > 0 ? 'bg-green-500' : 'bg-red-400'
                          }`} />
                          <span className="text-sm font-medium text-foreground">
                            {concept}
                          </span>
                        </div>
                      </td>
                      <td className={`py-3 px-2 text-sm font-semibold text-right whitespace-nowrap ${
                        transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No hay transacciones de créditos registradas.</p>
        )}
      </div>
    </div>
  );
}

// Helper function to get Spanish concept based on transaction type
function getTransactionConcept(transactionType: string): string {
  // Map new enum values to Spanish labels
  const concepts: Record<string, string> = {
    // Purchases
    'purchase': 'Compra de créditos',
    
    // Subscription
    'subscription_grant': 'Créditos mensuales (suscripción)',
    
    // AI Video Generator
    'ai_video_images': 'Video IA - Generación de imágenes',
    'ai_video_script': 'Video IA - Generación de guión',
    'ai_video_render': 'Video IA - Renderizado de video',
    
    // Video Tour
    'video_tour': 'Video Tour - Generación',
    
    // AI Prefill
    'ai_prefill': 'IA - Autocompletado de propiedad',
    
    // Refunds
    'refund': 'Reembolso de créditos',
    
    // Bonus
    'bonus': 'Bonificación',
    
    // Adjustments
    'adjustment': 'Ajuste de créditos',
  };

  return concepts[transactionType] || 'Transacción de créditos';
}
