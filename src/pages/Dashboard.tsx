import { useEffect, useState, useCallback } from 'react';
import {
  Home,
  Building2,
  User,
  CreditCard,
  Sparkles,
  LogOut,
  Plus,
  TrendingUp,
  RefreshCw,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Clock,
  Mail,
  Shield,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { useCredits } from '../hooks/useCredits';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { supabase } from '../integrations/supabase/client';
import type { Property, PropertyInsert } from '../types/property';
import type { Profile, InvitationToken } from '../types/user';
import { PropertyTable } from '../components/admin/PropertyTable';
import { PropertyForm } from '../components/admin/PropertyForm';
import { DeleteConfirmModal } from '../components/admin/DeleteConfirmModal';
import { SuccessModal } from '../components/admin/SuccessModal';
import { CreateInvitationModal } from '../components/admin/CreateInvitationModal';
import { InvitationTable } from '../components/admin/InvitationTable';
import { BillingTab } from '../components/BillingTab';
import { ProfileSettings } from '../components/ProfileSettings';
import { SubscriptionGuard } from '../components/SubscriptionGuard';
import { AIToolsContainer } from '../components/AIToolsContainer';
import { transformProperty } from '../lib/propertyTransform';

type DashboardTab = 'overview' | 'properties' | 'profile' | 'billing' | 'ai-tools' | 'settings' | 'invitations';

interface DashboardProps {
  onNavigate: (path: string) => void;
}

const VALID_TABS: DashboardTab[] = ['overview', 'properties', 'profile', 'billing', 'ai-tools', 'settings', 'invitations'];

function getInitialTab(): DashboardTab {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  if (tab && VALID_TABS.includes(tab as DashboardTab)) {
    return tab as DashboardTab;
  }
  return 'overview';
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>(getInitialTab);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Use subscription and credits hooks
  const { 
    isTrialing,
    isPastDue,
    getStatusMessage,
    canAccessDashboard,
  } = useSubscription(user?.id);
  
  const {
    totalCredits,
    freeCredits,
    paidCredits,
  } = useCredits(user?.id);

  // Use dashboard stats hook
  const {
    stats: dashboardStats,
    loading: loadingStats,
  } = useDashboardStats(user?.id);
  
  // Data state
  const [profile, setProfile] = useState<Profile | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  
  // Loading states
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingProperties, setLoadingProperties] = useState(true);
  
  // Property management
  const [showForm, setShowForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [deletingProperty, setDeletingProperty] = useState<Property | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Invitations state (admin only)
  const [invitations, setInvitations] = useState<InvitationToken[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [showCreateInvitation, setShowCreateInvitation] = useState(false);
  const [creatingInvitation, setCreatingInvitation] = useState(false);

  // Success modal state
  const [showCreditsSuccess, setShowCreditsSuccess] = useState(false);

  // Check for checkout success on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get('checkout');
    
    if (checkoutStatus === 'credits-success') {
      setShowCreditsSuccess(true);
      // Clear the param from URL
      params.delete('checkout');
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  // Sync URL query params with active tab
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const currentTab = params.get('tab');
    const hasCheckout = params.has('checkout');
    
    // Clear checkout param after first load/tab change
    if (hasCheckout) {
      params.delete('checkout');
    }
    
    // Update tab param
    if (currentTab !== activeTab) {
      params.set('tab', activeTab);
    }
    
    // Update URL without reload
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [activeTab]);

  useEffect(() => {
    if (!authLoading && !user) {
      onNavigate('/login');
    }
  }, [user, authLoading, onNavigate]);

  useEffect(() => {
    if (user) {
      loadUserData();
      loadProperties();
      // Load invitations only for admins
      if (isAdmin) {
        loadInvitations();
      }
    }
  }, [user, isAdmin]);

  const loadUserData = async () => {
    if (!user) return;
    
    setLoadingProfile(true);
    try {
      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileData) setProfile(profileData as Profile);
      // Subscription and credits are now handled by hooks
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadProperties = async () => {
    if (!user) return;
    
    setLoadingProperties(true);
    try {
      let query = supabase
        .from('properties')
        .select('*');
      
      // Admins see all properties, regular users see only their own
      if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }
      
      const { data, error } = await query.order('display_order', { ascending: true });

      if (error) throw error;
      setProperties((data || []).map(transformProperty));
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoadingProperties(false);
    }
  };

  const loadInvitations = async () => {
    setLoadingInvitations(true);
    try {
      const { data, error } = await supabase
        .from('invitation_tokens')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoadingInvitations(false);
    }
  };

  const handleSave = async (data: PropertyInsert) => {
    if (!user) return;
    
    setSaving(true);
    try {
      const maxOrder = properties.reduce((max, p) => Math.max(max, p.display_order || 0), 0);
      const display_order = editingProperty ? data.display_order : maxOrder + 1;

      const dbData = {
        ...data,
        price: data.price ?? 0,
        rent_price: data.rent_price ?? 0,
        user_id: user.id,
        display_order,
        characteristics: JSON.stringify(data.characteristics),
      };

      if (editingProperty) {
        // Admins can update any property, regular users only their own (RLS enforces this)
        const { error } = await supabase
          .from('properties')
          .update({ ...dbData, updated_at: new Date().toISOString() })
          .eq('id', editingProperty.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('properties')
          .insert([dbData]);

        if (error) throw error;
      }

      await loadProperties();
      setShowForm(false);
      setEditingProperty(null);
    } catch (error) {
      console.error('Error saving property:', error);
      alert('Error al guardar la propiedad.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProperty || !user) return;

    setDeleting(true);
    try {
      // First, delete images from storage
      if (deletingProperty.images && deletingProperty.images.length > 0) {
        const imagePaths = deletingProperty.images
          .map((url) => {
            // Extract path from URL: https://xxx.supabase.co/storage/v1/object/public/properties/properties/filename.jpg
            // We need just: properties/filename.jpg
            try {
              const urlObj = new URL(url);
              const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/properties\/(.+)/);
              return pathMatch ? pathMatch[1] : null;
            } catch {
              return null;
            }
          })
          .filter((path): path is string => path !== null);

        if (imagePaths.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('properties')
            .remove(imagePaths);

          if (storageError) {
            console.error('Error deleting images from storage:', storageError);
            // Continue with property deletion even if image deletion fails
          }
        }
      }

      // Delete videos from storage if any
      if (deletingProperty.videos && deletingProperty.videos.length > 0) {
        const videoPaths = deletingProperty.videos
          .map((url) => {
            try {
              const urlObj = new URL(url);
              const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/properties\/(.+)/);
              return pathMatch ? pathMatch[1] : null;
            } catch {
              return null;
            }
          })
          .filter((path): path is string => path !== null);

        if (videoPaths.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('properties')
            .remove(videoPaths);

          if (storageError) {
            console.error('Error deleting videos from storage:', storageError);
          }
        }
      }

      // Admins can delete any property, regular users only their own (RLS enforces this)
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', deletingProperty.id);

      if (error) throw error;
      await loadProperties();
      setDeletingProperty(null);
    } catch (error) {
      console.error('Error deleting property:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleTogglePublish = async (property: Property) => {
    if (!user) return;
    try {
      const newStatus = property.status === 'active' ? 'draft' : 'active';
      // Admins can update any property, regular users only their own (RLS enforces this)
      await supabase
        .from('properties')
        .update({ status: newStatus })
        .eq('id', property.id);
      await loadProperties();
    } catch (error) {
      console.error('Error toggling publish:', error);
    }
  };

  const handleToggleFeatured = async (property: Property) => {
    if (!user) return;
    try {
      // Admins can update any property, regular users only their own (RLS enforces this)
      await supabase
        .from('properties')
        .update({ is_featured: !property.is_featured })
        .eq('id', property.id);
      await loadProperties();
    } catch (error) {
      console.error('Error toggling featured:', error);
    }
  };

  const handleReorder = async (reorderedProperties: Property[]) => {
    if (!user) return;
    
    // Update display_order values on the reordered properties
    const updatedProperties = reorderedProperties.map((property, index) => ({
      ...property,
      display_order: index + 1,
    }));
    
    // Optimistic UI update
    setProperties(updatedProperties);

    try {
      // Update display_order for all reordered properties
      const updates = updatedProperties.map((property) => 
        supabase
          .from('properties')
          .update({ display_order: property.display_order, updated_at: new Date().toISOString() })
          .eq('id', property.id)
      );

      const results = await Promise.all(updates);
      
      const hasError = results.some(result => result.error);
      if (hasError) {
        console.error('Error reordering some properties');
        await loadProperties(); // Reload on error
      }
    } catch (error) {
      console.error('Error reordering:', error);
      await loadProperties(); // Reload on error
    }
  };

  const handleCreateInvitation = async (data: {
    email: string | null;
    trial_days: number;
    expires_at: string;
    notes: string;
  }) => {
    if (!user) return;
    
    setCreatingInvitation(true);
    try {
      // Generate a unique token for the invitation
      const token = crypto.randomUUID();
      
      const { error } = await supabase
        .from('invitation_tokens')
        .insert([{
          token,
          email: data.email,
          trial_days: data.trial_days,
          expires_at: data.expires_at,
          notes: data.notes,
          created_by: user.id,
        }]);

      if (error) throw error;
      
      await loadInvitations();
      setShowCreateInvitation(false);
    } catch (error) {
      console.error('Error creating invitation:', error);
      alert('Error al crear la invitación');
    } finally {
      setCreatingInvitation(false);
    }
  };

  const handleDeleteInvitation = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta invitación?')) return;
    
    try {
      const { error } = await supabase
        .from('invitation_tokens')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadInvitations();
    } catch (error) {
      console.error('Error deleting invitation:', error);
      alert('Error al eliminar la invitación');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onNavigate('/');
  };

  // Loading state
  if (authLoading || loadingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Check subscription access (admins bypass)
  if (!isAdmin && !canAccessDashboard()) {
    return (
      <SubscriptionGuard userId={user.id} onNavigate={onNavigate}>
        <div /> {/* This won't render - SubscriptionGuard handles the UI */}
      </SubscriptionGuard>
    );
  }

  const subStatus = getStatusMessage();

  // Render past due warning wrapper
  const dashboardContent = (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 bg-card border-r border-border flex-col h-screen sticky top-0">
        {/* Logo/Brand */}
        <div className="p-6 border-b border-border flex-shrink-0">
          <h1 className="text-xl font-bold text-primary">Habitex</h1>
          <p className="text-sm text-muted-foreground">Panel de Agente</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <TrendingUp className="h-5 w-5" />
            Resumen
          </button>
          <button
            onClick={() => setActiveTab('properties')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'properties'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Building2 className="h-5 w-5" />
            Propiedades
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'profile'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <User className="h-5 w-5" />
            Perfil
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'billing'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <CreditCard className="h-5 w-5" />
            Facturación
          </button>
          <button
            onClick={() => setActiveTab('ai-tools')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'ai-tools'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Sparkles className="h-5 w-5" />
            Herramientas IA
          </button>
          
          {/* Admin-only tab */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('invitations')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'invitations'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Mail className="h-5 w-5" />
              Invitaciones
              <Shield className="ml-auto h-4 w-4" />
            </button>
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-2 flex-shrink-0">
          <button
            onClick={() => onNavigate('/')}
            className="w-full flex items-center gap-3 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="h-5 w-5" />
            Ver sitio
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-card border-r border-border flex flex-col z-50 transform transition-transform duration-300 md:hidden ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Logo/Brand with close button */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary">Inmobiliaria</h1>
            <p className="text-sm text-muted-foreground">Panel de Agente</p>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button
            onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <TrendingUp className="h-5 w-5" />
            Resumen
          </button>
          <button
            onClick={() => { setActiveTab('properties'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'properties'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Building2 className="h-5 w-5" />
            Propiedades
          </button>
          <button
            onClick={() => { setActiveTab('profile'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'profile'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <User className="h-5 w-5" />
            Perfil
          </button>
          <button
            onClick={() => { setActiveTab('billing'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'billing'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <CreditCard className="h-5 w-5" />
            Facturación
          </button>
          <button
            onClick={() => { setActiveTab('ai-tools'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'ai-tools'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Sparkles className="h-5 w-5" />
            Herramientas IA
          </button>
          {isAdmin && (
            <button
              onClick={() => { setActiveTab('invitations'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'invitations'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Mail className="h-5 w-5" />
              Invitaciones
              <Shield className="ml-auto h-4 w-4" />
            </button>
          )}
        </nav>

        {/* Mobile Footer */}
        <div className="p-4 border-t border-border space-y-2">
          <button
            onClick={() => { onNavigate('/'); setMobileMenuOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="h-5 w-5" />
            Ver sitio
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-card border-b border-border px-4 md:px-8 py-4 md:py-6">
          <div className="flex items-center justify-between gap-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-muted-foreground hover:text-foreground md:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="flex-1 min-w-0">
              <h2 className="text-xl md:text-2xl font-bold text-foreground truncate">
                {activeTab === 'overview' && 'Resumen'}
                {activeTab === 'properties' && (isAdmin ? 'Todas las Propiedades' : 'Mis Propiedades')}
                {activeTab === 'profile' && 'Mi Perfil'}
                {activeTab === 'billing' && 'Facturación'}
                {activeTab === 'ai-tools' && 'Herramientas IA'}
                {activeTab === 'invitations' && 'Invitaciones'}
              </h2>
              <p className="text-muted-foreground text-sm hidden md:block">
                Bienvenido, {profile?.full_name || 'Agente'}
              </p>
            </div>
            
            {/* Subscription status badge */}
            <div className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg flex items-center gap-2 flex-shrink-0 ${
              subStatus.color === 'green' ? 'bg-green-100 text-green-700' :
              subStatus.color === 'blue' ? 'bg-blue-100 text-blue-700' :
              subStatus.color === 'yellow' ? 'bg-amber-100 text-amber-700' :
              subStatus.color === 'red' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {isPastDue && <AlertTriangle className="h-4 w-4" />}
              {isTrialing && <Clock className="h-4 w-4" />}
              <span className="font-medium text-xs md:text-sm hidden sm:inline">{subStatus.message}</span>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div className="bg-card rounded-xl shadow-soft p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Propiedades Activas</p>
                      <p className="text-3xl font-bold text-foreground mt-1">
                        {loadingStats ? (
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        ) : (
                          dashboardStats.activeProperties
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {dashboardStats.totalProperties} total
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-xl shadow-soft p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Créditos Disponibles</p>
                      <p className="text-3xl font-bold text-foreground mt-1">
                        {totalCredits}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {freeCredits} gratis + {paidCredits} comprados
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-amber-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Credits Card */}
              <div className="bg-card rounded-xl shadow-soft p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">Créditos de IA</p>
                      <p className="text-2xl font-bold text-foreground">{totalCredits}</p>
                      <p className="text-xs text-muted-foreground">
                        {freeCredits} gratis + {paidCredits} comprados
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab('billing')}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-colors"
                  >
                    + Comprar más
                  </button>
                </div>
              </div>

              {/* AI Tools Teaser */}
              <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-xl border border-purple-200 p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg">Generador de Videos con IA</h3>
                    <p className="text-muted-foreground mt-1">
                      Crea videos profesionales de tus propiedades con inteligencia artificial. 
                      Próximamente disponible.
                    </p>
                    <button 
                      onClick={() => setActiveTab('ai-tools')}
                      className="mt-3 text-primary font-medium hover:underline"
                    >
                      Ver más →
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Action - View Profile */}
              {profile?.username && (
                <div className="bg-card rounded-xl shadow-soft p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">Tu perfil público</h3>
                      <p className="text-muted-foreground text-sm mt-1">
                        habitex.mx/{profile.username}
                      </p>
                    </div>
                    <button
                      onClick={() => onNavigate(`/${profile.username}`)}
                      className="px-4 py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Ver perfil
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Properties Tab */}
          {activeTab === 'properties' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    {properties.length} propiedades
                  </h3>
                  <button
                    onClick={loadProperties}
                    disabled={loadingProperties}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  >
                    <RefreshCw className={`h-5 w-5 ${loadingProperties ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <button
                  onClick={() => { setEditingProperty(null); setShowForm(true); }}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold shadow-lg hover:opacity-90 transition-all flex items-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Nueva propiedad
                </button>
              </div>

              <div className="bg-card rounded-xl shadow-soft overflow-hidden">
                {loadingProperties ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                    <p className="mt-4 text-muted-foreground">Cargando propiedades...</p>
                  </div>
                ) : properties.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-foreground mb-2">No tienes propiedades</h3>
                    <p className="text-muted-foreground mb-4">
                      Comienza agregando tu primera propiedad
                    </p>
                    <button
                      onClick={() => { setEditingProperty(null); setShowForm(true); }}
                      className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold"
                    >
                      Agregar propiedad
                    </button>
                  </div>
                ) : (
                  <PropertyTable
                    properties={properties}
                    onEdit={(p) => { setEditingProperty(p); setShowForm(true); }}
                    onDelete={setDeletingProperty}
                    onTogglePublish={handleTogglePublish}
                    onToggleFeatured={handleToggleFeatured}
                    onReorder={handleReorder}
                  />
                )}
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && user && (
            <ProfileSettings
              userId={user.id}
              profile={profile}
              onProfileUpdate={setProfile}
              onNavigate={onNavigate}
            />
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && user && (
            <BillingTab userId={user.id} />
          )}

          {/* AI Tools Tab */}
          {activeTab === 'ai-tools' && user && (
            <AIToolsContainer 
              userId={user.id} 
              onNavigateToBilling={() => setActiveTab('billing')} 
            />
          )}

          {/* Invitations Tab - Admin Only */}
          {activeTab === 'invitations' && isAdmin && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <p className="text-muted-foreground">
                  Gestiona las invitaciones para nuevos agentes
                </p>
                <button
                  onClick={() => setShowCreateInvitation(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  <Plus className="h-5 w-5" />
                  Nueva Invitación
                </button>
              </div>

              {loadingInvitations ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Cargando invitaciones...</p>
                </div>
              ) : (
                <InvitationTable
                  invitations={invitations}
                  onDelete={handleDeleteInvitation}
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* Property Form Modal */}
      {showForm && user && (
        <PropertyForm
          property={editingProperty}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingProperty(null); }}
          loading={saving}
          username={profile?.username || undefined}
          userId={user.id}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingProperty && (
        <DeleteConfirmModal
          title="Eliminar propiedad"
          message={`¿Estás seguro de eliminar "${deletingProperty.title}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingProperty(null)}
          loading={deleting}
        />
      )}

      {/* Create Invitation Modal - Admin Only */}
      {showCreateInvitation && isAdmin && (
        <CreateInvitationModal
          onCreate={handleCreateInvitation}
          onClose={() => setShowCreateInvitation(false)}
          loading={creatingInvitation}
        />
      )}

      {/* Credits Purchase Success Modal */}
      {showCreditsSuccess && (
        <SuccessModal
          title="¡Compra exitosa!"
          message="Tus créditos han sido añadidos a tu cuenta. ¡Gracias por tu compra!"
          onClose={() => setShowCreditsSuccess(false)}
        />
      )}
    </div>
  );

  // Wrap with past due warning if needed
  if (isPastDue) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Warning banner */}
        <div className="bg-amber-500 text-white px-4 py-3 flex-shrink-0">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">
                Tu pago está pendiente. Actualiza tu método de pago para evitar la suspensión.
              </span>
            </div>
            <button
              onClick={() => setActiveTab('billing')}
              className="bg-white text-amber-600 px-4 py-1.5 rounded-lg font-medium text-sm hover:bg-amber-50 transition-colors"
            >
              Actualizar pago
            </button>
          </div>
        </div>
        {dashboardContent}
      </div>
    );
  }

  return dashboardContent;
}
