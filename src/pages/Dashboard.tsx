/**
 * User Dashboard Page
 * Main hub for authenticated users to manage their account, properties, and credits
 * Admin users see additional tabs for invitations and all properties management
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
  Building2, 
  CreditCard, 
  Coins, 
  User, 
  Settings,
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
  XCircle,
  Users,
  RefreshCw,
  Save
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
// Admin components
import { PropertyTable } from '../components/admin/PropertyTable';
import { PropertyForm } from '../components/admin/PropertyForm';
import { DeleteConfirmModal } from '../components/admin/DeleteConfirmModal';
import { InvitationManagement } from '../components/admin/InvitationManagement';
import { transformProperty } from '../lib/propertyTransform';
import { supabase } from '../integrations/supabase/client';
import type { Property, PropertyInsert } from '../types/property';

interface DashboardProps {
  onNavigate: (path: string) => void;
}

// Tab types - includes admin-only tabs
type DashboardTab = 'overview' | 'properties' | 'ai-tools' | 'credits' | 'subscription' | 'profile' | 'admin-properties' | 'invitations';

export function Dashboard({ onNavigate: _onNavigate }: DashboardProps) {
  void _onNavigate; // Available for future navigation features
  const { t } = useTranslation();
  const { user, profile, subscription, credits, isAdmin, hasActiveSubscription, refreshSubscription, refreshCredits, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Property management state (for regular users)
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<UserProperty | null>(null);
  const [propertyFormLoading, setPropertyFormLoading] = useState(false);
  
  // Admin property management state
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [adminPropertiesLoading, setAdminPropertiesLoading] = useState(false);
  const [showAdminPropertyForm, setShowAdminPropertyForm] = useState(false);
  const [editingAdminProperty, setEditingAdminProperty] = useState<Property | null>(null);
  const [deletingProperty, setDeletingProperty] = useState<Property | null>(null);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminDeleting, setAdminDeleting] = useState(false);
  
  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phone: '',
    companyName: '',
    languagePreference: 'es',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  
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
    if (tab && ['overview', 'properties', 'ai-tools', 'credits', 'subscription', 'profile', 'admin-properties', 'invitations'].includes(tab)) {
      setActiveTab(tab as DashboardTab);
    }
  }, [refreshSubscription, refreshCredits]);

  // Initialize profile form when profile loads
  useEffect(() => {
    if (profile) {
      setProfileForm({
        fullName: profile.fullName || '',
        phone: profile.phone || '',
        companyName: profile.companyName || '',
        languagePreference: profile.languagePreference || 'es',
      });
    }
  }, [profile]);

  // Load all properties for admin
  const loadAllProperties = useCallback(async () => {
    if (!isAdmin) return;
    setAdminPropertiesLoading(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setAllProperties((data || []).map(transformProperty));
    } catch (error) {
      console.error('Error loading all properties:', error);
      setErrorMessage(t('errors.generic'));
    } finally {
      setAdminPropertiesLoading(false);
    }
  }, [isAdmin, t]);

  // Load admin properties when switching to admin tab
  useEffect(() => {
    if (isAdmin && activeTab === 'admin-properties') {
      loadAllProperties();
    }
  }, [isAdmin, activeTab, loadAllProperties]);

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

  // === ADMIN PROPERTY HANDLERS ===
  const handleAdminSaveProperty = async (data: PropertyInsert) => {
    setAdminSaving(true);
    try {
      const maxOrder = allProperties.reduce((max, property) => Math.max(max, property.display_order || 0), 0);
      const display_order = editingAdminProperty ? data.display_order : maxOrder + 1;

      const dbData = {
        ...data,
        display_order,
        characteristics: JSON.stringify(data.characteristics),
      };

      if (editingAdminProperty) {
        const { error } = await supabase
          .from('properties')
          .update({
            ...dbData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingAdminProperty.id);

        if (error) throw error;
        setSuccessMessage(t('common.success') + ' - Propiedad actualizada');
      } else {
        const { error } = await supabase
          .from('properties')
          .insert([dbData]);

        if (error) throw error;
        setSuccessMessage(t('common.success') + ' - Propiedad creada');
      }

      await loadAllProperties();
      setShowAdminPropertyForm(false);
      setEditingAdminProperty(null);
    } catch (error) {
      console.error('Error saving property:', error);
      setErrorMessage(t('errors.generic'));
    } finally {
      setAdminSaving(false);
    }
  };

  const handleAdminDeleteProperty = async () => {
    if (!deletingProperty) return;
    setAdminDeleting(true);
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', deletingProperty.id);

      if (error) throw error;
      setSuccessMessage('Propiedad eliminada');
      await loadAllProperties();
      setDeletingProperty(null);
    } catch (error) {
      console.error('Error deleting property:', error);
      setErrorMessage(t('errors.generic'));
    } finally {
      setAdminDeleting(false);
    }
  };

  const handleTogglePublish = async (property: Property) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ is_published: !property.is_published })
        .eq('id', property.id);

      if (error) throw error;
      await loadAllProperties();
    } catch (error) {
      console.error('Error toggling publish:', error);
    }
  };

  const handleToggleFeatured = async (property: Property) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ is_featured: !property.is_featured })
        .eq('id', property.id);

      if (error) throw error;
      await loadAllProperties();
    } catch (error) {
      console.error('Error toggling featured:', error);
    }
  };

  const swapOrder = async (property: Property, direction: 'up' | 'down') => {
    const currentIndex = allProperties.findIndex((p) => p.id === property.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= allProperties.length) return;

    const targetProperty = allProperties[targetIndex];
    try {
      await Promise.all([
        supabase.from('properties').update({ display_order: targetProperty.display_order }).eq('id', property.id),
        supabase.from('properties').update({ display_order: property.display_order }).eq('id', targetProperty.id),
      ]);
      await loadAllProperties();
    } catch (error) {
      console.error('Error reordering:', error);
    }
  };

  // === PROFILE HANDLERS ===
  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      const success = await updateProfile({
        fullName: profileForm.fullName,
        phone: profileForm.phone,
        companyName: profileForm.companyName,
        languagePreference: profileForm.languagePreference as 'es' | 'en',
      });
      if (success) {
        setSuccessMessage(t('common.success') + ' - Perfil actualizado');
        setIsEditingProfile(false);
      } else {
        setErrorMessage(t('errors.generic'));
      }
    } catch {
      setErrorMessage(t('errors.generic'));
    } finally {
      setProfileSaving(false);
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

  // Sidebar navigation items - base items for all users
  const navItems: Array<{ id: DashboardTab; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean }> = [
    { id: 'overview', label: t('dashboard.overview'), icon: LayoutDashboard },
    { id: 'properties', label: t('dashboard.myProperties'), icon: Building2 },
    { id: 'ai-tools', label: t('credits.title'), icon: Sparkles },
    { id: 'credits', label: t('dashboard.credits'), icon: Coins },
    { id: 'subscription', label: t('dashboard.subscription'), icon: CreditCard },
    { id: 'profile', label: t('dashboard.profile'), icon: User },
    // Admin-only tabs
    { id: 'admin-properties', label: t('admin.properties'), icon: Settings, adminOnly: true },
    { id: 'invitations', label: t('admin.invitations'), icon: Users, adminOnly: true },
  ];

  // Filter nav items based on admin status
  const visibleNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

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
              {visibleNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === item.id
                      ? item.adminOnly ? 'bg-purple-50 text-purple-700' : 'bg-sky-50 text-sky-700'
                      : item.adminOnly ? 'text-purple-600 hover:bg-purple-50' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                  {item.adminOnly && <Crown className="h-4 w-4 ml-auto" />}
                </button>
              ))}
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
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">{t('profile.title')}</h2>
                  {!isEditingProfile && (
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="text-sky-600 hover:text-sky-700 font-medium"
                    >
                      {t('profile.editProfile')}
                    </button>
                  )}
                </div>
                
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
                        {profile?.fullName || t('profile.fullName')}
                      </h3>
                      <p className="text-gray-500">{user?.email}</p>
                    </div>
                  </div>

                  {/* Profile fields - editable or read-only */}
                  {isEditingProfile ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('profile.fullName')}
                        </label>
                        <input
                          type="text"
                          value={profileForm.fullName}
                          onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('profile.phone')}
                        </label>
                        <input
                          type="tel"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                          placeholder="+52 314 123 4567"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('profile.company')}
                        </label>
                        <input
                          type="text"
                          value={profileForm.companyName}
                          onChange={(e) => setProfileForm({ ...profileForm, companyName: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('profile.language')}
                        </label>
                        <select
                          value={profileForm.languagePreference}
                          onChange={(e) => setProfileForm({ ...profileForm, languagePreference: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                        >
                          <option value="es">Español</option>
                          <option value="en">English</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          {t('profile.fullName')}
                        </label>
                        <p className="text-gray-900">{profile?.fullName || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          {t('profile.phone')}
                        </label>
                        <p className="text-gray-900">{profile?.phone || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          {t('profile.company')}
                        </label>
                        <p className="text-gray-900">{profile?.companyName || '—'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          {t('profile.language')}
                        </label>
                        <p className="text-gray-900">
                          {profile?.languagePreference === 'en' ? 'English' : 'Español'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  {isEditingProfile ? (
                    <div className="flex gap-3">
                      <button
                        onClick={handleSaveProfile}
                        disabled={profileSaving}
                        className="bg-sky-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-sky-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        {profileSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                        {t('profile.saveChanges')}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingProfile(false);
                          // Reset form to current profile values
                          if (profile) {
                            setProfileForm({
                              fullName: profile.fullName || '',
                              phone: profile.phone || '',
                              companyName: profile.companyName || '',
                              languagePreference: profile.languagePreference || 'es',
                            });
                          }
                        }}
                        className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="bg-sky-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-sky-700 transition-colors"
                    >
                      {t('profile.editProfile')}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Admin: All Properties Management */}
            {activeTab === 'admin-properties' && isAdmin && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {t('admin.properties')} ({allProperties.length})
                    </h2>
                    <button
                      onClick={loadAllProperties}
                      disabled={adminPropertiesLoading}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Refrescar"
                    >
                      <RefreshCw className={`h-5 w-5 ${adminPropertiesLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setEditingAdminProperty(null);
                      setShowAdminPropertyForm(true);
                    }}
                    className="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="h-5 w-5" />
                    Nueva propiedad
                  </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {adminPropertiesLoading ? (
                    <div className="text-center py-12">
                      <Loader2 className="h-10 w-10 animate-spin text-sky-600 mx-auto" />
                      <p className="mt-4 text-gray-500">{t('common.loading')}</p>
                    </div>
                  ) : (
                    <PropertyTable
                      properties={allProperties}
                      onEdit={(property) => {
                        setEditingAdminProperty(property);
                        setShowAdminPropertyForm(true);
                      }}
                      onDelete={setDeletingProperty}
                      onTogglePublish={handleTogglePublish}
                      onToggleFeatured={handleToggleFeatured}
                      onMoveUp={(property) => swapOrder(property, 'up')}
                      onMoveDown={(property) => swapOrder(property, 'down')}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Admin: Invitations */}
            {activeTab === 'invitations' && isAdmin && (
              <InvitationManagement />
            )}
          </main>
        </div>
      </div>

      {/* Property Form Modal (User) */}
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

      {/* Admin Property Form Modal */}
      {showAdminPropertyForm && isAdmin && (
        <PropertyForm
          property={editingAdminProperty}
          onSave={handleAdminSaveProperty}
          onCancel={() => {
            setShowAdminPropertyForm(false);
            setEditingAdminProperty(null);
          }}
          loading={adminSaving}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingProperty && (
        <DeleteConfirmModal
          title={t('property.deleteProperty')}
          message={`¿Estás seguro de que deseas eliminar "${deletingProperty.title}"? Esta acción no se puede deshacer.`}
          onConfirm={handleAdminDeleteProperty}
          onCancel={() => setDeletingProperty(null)}
          loading={adminDeleting}
        />
      )}
    </div>
  );
}
