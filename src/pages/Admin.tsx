import { useEffect, useState } from 'react';
import { Plus, RefreshCw, LogOut, Home, Building2, Users, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../integrations/supabase/client';
import type { Property, PropertyInsert } from '../types/property';
import { PropertyTable } from '../components/admin/PropertyTable';
import { PropertyForm } from '../components/admin/PropertyForm';
import { DeleteConfirmModal } from '../components/admin/DeleteConfirmModal';
import { InvitationManagement } from '../components/admin/InvitationManagement';
import { transformProperty } from '../lib/propertyTransform';

type AdminTab = 'properties' | 'invitations';

interface AdminProps {
  onNavigate: (path: string) => void;
}

export function Admin({ onNavigate }: AdminProps) {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [deletingProperty, setDeletingProperty] = useState<Property | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('properties');

  useEffect(() => {
    if (!authLoading && !user) {
      onNavigate('/login');
    }
  }, [user, authLoading, onNavigate]);

  useEffect(() => {
    if (user && isAdmin) {
      loadProperties();
    }
  }, [user, isAdmin]);

  const loadProperties = async () => {
    setLoading(true);
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
      setLoading(false);
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
      const { error } = await supabase
        .from('properties')
        .update({ is_published: !property.is_published })
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
                Gestiona las propiedades de BN Inmobiliaria
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

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="bg-card rounded-xl shadow-soft p-2 mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab('properties')}
            className={`flex-1 sm:flex-none px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'properties'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Building2 className="h-5 w-5" />
            Propiedades
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`flex-1 sm:flex-none px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'invitations'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Users className="h-5 w-5" />
            Invitaciones
          </button>
        </div>

        {/* Tab Content */}
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
                  disabled={loading}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  title="Refrescar"
                >
                  <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
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
              {loading ? (
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

        {activeTab === 'invitations' && (
          <InvitationManagement />
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
    </div>
  );
}
