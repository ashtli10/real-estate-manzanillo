import { useEffect, useState } from 'react';
import { Plus, RefreshCw, LogOut, Home, Building2, Users, Mail, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../integrations/supabase/client';
import type { Property, PropertyInsert } from '../types/property';
import type { InvitationToken } from '../types/user';
import { PropertyTable } from '../components/admin/PropertyTable';
import { PropertyForm } from '../components/admin/PropertyForm';
import { DeleteConfirmModal } from '../components/admin/DeleteConfirmModal';
import { CreateInvitationModal } from '../components/admin/CreateInvitationModal';
import { InvitationTable } from '../components/admin/InvitationTable';
import { transformProperty } from '../lib/propertyTransform';

type AdminTab = 'properties' | 'invitations';

interface AdminProps {
  onNavigate: (path: string) => void;
}

export function Admin({ onNavigate }: AdminProps) {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('properties');
  
  // Properties state
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [deletingProperty, setDeletingProperty] = useState<Property | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Invitations state
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
    if (user && isAdmin) {
      loadProperties();
      loadInvitations();
    }
  }, [user, isAdmin]);

  const loadProperties = async () => {
    setLoadingProperties(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('display_order', { ascending: true });

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

  const handleCreateInvitation = async (data: {
    email: string | null;
    trial_days: number;
    expires_at: string;
    notes: string;
  }) => {
    setCreatingInvitation(true);
    try {
      const { error } = await supabase
        .from('invitation_tokens')
        .insert([{
          email: data.email,
          trial_days: data.trial_days,
          expires_at: data.expires_at,
          notes: data.notes,
          created_by: user?.id,
        }]);

      if (error) throw error;
      await loadInvitations();
      setShowCreateInvitation(false);
    } catch (error) {
      console.error('Error creating invitation:', error);
      alert('Error al crear la invitación. Por favor intenta de nuevo.');
    } finally {
      setCreatingInvitation(false);
    }
  };

  const handleDeleteInvitation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('invitation_tokens')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadInvitations();
    } catch (error) {
      console.error('Error deleting invitation:', error);
      alert('Error al eliminar la invitación. Por favor intenta de nuevo.');
    }
  };

  const handleSave = async (data: PropertyInsert) => {
    setSaving(true);
    try {
      const maxOrder = properties.reduce((max, property) => Math.max(max, property.display_order || 0), 0);
      const display_order = editingProperty ? data.display_order : maxOrder + 1;

      // Convert characteristics to JSON for database
      const dbData = {
        ...data,
        display_order,
        characteristics: JSON.stringify(data.characteristics),
      };

      if (editingProperty) {
        const { error } = await supabase
          .from('properties')
          .update({
            ...dbData,
            updated_at: new Date().toISOString(),
          })
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
      alert('Error al guardar la propiedad. Por favor intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProperty) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', deletingProperty.id);

      if (error) throw error;

      await loadProperties();
      setDeletingProperty(null);
    } catch (error) {
      console.error('Error deleting property:', error);
      alert('Error al eliminar la propiedad. Por favor intenta de nuevo.');
    } finally {
      setDeleting(false);
    }
  };

  const handleTogglePublish = async (property: Property) => {
    try {
      const newStatus = property.status === 'active' ? 'draft' : 'active';
      const { error } = await supabase
        .from('properties')
        .update({ status: newStatus })
        .eq('id', property.id);

      if (error) throw error;
      await loadProperties();
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
      await loadProperties();
    } catch (error) {
      console.error('Error toggling featured:', error);
    }
  };

  const swapOrder = async (property: Property, direction: 'up' | 'down') => {
    const currentIndex = properties.findIndex((p) => p.id === property.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= properties.length) return;

    const targetProperty = properties[targetIndex];
    const currentOrder = property.display_order;
    const targetOrder = targetProperty.display_order;

    try {
      // Optimistic UI update
      setProperties((prev) => {
        const updated = [...prev];
        updated[currentIndex] = { ...property, display_order: targetOrder };
        updated[targetIndex] = { ...targetProperty, display_order: currentOrder };
        return updated.sort((a, b) => a.display_order - b.display_order);
      });

      // Persist to database
      const [result1, result2] = await Promise.all([
        supabase
          .from('properties')
          .update({ display_order: targetOrder, updated_at: new Date().toISOString() })
          .eq('id', property.id),
        supabase
          .from('properties')
          .update({ display_order: currentOrder, updated_at: new Date().toISOString() })
          .eq('id', targetProperty.id),
      ]);

      if (result1.error) throw result1.error;
      if (result2.error) throw result2.error;
    } catch (error) {
      console.error('Error reordering:', error);
      await loadProperties();
    }
  };

  const handleMoveUp = (property: Property) => swapOrder(property, 'up');
  const handleMoveDown = (property: Property) => swapOrder(property, 'down');

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setShowForm(true);
  };

  const handleSignOut = async () => {
    await signOut();
    onNavigate('/');
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-strong p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Acceso denegado</h2>
          <p className="text-muted-foreground mb-6">
            No tienes permisos de administrador para acceder a esta página.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => onNavigate('/')}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-colors flex items-center justify-center gap-2"
            >
              <Home className="h-5 w-5" />
              Ir al inicio
            </button>
            <button
              onClick={handleSignOut}
              className="px-6 py-3 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="h-5 w-5" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-primary text-primary-foreground py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Panel de Administración</h1>
              <p className="text-primary-foreground/80 mt-1">
                Gestiona la plataforma Inmobiliaria Manzanillo
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('/')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Home className="h-5 w-5" />
                Ver sitio
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <LogOut className="h-5 w-5" />
                Salir
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('properties')}
              className={`px-6 py-4 font-medium transition-colors flex items-center gap-2 border-b-2 -mb-px ${
                activeTab === 'properties'
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              <Building2 className="h-5 w-5" />
              Propiedades
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`px-6 py-4 font-medium transition-colors flex items-center gap-2 border-b-2 -mb-px ${
                activeTab === 'invitations'
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              <Mail className="h-5 w-5" />
              Invitaciones
              {invitations.filter(i => !i.used_at && new Date(i.expires_at) > new Date()).length > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
                  {invitations.filter(i => !i.used_at && new Date(i.expires_at) > new Date()).length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Properties Tab */}
        {activeTab === 'properties' && (
          <>
            {/* Actions Bar */}
            <div className="bg-card rounded-xl shadow-soft p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold text-foreground">
                  Propiedades ({properties.length})
                </h2>
                <button
                  onClick={loadProperties}
                  disabled={loadingProperties}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  title="Refrescar"
                >
                  <RefreshCw className={`h-5 w-5 ${loadingProperties ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <button
                onClick={() => {
                  setEditingProperty(null);
                  setShowForm(true);
                }}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold shadow-lg hover:opacity-90 transition-all flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Nueva propiedad
              </button>
            </div>

            {/* Properties Table */}
            <div className="bg-card rounded-xl shadow-soft overflow-hidden">
              {loadingProperties ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                  <p className="mt-4 text-muted-foreground">Cargando propiedades...</p>
                </div>
              ) : (
                <PropertyTable
                  properties={properties}
                  onEdit={handleEdit}
                  onDelete={setDeletingProperty}
                  onTogglePublish={handleTogglePublish}
                  onToggleFeatured={handleToggleFeatured}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                />
              )}
            </div>
          </>
        )}

        {/* Invitations Tab */}
        {activeTab === 'invitations' && (
          <>
            {/* Actions Bar */}
            <div className="bg-card rounded-xl shadow-soft p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold text-foreground">
                  Invitaciones ({invitations.length})
                </h2>
                <button
                  onClick={loadInvitations}
                  disabled={loadingInvitations}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  title="Refrescar"
                >
                  <RefreshCw className={`h-5 w-5 ${loadingInvitations ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <button
                onClick={() => setShowCreateInvitation(true)}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold shadow-lg hover:opacity-90 transition-all flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Nueva invitación
              </button>
            </div>

            {/* Invitations Table */}
            <div className="bg-card rounded-xl shadow-soft overflow-hidden">
              {loadingInvitations ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                  <p className="mt-4 text-muted-foreground">Cargando invitaciones...</p>
                </div>
              ) : (
                <InvitationTable
                  invitations={invitations}
                  onDelete={handleDeleteInvitation}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* Property Form Modal */}
      {showForm && (
        <PropertyForm
          property={editingProperty}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingProperty(null);
          }}
          loading={saving}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingProperty && (
        <DeleteConfirmModal
          title="Eliminar propiedad"
          message={`¿Estás seguro de que deseas eliminar "${deletingProperty.title}"? Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingProperty(null)}
          loading={deleting}
        />
      )}

      {/* Create Invitation Modal */}
      {showCreateInvitation && (
        <CreateInvitationModal
          onClose={() => setShowCreateInvitation(false)}
          onCreate={handleCreateInvitation}
          loading={creatingInvitation}
        />
      )}
    </div>
  );
}
