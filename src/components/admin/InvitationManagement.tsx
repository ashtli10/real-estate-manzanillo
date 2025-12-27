/**
 * Invitation Management Component
 * Allows admins to create and manage invitation links
 */

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Copy, 
  Check, 
  Trash2, 
  Loader2, 
  Link2, 
  Calendar,
  Users,
  RefreshCw,
  Mail
} from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import type { InvitationToken } from '../../types/auth';

// Generate a secure random token
function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Raw database row type for invitation_tokens (before types are regenerated)
interface InvitationTokenRow {
  id: string;
  token: string;
  email: string | null;
  created_by: string;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  trial_days: number;
  created_at: string;
}

export function InvitationManagement() {
  const [invitations, setInvitations] = useState<InvitationToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newInvitationUrl, setNewInvitationUrl] = useState<string | null>(null);
  
  // Form state
  const [formEmail, setFormEmail] = useState('');
  const [formTrialDays, setFormTrialDays] = useState(14);
  const [formExpiresInDays, setFormExpiresInDays] = useState(7);

  // Load invitations
  const loadInvitations = async () => {
    setLoading(true);
    try {
      // Use type assertion since table isn't in generated types yet
      const { data, error } = await (supabase
        .from('invitation_tokens' as never)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50) as unknown as Promise<{ data: InvitationTokenRow[] | null; error: Error | null }>);

      if (error) throw error;

      setInvitations(
        (data || []).map((inv) => ({
          id: inv.id,
          token: inv.token,
          email: inv.email,
          createdBy: inv.created_by,
          expiresAt: inv.expires_at,
          usedAt: inv.used_at,
          usedBy: inv.used_by,
          trialDays: inv.trial_days,
          createdAt: inv.created_at,
        }))
      );
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvitations();
  }, []);

  // Create new invitation
  const onCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const token = generateSecureToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + formExpiresInDays);

      const { data: userData } = await supabase.auth.getUser();
      
      // Use type assertion since table isn't in generated types yet
      const { error } = await (supabase.from('invitation_tokens' as never).insert({
        token,
        email: formEmail || null,
        trial_days: formTrialDays,
        expires_at: expiresAt.toISOString(),
        created_by: userData.user?.id,
      } as never) as unknown as Promise<{ error: Error | null }>);

      if (error) throw error;

      // Generate the invitation URL
      const baseUrl = window.location.origin;
      const invitationUrl = `${baseUrl}/signup?token=${token}`;
      setNewInvitationUrl(invitationUrl);
      
      // Reload invitations and reset form
      await loadInvitations();
      setShowCreateForm(false);
      setFormEmail('');
      setFormTrialDays(14);
      setFormExpiresInDays(7);
    } catch (error) {
      console.error('Error creating invitation:', error);
      alert('Error al crear la invitación');
    } finally {
      setCreating(false);
    }
  };

  // Delete invitation
  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta invitación?')) return;

    try {
      // Use type assertion since table isn't in generated types yet
      const { error } = await (supabase
        .from('invitation_tokens' as never)
        .delete()
        .eq('id', id) as unknown as Promise<{ error: Error | null }>);

      if (error) throw error;
      await loadInvitations();
    } catch (error) {
      console.error('Error deleting invitation:', error);
    }
  };

  // Copy invitation URL
  const copyToClipboard = async (token: string, id: string) => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/signup?token=${token}`;
    
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  // Check if invitation is expired
  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();
  
  // Check if invitation is used
  const isUsed = (usedAt: string | null) => !!usedAt;

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Invitaciones</h2>
              <p className="text-sm text-gray-500">Gestiona los enlaces de invitación</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadInvitations}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Nueva invitación
            </button>
          </div>
        </div>
      </div>

      {/* New invitation URL display */}
      {newInvitationUrl && (
        <div className="p-4 mx-6 mt-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-800 mb-2">
                ¡Invitación creada! Comparte este enlace:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white px-3 py-2 rounded border border-green-200 text-sm text-gray-700 overflow-hidden text-ellipsis">
                  {newInvitationUrl}
                </code>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(newInvitationUrl);
                    setCopiedId('new');
                    setTimeout(() => {
                      setCopiedId(null);
                      setNewInvitationUrl(null);
                    }, 2000);
                  }}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  {copiedId === 'new' ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copiar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create form modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Nueva invitación
            </h3>
            <form onSubmit={onCreateInvitation} className="space-y-4">
              {/* Email (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (opcional)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="usuario@ejemplo.com"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Si agregas un email, se pre-llenará en el formulario de registro
                </p>
              </div>

              {/* Trial days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Días de prueba
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    value={formTrialDays}
                    onChange={(e) => setFormTrialDays(Number(e.target.value))}
                    min={1}
                    max={90}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Link expiry */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  El enlace expira en (días)
                </label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    value={formExpiresInDays}
                    onChange={(e) => setFormExpiresInDays(Number(e.target.value))}
                    min={1}
                    max={30}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setFormEmail('');
                    setFormTrialDays(14);
                    setFormExpiresInDays(7);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    'Crear invitación'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invitations list */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-2" />
            <p className="text-gray-500">Cargando invitaciones...</p>
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-8">
            <Link2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No hay invitaciones aún</p>
            <p className="text-sm text-gray-400">Crea una invitación para agregar nuevos usuarios</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invitations.map((inv) => {
              const expired = isExpired(inv.expiresAt);
              const used = isUsed(inv.usedAt);
              const status = used ? 'used' : expired ? 'expired' : 'active';

              return (
                <div
                  key={inv.id}
                  className={`p-4 rounded-lg border ${
                    status === 'used'
                      ? 'bg-gray-50 border-gray-200'
                      : status === 'expired'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {inv.email ? (
                          <span className="font-medium text-gray-900">{inv.email}</span>
                        ) : (
                          <span className="text-gray-500 italic">Sin email</span>
                        )}
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            status === 'used'
                              ? 'bg-gray-200 text-gray-700'
                              : status === 'expired'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {status === 'used' ? 'Usado' : status === 'expired' ? 'Expirado' : 'Activo'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-4">
                        <span>{inv.trialDays} días de prueba</span>
                        <span>•</span>
                        <span>
                          {status === 'used'
                            ? `Usado el ${formatDate(inv.usedAt!)}`
                            : `Expira ${formatDate(inv.expiresAt)}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {status === 'active' && (
                        <button
                          onClick={() => copyToClipboard(inv.token, inv.id)}
                          className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Copiar enlace"
                        >
                          {copiedId === inv.id ? (
                            <Check className="h-5 w-5 text-green-600" />
                          ) : (
                            <Copy className="h-5 w-5" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(inv.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
