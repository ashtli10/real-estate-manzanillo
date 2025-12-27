/**
 * Signup Page
 * Handles invitation-based user registration with validation
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../contexts/AuthContext';
import { signupSchema, type SignupInput } from '../lib/validation';
import { supabase } from '../integrations/supabase/client';
import { 
  Loader2, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Building2
} from 'lucide-react';

interface SignupProps {
  onNavigate: (path: string) => void;
  invitationToken: string;
}

interface TokenValidation {
  status: 'loading' | 'valid' | 'invalid' | 'expired';
  email: string | null;
  trialDays: number;
  message: string;
}

export function Signup({ onNavigate, invitationToken }: SignupProps) {
  const { signUp, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  const [tokenValidation, setTokenValidation] = useState<TokenValidation>({
    status: 'loading',
    email: null,
    trialDays: 14,
    message: 'Validando invitación...',
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      invitationToken: invitationToken,
    },
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      onNavigate('/dashboard');
    }
  }, [user, onNavigate]);

  // Validate invitation token on mount
  useEffect(() => {
    async function validateToken() {
      if (!invitationToken) {
        setTokenValidation({
          status: 'invalid',
          email: null,
          trialDays: 0,
          message: 'No se proporcionó un token de invitación. Solicita uno a un administrador.',
        });
        return;
      }

      try {
        // Use type assertion since the function is defined in migration but not in generated types yet
        const { data, error } = await supabase
          .rpc('validate_invitation_token' as never, { token_value: invitationToken } as never) as { 
            data: Array<{ valid: boolean; email: string | null; trial_days: number }> | null; 
            error: Error | null 
          };

        if (error) {
          setTokenValidation({
            status: 'invalid',
            email: null,
            trialDays: 0,
            message: 'Error al validar la invitación. Intenta de nuevo.',
          });
          return;
        }

        if (!data || data.length === 0) {
          setTokenValidation({
            status: 'invalid',
            email: null,
            trialDays: 0,
            message: 'La invitación no es válida.',
          });
          return;
        }

        const tokenData = data[0];
        
        if (!tokenData.valid) {
          setTokenValidation({
            status: 'expired',
            email: null,
            trialDays: 0,
            message: 'Esta invitación ha expirado o ya fue utilizada.',
          });
          return;
        }

        setTokenValidation({
          status: 'valid',
          email: tokenData.email,
          trialDays: tokenData.trial_days,
          message: `¡Invitación válida! ${tokenData.trial_days} días de prueba gratis.`,
        });

        // Pre-fill email if provided in token
        if (tokenData.email) {
          setValue('email', tokenData.email);
        }
      } catch {
        setTokenValidation({
          status: 'invalid',
          email: null,
          trialDays: 0,
          message: 'Error de conexión. Verifica tu internet.',
        });
      }
    }

    validateToken();
  }, [invitationToken, setValue]);

  const onSubmit = async (data: SignupInput) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const { error } = await signUp(data.email, data.password, data.invitationToken);
      
      if (error) {
        setSubmitError(error.message);
        return;
      }

      setSubmitSuccess(true);
    } catch {
      setSubmitError('Ocurrió un error inesperado. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (submitSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-white p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            ¡Cuenta creada!
          </h1>
          <p className="text-gray-600 mb-6">
            Revisa tu correo electrónico para confirmar tu cuenta y comenzar a usar la plataforma.
          </p>
          <button
            onClick={() => onNavigate('/login')}
            className="w-full bg-sky-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-sky-700 transition-colors"
          >
            Ir a Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (tokenValidation.status === 'invalid' || tokenValidation.status === 'expired') {
    const isExpired = tokenValidation.status === 'expired';
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-white p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className={`w-20 h-20 ${isExpired ? 'bg-amber-100' : 'bg-red-100'} rounded-full flex items-center justify-center mx-auto mb-6`}>
            {isExpired ? (
              <AlertTriangle className="h-10 w-10 text-amber-600" />
            ) : (
              <XCircle className="h-10 w-10 text-red-600" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isExpired ? 'Invitación expirada' : 'Invitación inválida'}
          </h1>
          <p className="text-gray-600 mb-6">
            {tokenValidation.message}
          </p>
          <button
            onClick={() => onNavigate('/')}
            className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-white p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-sky-600 rounded-2xl mb-4">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Crea tu cuenta
          </h1>
          <p className="text-gray-600 mt-2">
            Inmobiliaria Manzanillo
          </p>
        </div>

        {/* Token status banner */}
        {tokenValidation.status === 'loading' ? (
          <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
            <span className="text-sky-800">{tokenValidation.message}</span>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-green-800">{tokenValidation.message}</span>
          </div>
        )}

        {/* Form */}
        <form 
          onSubmit={handleSubmit(onSubmit)} 
          className="bg-white rounded-2xl shadow-xl p-8 space-y-6"
        >
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Correo electrónico
            </label>
            <input
              {...register('email')}
              type="email"
              id="email"
              autoComplete="email"
              disabled={!!tokenValidation.email || tokenValidation.status === 'loading'}
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.email ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-sky-500'
              } focus:ring-2 focus:border-transparent transition-colors disabled:bg-gray-100 disabled:text-gray-500`}
              placeholder="tu@email.com"
            />
            {errors.email && (
              <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="new-password"
                disabled={tokenValidation.status === 'loading'}
                className={`w-full px-4 py-3 pr-12 rounded-lg border ${
                  errors.password ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-sky-500'
                } focus:ring-2 focus:border-transparent transition-colors`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              Mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirmar contraseña
            </label>
            <div className="relative">
              <input
                {...register('confirmPassword')}
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                autoComplete="new-password"
                disabled={tokenValidation.status === 'loading'}
                className={`w-full px-4 py-3 pr-12 rounded-lg border ${
                  errors.confirmPassword ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-sky-500'
                } focus:ring-2 focus:border-transparent transition-colors`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-2 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Hidden token field */}
          <input type="hidden" {...register('invitationToken')} />

          {/* Submit error */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="text-red-800 text-sm">{submitError}</span>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting || tokenValidation.status === 'loading'}
            className="w-full bg-sky-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creando cuenta...
              </>
            ) : (
              'Crear cuenta'
            )}
          </button>

          {/* Login link */}
          <p className="text-center text-sm text-gray-600">
            ¿Ya tienes cuenta?{' '}
            <button
              type="button"
              onClick={() => onNavigate('/login')}
              className="text-sky-600 hover:text-sky-700 font-medium"
            >
              Inicia sesión
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
