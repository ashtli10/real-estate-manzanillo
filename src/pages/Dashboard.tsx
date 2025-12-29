import { useEffect, useState } from 'react';
import {
  Home,
  Building2,
  User,
  CreditCard,
  Sparkles,
  LogOut,
  Plus,
  Eye,
  MessageSquare,
  TrendingUp,
  RefreshCw,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Clock,
  Mail,
  Shield,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../integrations/supabase/client';
import type { Property, PropertyInsert } from '../types/property';
import type { Profile, Subscription, Credits, InvitationToken } from '../types/user';
import { PropertyTable } from '../components/admin/PropertyTable';
import { PropertyForm } from '../components/admin/PropertyForm';
import { DeleteConfirmModal } from '../components/admin/DeleteConfirmModal';
import { CreateInvitationModal } from '../components/admin/CreateInvitationModal';
import { InvitationTable } from '../components/admin/InvitationTable';
import { transformProperty } from '../lib/propertyTransform';

type DashboardTab = 'overview' | 'properties' | 'profile' | 'billing' | 'ai-tools' | 'settings' | 'invitations';

interface DashboardProps {
  onNavigate: (path: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  
  // Data state
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [credits, setCredits] = useState<Credits | null>(null);
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

      // Load subscription (with error handling)
      try {
        const { data: subData, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (!subError && subData) {
          setSubscription(subData as Subscription);
        }
      } catch (err) {
        console.warn('Could not load subscription:', err);
      }

      // Load credits
      const { data: creditsData } = await supabase
        .from('credits')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (creditsData) setCredits(creditsData as Credits);
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

  const getSubscriptionStatus = () => {
    if (!subscription) return { status: 'unknown', message: 'No hay suscripción' };
    
    if (subscription.status === 'active') {
      return { status: 'active', message: 'Suscripción activa' };
    }
    if (subscription.status === 'trialing') {
      const trialEnd = new Date(subscription.trial_ends_at || '');
      const daysLeft = Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysLeft > 0) {
        return { status: 'trial', message: `${daysLeft} días de prueba restantes` };
      }
      return { status: 'expired', message: 'Período de prueba expirado' };
    }
    if (subscription.status === 'past_due') {
      return { status: 'warning', message: 'Pago pendiente' };
    }
    return { status: 'inactive', message: 'Suscripción inactiva' };
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

  const subStatus = getSubscriptionStatus();
  const activeProperties = properties.filter(p => p.status === 'active').length;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        {/* Logo/Brand */}
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold text-primary">Inmobiliaria Manzanillo</h1>
          <p className="text-sm text-muted-foreground">Panel de Agente</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
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
            IA Tools
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              Pronto
            </span>
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
        <div className="p-4 border-t border-border space-y-2">
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

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-card border-b border-border px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {activeTab === 'overview' && 'Resumen'}
                {activeTab === 'properties' && (isAdmin ? 'Todas las Propiedades' : 'Mis Propiedades')}
                {activeTab === 'profile' && 'Mi Perfil'}
                {activeTab === 'billing' && 'Facturación'}
                {activeTab === 'ai-tools' && 'Herramientas de IA'}
                {activeTab === 'invitations' && 'Invitaciones'}
              </h2>
              <p className="text-muted-foreground">
                Bienvenido, {profile?.full_name || 'Agente'}
              </p>
            </div>
            
            {/* Subscription status badge */}
            <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              subStatus.status === 'active' ? 'bg-green-100 text-green-700' :
              subStatus.status === 'trial' ? 'bg-blue-100 text-blue-700' :
              subStatus.status === 'warning' ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              {subStatus.status === 'warning' && <AlertTriangle className="h-4 w-4" />}
              {subStatus.status === 'trial' && <Clock className="h-4 w-4" />}
              <span className="font-medium text-sm">{subStatus.message}</span>
            </div>
          </div>
        </header>

        <div className="p-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card rounded-xl shadow-soft p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Propiedades Activas</p>
                      <p className="text-3xl font-bold text-foreground mt-1">{activeProperties}</p>
                    </div>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-xl shadow-soft p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Vistas Esta Semana</p>
                      <p className="text-3xl font-bold text-foreground mt-1">--</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Eye className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-xl shadow-soft p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Contactos Este Mes</p>
                      <p className="text-3xl font-bold text-foreground mt-1">--</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <MessageSquare className="h-6 w-6 text-green-600" />
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
                      <p className="text-2xl font-bold text-foreground">{credits?.balance || 0}</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-colors">
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
                        inmobiliaria-manzanillo.com/{profile.username}
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
                    onMoveUp={() => {}}
                    onMoveDown={() => {}}
                  />
                )}
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="max-w-2xl space-y-6">
              <div className="bg-card rounded-xl shadow-soft p-6">
                <h3 className="font-semibold text-foreground mb-4">Información del perfil</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Nombre</label>
                      <p className="font-medium">{profile?.full_name || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Usuario</label>
                      <p className="font-medium">@{profile?.username || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Email</label>
                      <p className="font-medium">{profile?.email || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Teléfono</label>
                      <p className="font-medium">{profile?.phone_number || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">WhatsApp</label>
                      <p className="font-medium">{profile?.whatsapp_number || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Empresa</label>
                      <p className="font-medium">{profile?.company_name || '-'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Biografía</label>
                    <p className="font-medium">{profile?.bio || '-'}</p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Edición del perfil próximamente disponible.
              </p>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div className="max-w-2xl space-y-6">
              <div className="bg-card rounded-xl shadow-soft p-6">
                <h3 className="font-semibold text-foreground mb-4">Plan actual</h3>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-bold text-lg">Plan Agente</p>
                    <p className="text-muted-foreground">$199 MXN/mes</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    subStatus.status === 'active' ? 'bg-green-100 text-green-700' :
                    subStatus.status === 'trial' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {subStatus.message}
                  </div>
                </div>
                {subscription?.trial_ends_at && subStatus.status === 'trial' && (
                  <p className="text-sm text-muted-foreground mt-4">
                    Tu prueba termina el {new Date(subscription.trial_ends_at).toLocaleDateString('es-MX')}
                  </p>
                )}
              </div>

              <div className="bg-card rounded-xl shadow-soft p-6">
                <h3 className="font-semibold text-foreground mb-4">Créditos de IA</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">{credits?.balance || 0}</p>
                    <p className="text-muted-foreground text-sm">créditos disponibles</p>
                  </div>
                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium">
                    Comprar créditos
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AI Tools Tab */}
          {activeTab === 'ai-tools' && (
            <div className="max-w-2xl">
              <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-xl border border-purple-200 p-8 text-center">
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="h-10 w-10 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  Generador de Videos con IA
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Pronto podrás crear videos profesionales de tus propiedades usando 
                  inteligencia artificial. Selecciona una propiedad, genera frames, 
                  y obtén un video listo para redes sociales.
                </p>
                
                <div className="bg-white/50 rounded-lg p-4 mb-6">
                  <p className="text-sm text-muted-foreground mb-2">Costo por video:</p>
                  <ul className="text-sm space-y-1">
                    <li>• Generar 3 frames: <strong>5 créditos</strong></li>
                    <li>• Regenerar frames: <strong>5 créditos</strong></li>
                    <li>• Generar video final: <strong>30 créditos</strong></li>
                  </ul>
                </div>

                <p className="text-sm text-muted-foreground">
                  Tienes <strong>{credits?.balance || 0} créditos</strong> disponibles
                </p>
              </div>
            </div>
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
      {showForm && (
        <PropertyForm
          property={editingProperty}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingProperty(null); }}
          loading={saving}
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
    </div>
  );
}
