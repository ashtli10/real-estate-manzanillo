import { useState, useEffect } from 'react';
import { Mail, AlertCircle, Clock, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';

interface InvitePageProps {
  token: string;
  onNavigate: (path: string) => void;
}

interface TokenData {
  isValid: boolean;
  email: string | null;
  trialDays: number;
}

export function InvitePage({ token, onNavigate }: InvitePageProps) {
  const [loading, setLoading] = useState(true);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    setLoading(true);
    setError(null);

    try {
      // Validate the token using our database function
      const { data, error: fetchError } = await supabase
        .rpc('validate_invitation_token', { invite_token: token });

      if (fetchError) throw fetchError;

      if (!data || data.length === 0 || !data[0].is_valid) {
        setError('Este enlace de invitación no es válido o ha expirado.');
        setTokenData(null);
        return;
      }

      setTokenData({
        isValid: data[0].is_valid,
        email: data[0].token_email,
        trialDays: data[0].token_trial_days,
      });
    } catch (err) {
      console.error('Error validating token:', err);
      setError('Error al validar la invitación. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    // Navigate to onboarding with the token
    onNavigate(`/onboarding?token=${token}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-cyan-500 to-blue-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Validando invitación...</p>
        </div>
      </div>
    );
  }

  // Invalid token
  if (error || !tokenData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-cyan-500 to-blue-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Invitación inválida</h2>
            <p className="text-gray-600 mb-6">
              {error || 'Este enlace de invitación no es válido o ha expirado.'}
            </p>
            <button
              onClick={() => onNavigate('/')}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white py-3 px-4 rounded-lg font-semibold shadow-lg transition-all"
            >
              Ir al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Valid token - show welcome screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-cyan-500 to-blue-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">¡Bienvenido!</h2>
          <p className="text-gray-600 mt-2">
            Has sido invitado a unirte a Inmobiliaria Manzanillo
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {/* Email info */}
          {tokenData.email && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <Mail className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Email asignado</p>
                <p className="font-medium text-gray-800">{tokenData.email}</p>
              </div>
            </div>
          )}

          {/* Trial info */}
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
            <Clock className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Período de prueba</p>
              <p className="font-medium text-gray-800">
                {tokenData.trialDays > 0
                  ? `${tokenData.trialDays} días gratis`
                  : 'Pago requerido al registrarse'}
              </p>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Como agente podrás:</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Publicar propiedades ilimitadas</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Tener tu propio perfil público</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Recibir contactos directos por WhatsApp</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Acceder a herramientas de IA (próximamente)</span>
            </li>
          </ul>
        </div>

        <button
          onClick={handleContinue}
          className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white py-3 px-4 rounded-lg font-semibold shadow-lg transition-all transform hover:scale-105"
        >
          Comenzar registro
        </button>

        <p className="text-center text-xs text-gray-500 mt-4">
          Al continuar, aceptas nuestros términos y condiciones
        </p>
      </div>
    </div>
  );
}
