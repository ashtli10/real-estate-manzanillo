/**
 * User Dashboard Page
 * Main hub for authenticated users to manage their account, properties, and credits
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Building2, 
  CreditCard, 
  Coins, 
  User, 
  Settings,
  ChevronRight,
  TrendingUp,
  Eye,
  Plus,
  Sparkles,
  Calendar,
  AlertCircle,
  Crown,
  Loader2,
  ExternalLink,
  CheckCircle,
  XCircle
} from 'lucide-react';
import {
  createSubscriptionCheckout,
  createCreditCheckout,
  openCustomerPortal,
  checkCheckoutSuccess,
  clearCheckoutParams,
  SUBSCRIPTION_PRICE,
  CREDIT_PRICES,
  isStripeTestMode,
} from '../lib/stripeService';
import type { CreditPackageKey } from '../lib/stripe';
import { AIToolsPanel } from '../components/ai/AIToolsPanel';
import { UserPropertyList } from '../components/user/UserPropertyList';
import { UserPropertyForm } from '../components/user/UserPropertyForm';
import { useUserProperties } from '../hooks/useUserProperties';
import type { UserProperty, CreatePropertyInput } from '../types/userProperty';

interface DashboardProps {
  onNavigate: (path: string) => void;
}

type DashboardTab = 'overview' | 'properties' | 'ai-tools' | 'credits' | 'subscription' | 'profile';

export function Dashboard({ onNavigate }: DashboardProps) {
  const { user, profile, subscription, credits, isAdmin, hasActiveSubscription, refreshSubscription, refreshCredits } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Property management state
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<UserProperty | null>(null);
  const [propertyFormLoading, setPropertyFormLoading] = useState(false);
  
  // User properties hook
  const {
    properties: userProperties,
    loading: propertiesLoading,
    error: propertiesError,
    createProperty,
    updateProperty,
    deleteProperty,
    publishProperty,
    pauseProperty,
    archiveProperty,
  } = useUserProperties();

  // Handle checkout success/cancel on page load
  useEffect(() => {
    const result = checkCheckoutSuccess();
    if (result.success) {
      if (result.credits) {
        setSuccessMessage(`¡Listo! Se han agregado ${result.credits} créditos a tu cuenta.`);
        refreshCredits();
        setActiveTab('credits');
      } else {
        setSuccessMessage('¡Tu suscripción ha sido activada exitosamente!');
        refreshSubscription();
        setActiveTab('subscription');
      }
      clearCheckoutParams();
    } else if (result.canceled) {
      setErrorMessage('El proceso de pago fue cancelado.');
      clearCheckoutParams();
    }

    // Check for tab in URL
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['overview', 'properties', 'ai-tools', 'credits', 'subscription', 'profile'].includes(tab)) {
      setActiveTab(tab as DashboardTab);
    }
  }, [refreshSubscription, refreshCredits]);

  // Clear messages after timeout
  useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setErrorMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage]);

  // Handle subscription checkout
  const handleSubscribe = async () => {
    setCheckoutLoading('subscription');
    try {
      await createSubscriptionCheckout();
    } catch (error) {
      console.error('Checkout error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Error al iniciar el pago');
    } finally {
      setCheckoutLoading(null);
    }
  };

  // Handle credit purchase
  const handleBuyCredits = async (packageKey: CreditPackageKey) => {
    setCheckoutLoading(packageKey);
    try {
      await createCreditCheckout(packageKey);
    } catch (error) {
      console.error('Checkout error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Error al iniciar el pago');
    } finally {
      setCheckoutLoading(null);
    }
  };

  // Handle manage subscription
  const handleManageSubscription = async () => {
    setCheckoutLoading('portal');
    try {
      await openCustomerPortal();
    } catch (error) {
      console.error('Portal error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Error al abrir el portal');
    } finally {
      setCheckoutLoading(null);
    }
  };

  // Calculate days remaining in trial/subscription
  const getDaysRemaining = (): number | null => {
    if (!subscription) return null;
    
    const endDate = subscription.status === 'trialing' 
      ? subscription.trialEndsAt 
      : subscription.currentPeriodEnd;
    
    if (!endDate) return null;
    
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = getDaysRemaining();

  // Property form handlers
  const handleAddProperty = () => {
    setEditingProperty(null);
    setShowPropertyForm(true);
  };

  const handleEditProperty = (property: UserProperty) => {
    setEditingProperty(property);
    setShowPropertyForm(true);
  };

  const handleSaveProperty = async (data: CreatePropertyInput): Promise<boolean> => {
    setPropertyFormLoading(true);
    try {
      if (editingProperty) {
        const result = await updateProperty({ id: editingProperty.id, ...data });
        if (result) {
          setSuccessMessage('Propiedad actualizada exitosamente');
          setShowPropertyForm(false);
          return true;
        }
      } else {
        const result = await createProperty(data);
        if (result) {
          setSuccessMessage('Propiedad creada exitosamente');
          setShowPropertyForm(false);
          return true;
        }
      }
      return false;
    } catch {
      setErrorMessage('Error al guardar la propiedad');
      return false;
    } finally {
      setPropertyFormLoading(false);
    }
  };

  const handleDeleteProperty = async (id: string) => {
    const success = await deleteProperty(id);
    if (success) {
      setSuccessMessage('Propiedad eliminada');
    }
  };

  const handlePublishProperty = async (id: string) => {
    const success = await publishProperty(id);
    if (success) {
      setSuccessMessage('Propiedad publicada');
    }
  };

  const handlePauseProperty = async (id: string) => {
    const success = await pauseProperty(id);
    if (success) {
      setSuccessMessage('Propiedad pausada');
    }
  };

  const handleArchiveProperty = async (id: string) => {
    const success = await archiveProperty(id);
    if (success) {
      setSuccessMessage('Propiedad archivada');
    }
  };

  // Subscription status display
  const getSubscriptionStatus = () => {
    if (isAdmin) {
      return { label: 'Administrador', color: 'bg-purple-100 text-purple-800', icon: Crown };
    }
    if (!subscription) {
      return { label: 'Sin suscripción', color: 'bg-gray-100 text-gray-800', icon: AlertCircle };
    }
    
    const statusMap: Record<string, { label: string; color: string }> = {
      trialing: { label: 'Período de prueba', color: 'bg-blue-100 text-blue-800' },
      active: { label: 'Activa', color: 'bg-green-100 text-green-800' },
      past_due: { label: 'Pago pendiente', color: 'bg-amber-100 text-amber-800' },
      canceled: { label: 'Cancelada', color: 'bg-red-100 text-red-800' },
      paused: { label: 'Pausada', color: 'bg-gray-100 text-gray-800' },
    };
    
    return statusMap[subscription.status] || { label: subscription.status, color: 'bg-gray-100 text-gray-800' };
  };

  const subStatus = getSubscriptionStatus();
  const StatusIcon = 'icon' in subStatus ? subStatus.icon : Calendar;

  // Sidebar navigation items
  const navItems = [
    { id: 'overview' as const, label: 'Resumen', icon: LayoutDashboard },
    { id: 'properties' as const, label: 'Mis Propiedades', icon: Building2 },
    { id: 'ai-tools' as const, label: 'Herramientas IA', icon: Sparkles },
    { id: 'credits' as const, label: 'Créditos IA', icon: Coins },
    { id: 'subscription' as const, label: 'Suscripción', icon: CreditCard },
    { id: 'profile' as const, label: 'Mi Perfil', icon: User },
  ];

  // Total credits available
  const totalCredits = (credits?.balance ?? 0) + (credits?.freeCreditsRemaining ?? 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              ¡Hola{profile?.fullName ? `, ${profile.fullName.split(' ')[0]}` : ''}!
            </h1>
            {isStripeTestMode() && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                Modo prueba
              </span>
            )}
          </div>
          <p className="text-gray-600 mt-1">
            Gestiona tus propiedades, créditos y suscripción
          </p>
        </div>

        {/* Success/Error notifications */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-green-800">{successMessage}</p>
            <button 
              onClick={() => setSuccessMessage(null)}
              className="ml-auto text-green-600 hover:text-green-800"
            >
              ×
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800">{errorMessage}</p>
            <button 
              onClick={() => setErrorMessage(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <nav className="bg-white rounded-xl shadow-sm p-2 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === item.id
                      ? 'bg-sky-50 text-sky-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
              
              {/* Admin link */}
              {isAdmin && (
                <button
                  onClick={() => onNavigate('/admin')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-purple-600 hover:bg-purple-50 transition-colors"
                >
                  <Settings className="h-5 w-5" />
                  <span className="font-medium">Panel Admin</span>
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </button>
              )}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Subscription Status */}
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-gray-500">Suscripción</h3>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${subStatus.color}`}>
                        {subStatus.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusIcon className="h-8 w-8 text-sky-600" />
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {hasActiveSubscription || isAdmin ? '✓ Activa' : '✗ Inactiva'}
                        </p>
                        {daysRemaining !== null && daysRemaining > 0 && (
                          <p className="text-sm text-gray-500">
                            {daysRemaining} días restantes
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Credits */}
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-gray-500">Créditos IA</h3>
                      <Sparkles className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="flex items-center gap-3">
                      <Coins className="h-8 w-8 text-amber-500" />
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {totalCredits}
                        </p>
                        <p className="text-sm text-gray-500">
                          {credits?.freeCreditsRemaining ?? 0} gratis + {credits?.balance ?? 0} comprados
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Properties Placeholder */}
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-gray-500">Mis Propiedades</h3>
                      <Eye className="h-5 w-5 text-sky-500" />
                    </div>
                    <div className="flex items-center gap-3">
                      <Building2 className="h-8 w-8 text-sky-600" />
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{userProperties.filter(p => p.status === 'active').length}</p>
                        <p className="text-sm text-gray-500">propiedades activas</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones rápidas</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <button
                      onClick={() => setActiveTab('properties')}
                      className="flex items-center gap-4 p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-sky-300 hover:bg-sky-50 transition-colors group"
                    >
                      <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center group-hover:bg-sky-200 transition-colors">
                        <Plus className="h-6 w-6 text-sky-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">Agregar propiedad</p>
                        <p className="text-sm text-gray-500">Publica una nueva propiedad</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveTab('credits')}
                      className="flex items-center gap-4 p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition-colors group"
                    >
                      <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                        <Coins className="h-6 w-6 text-amber-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">Comprar créditos</p>
                        <p className="text-sm text-gray-500">Para herramientas de IA</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveTab('ai-tools')}
                      className="flex items-center gap-4 p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-sky-300 hover:bg-sky-50 transition-colors group"
                    >
                      <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center group-hover:bg-sky-200 transition-colors">
                        <Sparkles className="h-6 w-6 text-sky-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">Usar IA</p>
                        <p className="text-sm text-gray-500">Genera descripciones y más</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveTab('profile')}
                      className="flex items-center gap-4 p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors group"
                    >
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                        <User className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">Completar perfil</p>
                        <p className="text-sm text-gray-500">Agrega tus datos de contacto</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Activity placeholder */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Actividad reciente</h2>
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Aún no hay actividad</p>
                    <p className="text-sm text-gray-400">Tus acciones recientes aparecerán aquí</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'properties' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Mis Propiedades</h2>
                  <button 
                    onClick={handleAddProperty}
                    className="bg-sky-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-sky-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="h-5 w-5" />
                    Nueva propiedad
                  </button>
                </div>
                <UserPropertyList
                  properties={userProperties}
                  loading={propertiesLoading}
                  error={propertiesError}
                  onAdd={handleAddProperty}
                  onEdit={handleEditProperty}
                  onDelete={handleDeleteProperty}
                  onPublish={handlePublishProperty}
                  onPause={handlePauseProperty}
                  onArchive={handleArchiveProperty}
                  onView={(property) => {
                    if (property.slug) {
                      window.open(`/propiedad/${property.slug}`, '_blank');
                    }
                  }}
                />
              </div>
            )}

            {activeTab === 'ai-tools' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Herramientas de IA</h2>
                      <p className="text-gray-500 text-sm mt-1">
                        Potencia tus propiedades con inteligencia artificial
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('credits')}
                      className="text-sm text-sky-600 hover:text-sky-700 font-medium"
                    >
                      Comprar más créditos →
                    </button>
                  </div>
                  <AIToolsPanel />
                </div>
              </div>
            )}

            {activeTab === 'credits' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Créditos de IA</h2>
                  
                  {/* Balance */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center">
                        <Coins className="h-8 w-8 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm text-amber-700">Balance total</p>
                        <p className="text-4xl font-bold text-gray-900">{totalCredits}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-6 text-sm">
                      <div>
                        <span className="text-gray-500">Gratis restantes:</span>{' '}
                        <span className="font-medium text-gray-900">{credits?.freeCreditsRemaining ?? 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Comprados:</span>{' '}
                        <span className="font-medium text-gray-900">{credits?.balance ?? 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Buy credits - 1 MXN = 1 Credit */}
                  <div className="mb-4">
                    <h3 className="font-medium text-gray-900">Comprar más créditos</h3>
                    <p className="text-sm text-gray-500">1 MXN = 1 crédito</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {(Object.keys(CREDIT_PRICES) as CreditPackageKey[]).map((key) => {
                      const pkg = CREDIT_PRICES[key];
                      const isPopular = 'popular' in pkg && pkg.popular;
                      const isBestValue = 'bestValue' in pkg && pkg.bestValue;
                      return (
                        <button
                          key={key}
                          onClick={() => handleBuyCredits(key)}
                          disabled={!!checkoutLoading}
                          className={`relative p-4 rounded-xl border-2 text-center transition-colors disabled:opacity-50 ${
                            isPopular
                              ? 'border-sky-500 bg-sky-50 hover:bg-sky-100'
                              : isBestValue
                              ? 'border-amber-500 bg-amber-50 hover:bg-amber-100'
                              : 'border-gray-200 hover:border-sky-300 hover:bg-gray-50'
                          }`}
                        >
                          {isPopular && (
                            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-sky-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                              Popular
                            </span>
                          )}
                          {isBestValue && (
                            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                              Mejor valor
                            </span>
                          )}
                          {checkoutLoading === key ? (
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-sky-600" />
                          ) : (
                            <>
                              <p className="text-2xl font-bold text-gray-900">{pkg.credits}</p>
                              <p className="text-xs text-gray-500 mb-2">créditos</p>
                              <p className="text-sm font-medium text-sky-600">${pkg.displayAmount} MXN</p>
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* What are credits for */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-medium text-gray-900 mb-4">¿Para qué sirven los créditos?</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { name: 'Generar descripción', cost: 2, desc: 'IA crea una descripción atractiva' },
                      { name: 'Mejorar fotos', cost: 3, desc: 'Optimiza la iluminación y colores' },
                      { name: 'Sugerencias de precio', cost: 5, desc: 'Análisis de mercado con IA' },
                      { name: 'Tour virtual', cost: 10, desc: 'Genera un recorrido 3D' },
                    ].map((tool) => (
                      <div key={tool.name} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <Sparkles className="h-6 w-6 text-amber-500 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{tool.name}</p>
                          <p className="text-sm text-gray-500">{tool.desc}</p>
                        </div>
                        <span className="text-sm font-medium text-amber-600">{tool.cost} créditos</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'subscription' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Mi Suscripción</h2>
                
                <div className="bg-gradient-to-r from-sky-50 to-blue-50 rounded-xl p-6 mb-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${subStatus.color} mb-3`}>
                        {subStatus.label}
                      </span>
                      <h3 className="text-2xl font-bold text-gray-900">Plan Estándar</h3>
                      <p className="text-gray-600 mt-1">${SUBSCRIPTION_PRICE.displayAmount} {SUBSCRIPTION_PRICE.displayCurrency} / mes</p>
                    </div>
                    <CreditCard className="h-10 w-10 text-sky-600" />
                  </div>
                  
                  {daysRemaining !== null && (
                    <div className="mt-4 pt-4 border-t border-sky-200">
                      <p className="text-sky-700">
                        {subscription?.status === 'trialing' 
                          ? `Tu período de prueba termina en ${daysRemaining} días`
                          : `Próxima renovación en ${daysRemaining} días`
                        }
                      </p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="mt-4 pt-4 border-t border-sky-200 flex gap-4">
                    {!hasActiveSubscription && !isAdmin ? (
                      <button
                        onClick={handleSubscribe}
                        disabled={!!checkoutLoading}
                        className="flex-1 bg-sky-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-sky-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                      >
                        {checkoutLoading === 'subscription' ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-5 w-5" />
                            Suscribirse ahora
                          </>
                        )}
                      </button>
                    ) : subscription?.stripeSubscriptionId && (
                      <button
                        onClick={handleManageSubscription}
                        disabled={!!checkoutLoading}
                        className="flex-1 border-2 border-sky-600 text-sky-600 py-3 px-6 rounded-lg font-medium hover:bg-sky-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                      >
                        {checkoutLoading === 'portal' ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Abriendo...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="h-5 w-5" />
                            Administrar suscripción
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Benefits */}
                <h3 className="font-medium text-gray-900 mb-4">Incluye:</h3>
                <ul className="space-y-3">
                  {[
                    'Publicaciones ilimitadas de propiedades',
                    '50 créditos de IA gratis cada mes',
                    'Estadísticas de visualizaciones',
                    'Contacto directo por WhatsApp',
                    'Soporte prioritario',
                  ].map((benefit) => (
                    <li key={benefit} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-gray-700">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Mi Perfil</h2>
                
                <div className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 bg-sky-100 rounded-full flex items-center justify-center">
                      {profile?.avatarUrl ? (
                        <img 
                          src={profile.avatarUrl} 
                          alt={profile.fullName || 'Avatar'}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-12 w-12 text-sky-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {profile?.fullName || 'Sin nombre'}
                      </h3>
                      <p className="text-gray-500">{user?.email}</p>
                    </div>
                  </div>

                  {/* Profile fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Nombre completo
                      </label>
                      <p className="text-gray-900">{profile?.fullName || '—'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Teléfono / WhatsApp
                      </label>
                      <p className="text-gray-900">{profile?.phone || '—'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Empresa / Inmobiliaria
                      </label>
                      <p className="text-gray-900">{profile?.companyName || '—'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Idioma preferido
                      </label>
                      <p className="text-gray-900">
                        {profile?.languagePreference === 'en' ? 'English' : 'Español'}
                      </p>
                    </div>
                  </div>

                  <button className="bg-sky-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-sky-700 transition-colors">
                    Editar perfil
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Property Form Modal */}
      {showPropertyForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl">
            <UserPropertyForm
              property={editingProperty || undefined}
              onSave={handleSaveProperty}
              onCancel={() => {
                setShowPropertyForm(false);
                setEditingProperty(null);
              }}
              onUseAI={() => {
                setShowPropertyForm(false);
                setActiveTab('ai-tools');
              }}
              loading={propertyFormLoading}
            />
          </div>
        </div>
      )}
    </div>
  );
}
