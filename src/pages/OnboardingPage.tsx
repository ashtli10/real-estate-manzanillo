import { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Lock,
  Phone,
  Building2,
  MapPin,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  AtSign,
  PartyPopper,
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { isValidUsername, formatUsernameError } from '../types/user';
import { validatePhoneNumber, formatPhoneAsYouType, normalizePhoneNumber } from '../lib/whatsapp';

interface OnboardingPageProps {
  token: string;
  onNavigate: (path: string) => void;
}

type Step = 1 | 1.5 | 2 | 3 | 4 | 5;

interface FormData {
  // Step 1 - Account
  email: string;
  password: string;
  confirmPassword: string;
  // Step 1.5 - Email verification
  otp: string;
  // Step 2 - Personal
  fullName: string;
  phoneNumber: string;
  whatsappNumber: string;
  // Step 3 - Business
  companyName: string;
  username: string;
  bio: string;
  location: string;
}

export function OnboardingPage({ token, onNavigate }: OnboardingPageProps) {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [trialDays, setTrialDays] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    otp: '',
    fullName: '',
    phoneNumber: '',
    whatsappNumber: '',
    companyName: '',
    username: '',
    bio: '',
    location: 'Manzanillo, Colima',
  });

  // Validate token on mount
  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    setValidatingToken(true);
    try {
      const { data, error: fetchError } = await supabase
        .rpc('validate_invitation_token', { invite_token: token });

      if (fetchError) throw fetchError;

      if (!data || data.length === 0 || !data[0].is_valid) {
        onNavigate('/');
        return;
      }

      setTrialDays(data[0].token_trial_days);
      if (data[0].token_email) {
        setFormData(prev => ({ ...prev, email: data[0].token_email || '' }));
      }
    } catch (err) {
      console.error('Error validating token:', err);
      onNavigate('/');
    } finally {
      setValidatingToken(false);
    }
  };

  // Check username availability
  useEffect(() => {
    const checkUsername = async () => {
      if (!formData.username || formData.username.length < 3) {
        setUsernameAvailable(null);
        return;
      }

      const validationError = formatUsernameError(formData.username);
      if (validationError) {
        setUsernameError(validationError);
        setUsernameAvailable(false);
        return;
      }

      setCheckingUsername(true);
      setUsernameError(null);

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', formData.username.toLowerCase())
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;
        setUsernameAvailable(!data);
        if (data) {
          setUsernameError('Este nombre de usuario ya está en uso');
        }
      } catch (err) {
        console.error('Error checking username:', err);
      } finally {
        setCheckingUsername(false);
      }
    };

    const debounce = setTimeout(checkUsername, 500);
    return () => clearTimeout(debounce);
  }, [formData.username]);

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateStep1 = () => {
    if (!formData.email) return 'El email es requerido';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Email inválido';
    if (!formData.password) return 'La contraseña es requerida';
    if (formData.password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
    if (formData.password !== formData.confirmPassword) return 'Las contraseñas no coinciden';
    return null;
  };

  const validateStep2 = () => {
    if (!formData.fullName.trim()) return 'El nombre completo es requerido';
    
    // Phone is optional, but validate format if provided
    if (formData.phoneNumber) {
      const phoneError = validatePhoneNumber(formData.phoneNumber);
      if (phoneError) return `Teléfono: ${phoneError}`;
    }
    
    // WhatsApp is required
    const whatsappError = validatePhoneNumber(formData.whatsappNumber);
    if (whatsappError) return `WhatsApp: ${whatsappError}`;
    
    return null;
  };

  const validateStep3 = () => {
    if (!formData.username.trim()) return 'El nombre de usuario es requerido';
    if (!isValidUsername(formData.username)) return formatUsernameError(formData.username);
    if (!usernameAvailable) return 'Este nombre de usuario no está disponible';
    return null;
  };

  const handleNext = async () => {
    setError(null);

    if (step === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
      // Sign up user and send OTP
      await initiateSignup();
    } else if (step === 1.5) {
      // Verify OTP
      await verifyEmail();
    } else if (step === 2) {
      const err = validateStep2();
      if (err) { setError(err); return; }
      setStep(3);
    } else if (step === 3) {
      const err = validateStep3();
      if (err) { setError(err); return; }
      setStep(4);
    } else if (step === 4) {
      // Complete registration
      await completeRegistration();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      if (step === 1.5) {
        setStep(1);
      } else {
        setStep((step - 1) as Step);
      }
    }
  };

  const initiateSignup = async () => {
    setLoading(true);
    setError(null);

    try {
      // Create auth user - this sends OTP email
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('No se pudo crear el usuario');

      // Move to OTP verification step
      setStep(1.5);
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!formData.otp || formData.otp.length !== 8) {
        throw new Error('Por favor ingresa el código de 8 dígitos');
      }

      // Verify OTP
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: formData.email,
        token: formData.otp,
        type: 'signup',
      });

      if (verifyError) throw verifyError;
      if (!data.session) throw new Error('No se pudo verificar el código');

      // Success - move to step 2
      setStep(2);
    } catch (err: any) {
      console.error('OTP verification error:', err);
      setError(err.message || 'Código inválido o expirado');
    } finally {
      setLoading(false);
    }
  };

  const completeRegistration = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get current session (user already signed up and verified)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      if (!session || !session.user) throw new Error('No hay sesión activa');

      const userId = session.user.id;

      // 1. Mark invitation as used
      await supabase.rpc('use_invitation_token', {
        invite_token: token,
        user_uuid: userId,
      });

      // 2. Update or create profile (trigger may have already created it)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: formData.email,
          full_name: formData.fullName,
          phone_number: normalizePhoneNumber(formData.phoneNumber),
          whatsapp_number: normalizePhoneNumber(formData.whatsappNumber),
          company_name: formData.companyName,
          username: formData.username.toLowerCase(),
          bio: formData.bio,
          location: formData.location,
          onboarding_completed: true,
          is_visible: true,
        }, { onConflict: 'id' });

      if (profileError) throw profileError;

      // 4. Add agent role
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: userId,
          role: 'agent',
        }, { onConflict: 'user_id,role', ignoreDuplicates: true });

      if (roleError) throw roleError;

      // 5. Create or update subscription (with error handling)
      try {
        const now = new Date();
        const trialEnd = new Date(now);
        trialEnd.setDate(trialEnd.getDate() + trialDays);

        // For users with trial, create subscription with trial status
        // For users without trial, set status to 'none' - they need to subscribe via Stripe
        const subscriptionData = trialDays > 0 
          ? {
              user_id: userId,
              status: 'trialing',
              trial_ends_at: trialEnd.toISOString(),
              plan_type: 'standard',
            }
          : {
              user_id: userId,
              status: 'none', // Will be updated by Stripe webhook after payment
              plan_type: 'none',
            };

        const { error: subError } = await supabase
          .from('subscriptions')
          .upsert(subscriptionData, { onConflict: 'user_id' });

        if (subError) {
          console.warn('Could not create subscription (table may not exist):', subError.message);
        }
      } catch (err) {
        console.warn('Subscription creation skipped:', err);
      }

      // 6. Create or update initial credits (with error handling)
      // Only give credits if they have trial (will get credits after subscription otherwise)
      if (trialDays > 0) {
        try {
          const { error: creditsError } = await supabase
            .from('credits')
            .upsert({
              user_id: userId,
              balance: 0,
              free_credits_remaining: 50, // Monthly free credits
            }, { onConflict: 'user_id' });

          if (creditsError) {
            console.warn('Could not create credits (table may not exist):', creditsError.message);
          }
        } catch (err) {
          console.warn('Credits creation skipped:', err);
        }
      }

      // If no trial, redirect to Stripe checkout
      if (trialDays === 0) {
        try {
          const response = await fetch('/api/stripe/create-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'subscription',
              userId,
            }),
          });

          const data = await response.json();
          
          if (data.url) {
            // Redirect to Stripe checkout
            window.location.href = data.url;
            return; // Don't show success step - they'll come back after payment
          }
        } catch (err) {
          console.error('Error creating checkout session:', err);
          // Fall through to success step if checkout creation fails
        }
      }

      // Success!
      setStep(5);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Error al completar el registro');
    } finally {
      setLoading(false);
    }
  };

  // Loading validation
  if (validatingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-cyan-500 to-blue-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Validando invitación...</p>
        </div>
      </div>
    );
  }

  // Step indicator
  const StepIndicator = () => {
    // Map step 1.5 to display position 1 (same dot as step 1)
    const displayStep = step === 1.5 ? 1 : step > 1.5 ? step - 0.5 : step;
    
    return (
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                s < displayStep
                  ? 'bg-green-500 text-white'
                  : s === Math.floor(displayStep)
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {s < displayStep ? <CheckCircle className="h-5 w-5" /> : s}
            </div>
            {s < 4 && (
              <div
                className={`w-8 h-1 ${
                  s < displayStep ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  // Step 5 - Success
  if (step === 5) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-cyan-500 to-blue-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <PartyPopper className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">¡Bienvenido!</h2>
          <p className="text-gray-600 mb-6">
            Tu cuenta ha sido creada exitosamente
          </p>

          {trialDays > 0 && (
            <div className="bg-green-50 rounded-lg p-4 mb-6">
              <p className="text-green-700 font-medium">
                🎉 Tienes {trialDays} días de prueba gratis
              </p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => onNavigate('/dashboard')}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white py-3 px-4 rounded-lg font-semibold shadow-lg transition-all"
            >
              Ir a mi panel
            </button>
            <button
              onClick={() => onNavigate(`/${formData.username}`)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-medium transition-all"
            >
              Ver mi perfil público
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-cyan-500 to-blue-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <StepIndicator />

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Step 1: Account Creation */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
              Crea tu cuenta
            </h2>
            <p className="text-gray-600 text-center mb-6">
              Ingresa tus credenciales de acceso
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="tu@email.com"
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
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 1.5: Email Verification */}
        {step === 1.5 && (
          <div>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Verifica tu correo
              </h2>
              <p className="text-gray-600">
                Hemos enviado un código de 8 dígitos a <br />
                <span className="font-semibold">{formData.email}</span>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                  Código de verificación
                </label>
                <input
                  type="text"
                  value={formData.otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                    updateField('otp', value);
                  }}
                  className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="00000000"
                  maxLength={8}
                />
                <p className="text-sm text-gray-500 text-center mt-2">
                  Revisa tu bandeja de entrada y spam
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Personal Info */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
              Información personal
            </h2>
            <p className="text-gray-600 text-center mb-6">
              Cuéntanos sobre ti
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre completo
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tu nombre completo"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => updateField('phoneNumber', formatPhoneAsYouType(e.target.value))}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+52 332 183 1999"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Formato: +52 332 183 1999
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WhatsApp <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.whatsappNumber}
                    onChange={(e) => updateField('whatsappNumber', formatPhoneAsYouType(e.target.value))}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+52 332 183 1999"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Requerido. Este número aparecerá en tus propiedades para que te contacten
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Business Info */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
              Información de negocio
            </h2>
            <p className="text-gray-600 text-center mb-6">
              Configura tu perfil de agente
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de usuario
                </label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => updateField('username', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      usernameError
                        ? 'border-red-300'
                        : usernameAvailable
                        ? 'border-green-300'
                        : 'border-gray-300'
                    }`}
                    placeholder="tunombre"
                  />
                  {checkingUsername && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 animate-spin" />
                  )}
                  {!checkingUsername && usernameAvailable && (
                    <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Tu perfil estará en: inmobiliaria-manzanillo.com/{formData.username || 'tunombre'}
                </p>
                {usernameError && (
                  <p className="text-xs text-red-600 mt-1">{usernameError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Empresa (opcional)
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => updateField('companyName', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tu inmobiliaria o empresa"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ubicación
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => updateField('location', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Manzanillo, Colima"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Biografía (opcional)
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <textarea
                    value={formData.bio}
                    onChange={(e) => updateField('bio', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                    placeholder="Cuéntale a tus clientes sobre ti..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Subscription */}
        {step === 4 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
              Suscripción
            </h2>
            <p className="text-gray-600 text-center mb-6">
              Confirma tu plan
            </p>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 mb-6 border border-blue-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-gray-800">Plan Agente</h3>
                <div className="text-right">
                  <span className="text-2xl font-bold text-gray-800">$199</span>
                  <span className="text-gray-600"> MXN/mes</span>
                </div>
              </div>

              <ul className="space-y-2 text-sm text-gray-600 mb-4">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Propiedades ilimitadas
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Perfil público personalizado
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  50 créditos mensuales para IA
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Estadísticas de visitas
                </li>
              </ul>

              {trialDays > 0 && (
                <div className="bg-green-100 rounded-lg p-3 text-center">
                  <p className="text-green-700 font-semibold">
                    🎉 {trialDays} días de prueba gratis
                  </p>
                  <p className="text-sm text-green-600">
                    No se te cobrará hasta que termine el período de prueba
                  </p>
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-gray-800 mb-2">Resumen de tu cuenta:</h4>
              <dl className="text-sm space-y-1">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Email:</dt>
                  <dd className="text-gray-800">{formData.email}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Nombre:</dt>
                  <dd className="text-gray-800">{formData.fullName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Usuario:</dt>
                  <dd className="text-gray-800">@{formData.username}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8">
          {step > 1 ? (
            <button
              onClick={handleBack}
              disabled={loading}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium transition-colors disabled:opacity-50"
            >
              <ArrowLeft className="h-5 w-5" />
              Atrás
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleNext}
            disabled={loading || (step === 3 && !usernameAvailable) || (step === 1.5 && formData.otp.length !== 8)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {step === 1 ? 'Enviando código...' : step === 1.5 ? 'Verificando...' : 'Procesando...'}
              </>
            ) : step === 1 ? (
              <>
                Enviar código
                <Mail className="h-5 w-5" />
              </>
            ) : step === 1.5 ? (
              <>
                Verificar código
                <CheckCircle className="h-5 w-5" />
              </>
            ) : step === 4 ? (
              <>
                {trialDays > 0 ? 'Comenzar prueba gratis' : 'Completar registro'}
                <CheckCircle className="h-5 w-5" />
              </>
            ) : (
              <>
                Siguiente
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
