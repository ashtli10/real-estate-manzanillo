import { useEffect, useState } from 'react';
import { LogIn, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';

interface LoginProps {
  onNavigate: (path: string) => void;
}

export function Login({ onNavigate }: LoginProps) {
  const { signIn, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  useEffect(() => {
    if (!authLoading && user) {
      onNavigate('/dashboard');
    }
  }, [authLoading, user, onNavigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    setLoading(true);

    try {
      const { error: signInError } = await signIn(email, password);

      if (signInError) {
        setError('Credenciales inválidas. Por favor verifica tu correo y contraseña.');
        return;
      }

      onNavigate('/dashboard');
    } catch (err) {
      setError('Credenciales inválidas. Por favor verifica tu correo y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    setResetMessage('');

    if (!email.trim()) {
      setError('Ingresa tu correo para enviarte el enlace de recuperación.');
      return;
    }

    setResetLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });

      if (resetError) {
        setError('No se pudo enviar el correo de recuperación. Intenta de nuevo.');
      } else {
        setResetMessage('Te enviamos un correo con el enlace para restablecer tu contraseña.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-cyan-500 to-blue-500 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogIn className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800">Panel de Administración</h2>
            <p className="text-gray-600 mt-2">Habitex</p>
          </div>

          {(error || resetMessage) && (
            <div
              className={`rounded-lg p-4 mb-6 flex items-start space-x-3 border ${
                error
                  ? 'bg-red-50 border-red-200'
                  : 'bg-emerald-50 border-emerald-200'
              }`}
            >
              {error ? (
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              ) : (
                <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              )}
              <p className={`text-sm ${error ? 'text-red-800' : 'text-emerald-800'}`}>
                {error || resetMessage}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="admin@habitex.mx"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white py-3 px-4 rounded-lg font-semibold shadow-lg transform transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>

            <button
              type="button"
              onClick={handleResetPassword}
              disabled={resetLoading}
              className="w-full text-blue-700 hover:text-blue-800 text-sm font-medium underline-offset-4 hover:underline disabled:opacity-60"
            >
              {resetLoading ? 'Enviando enlace...' : '¿Olvidaste tu contraseña?'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => onNavigate('/')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
