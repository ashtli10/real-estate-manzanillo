import { useState } from 'react';
import { X, Loader2, Calendar, Mail, Clock, FileText } from 'lucide-react';

interface CreateInvitationModalProps {
  onClose: () => void;
  onCreate: (data: {
    email: string | null;
    trial_days: number;
    expires_at: string;
    notes: string;
  }) => Promise<void>;
  loading?: boolean;
}

export function CreateInvitationModal({ onClose, onCreate, loading = false }: CreateInvitationModalProps) {
  const [email, setEmail] = useState('');
  const [trialDays, setTrialDays] = useState(7);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    
    await onCreate({
      email: email.trim() || null,
      trial_days: trialDays,
      expires_at: expiresAt.toISOString(),
      notes: notes.trim(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-strong w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Crear Invitación</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Email (optional) */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <Mail className="inline h-4 w-4 mr-1" />
              Email (opcional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="agente@ejemplo.com"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Si se especifica, el email se prellenará en el registro
            </p>
          </div>

          {/* Trial Days */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <Clock className="inline h-4 w-4 mr-1" />
              Días de prueba
            </label>
            <select
              value={trialDays}
              onChange={(e) => setTrialDays(Number(e.target.value))}
              className="input-field"
            >
              <option value={0}>Sin prueba (pago inmediato)</option>
              <option value={7}>7 días</option>
              <option value={14}>14 días</option>
              <option value={30}>30 días</option>
              <option value={60}>60 días</option>
              <option value={90}>90 días</option>
            </select>
          </div>

          {/* Expiration */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Enlace expira en
            </label>
            <select
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(Number(e.target.value))}
              className="input-field"
            >
              <option value={1}>1 día</option>
              <option value={3}>3 días</option>
              <option value={7}>7 días</option>
              <option value={14}>14 días</option>
              <option value={30}>30 días</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <FileText className="inline h-4 w-4 mr-1" />
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field resize-none"
              rows={2}
              placeholder="Notas internas sobre esta invitación..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-foreground bg-muted hover:bg-muted/80 rounded-lg font-medium transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold shadow hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
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
  );
}
