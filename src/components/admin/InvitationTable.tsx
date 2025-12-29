import { useState } from 'react';
import { Copy, Check, Trash2, ExternalLink, Clock, Mail, Calendar } from 'lucide-react';
import type { InvitationToken } from '../../types/user';

interface InvitationTableProps {
  invitations: InvitationToken[];
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
}

export function InvitationTable({ invitations, onDelete, loading = false }: InvitationTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getInviteUrl = (token: string) => {
    return `${window.location.origin}/invite/${token}`;
  };

  const copyToClipboard = async (token: string, id: string) => {
    try {
      await navigator.clipboard.writeText(getInviteUrl(token));
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta invitación?')) return;
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const isUsed = (usedAt: string | null) => {
    return usedAt !== null;
  };

  const getStatusBadge = (invitation: InvitationToken) => {
    if (isUsed(invitation.used_at)) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          Usado
        </span>
      );
    }
    if (isExpired(invitation.expires_at)) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          Expirado
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        Activo
      </span>
    );
  };

  if (invitations.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No hay invitaciones creadas</p>
        <p className="text-sm mt-1">Crea una nueva invitación para comenzar</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Estado</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Email</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Prueba</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Expira</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Creado</th>
            <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {invitations.map((invitation) => (
            <tr key={invitation.id} className="hover:bg-muted/30">
              <td className="px-4 py-3">
                {getStatusBadge(invitation)}
              </td>
              <td className="px-4 py-3">
                {invitation.email ? (
                  <span className="flex items-center gap-1 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {invitation.email}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">Sin email</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="flex items-center gap-1 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {(invitation.trial_days ?? 0) > 0 ? `${invitation.trial_days} días` : 'Sin prueba'}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="flex items-center gap-1 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {formatDate(invitation.expires_at)}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {formatDate(invitation.created_at)}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  {!isUsed(invitation.used_at) && !isExpired(invitation.expires_at) && (
                    <>
                      <button
                        onClick={() => copyToClipboard(invitation.token, invitation.id)}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title="Copiar enlace"
                      >
                        {copiedId === invitation.id ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      <a
                        href={getInviteUrl(invitation.token)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title="Abrir enlace"
                      >
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </a>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(invitation.id)}
                    disabled={deletingId === invitation.id || loading}
                    className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600 disabled:opacity-50"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
