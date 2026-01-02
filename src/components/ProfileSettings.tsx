import { useState, useEffect, useRef } from 'react';
import {
  User,
  Phone,
  MessageCircle,
  Building2,
  MapPin,
  Globe,
  Camera,
  Loader2,
  Check,
  X,
  ExternalLink,
  AlertCircle,
  Upload,
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import type { Profile, ProfileUpdate } from '../types/user';
import { isValidUsername, formatUsernameError } from '../types/user';
import { validatePhoneNumber, formatPhoneAsYouType, formatPhoneDisplay, normalizePhoneNumber } from '../lib/whatsapp';

interface ProfileSettingsProps {
  userId: string;
  profile: Profile | null;
  onProfileUpdate: (profile: Profile) => void;
  onNavigate: (path: string) => void;
}

export function ProfileSettings({ userId, profile, onProfileUpdate, onNavigate }: ProfileSettingsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<ProfileUpdate>({
    full_name: profile?.full_name || '',
    username: profile?.username || '',
    phone_number: profile?.phone_number || '',
    whatsapp_number: profile?.whatsapp_number || '',
    company_name: profile?.company_name || '',
    bio: profile?.bio || '',
    location: profile?.location || '',
    is_visible: profile?.is_visible ?? true,
  });

  // Username validation state
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  
  // Profile image upload
  const [uploadingImage, setUploadingImage] = useState(false);
  const [currentProfileImage, setCurrentProfileImage] = useState<string | null>(profile?.profile_image || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update form data when profile changes
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        username: profile.username || '',
        phone_number: profile.phone_number || '',
        whatsapp_number: profile.whatsapp_number || '',
        company_name: profile.company_name || '',
        bio: profile.bio || '',
        location: profile.location || '',
        is_visible: profile.is_visible ?? true,
      });
      setCurrentProfileImage(profile.profile_image || null);
    }
  }, [profile]);

  // Check username availability with debounce
  useEffect(() => {
    if (!isEditing) return;
    
    const username = formData.username?.toLowerCase().trim();
    
    // Skip if empty or same as current
    if (!username || username === profile?.username) {
      setUsernameError(null);
      setUsernameAvailable(null);
      return;
    }

    // Validate format first
    const formatError = formatUsernameError(username);
    if (formatError) {
      setUsernameError(formatError);
      setUsernameAvailable(null);
      return;
    }

    // Debounce username availability check
    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .neq('id', userId)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          setUsernameError('Este nombre de usuario ya está en uso');
          setUsernameAvailable(false);
        } else {
          setUsernameError(null);
          setUsernameAvailable(true);
        }
      } catch (err) {
        console.error('Error checking username:', err);
        setUsernameError('Error al verificar disponibilidad');
      } finally {
        setCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.username, isEditing, profile?.username, userId]);

  const handleInputChange = (field: keyof ProfileUpdate, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setError(null);
    setSuccess(false);
  };

  // Handle profile image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten imágenes');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede ser mayor a 5MB');
      return;
    }

    setUploadingImage(true);
    setError(null);

    try {
      // Generate unique filename
      const ext = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${ext}`;
      const filePath = `profiles/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('properties')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('properties')
        .getPublicUrl(filePath);

      const imageUrl = urlData.publicUrl;

      // Update profile with new image URL
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({ profile_image: imageUrl })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update local state
      setCurrentProfileImage(imageUrl);
      onProfileUpdate(data as Profile);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : 'Error al subir la imagen';
      console.error('Error uploading profile image:', err);
      setError(errMessage);
    } finally {
      setUploadingImage(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSave = async () => {
    if (!userId) return;

    // Validate username if changed
    if (formData.username && formData.username !== profile?.username) {
      if (!isValidUsername(formData.username)) {
        setError('El nombre de usuario no es válido');
        return;
      }
      if (usernameAvailable === false) {
        setError('El nombre de usuario no está disponible');
        return;
      }
    }

    // Validate phone numbers (WhatsApp required, phone optional)
    if (formData.phone_number) {
      const phoneError = validatePhoneNumber(formData.phone_number);
      if (phoneError) {
        setError(`Teléfono: ${phoneError}`);
        return;
      }
    }

    const whatsappError = validatePhoneNumber(formData.whatsapp_number || '');
    if (whatsappError) {
      setError(`WhatsApp: ${whatsappError}`);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const newUsername = formData.username?.toLowerCase().trim() || null;
      const oldUsername = profile?.username;
      const usernameChanged = newUsername && oldUsername && newUsername !== oldUsername;

      const updateData: ProfileUpdate = {
        full_name: formData.full_name?.trim() || null,
        username: newUsername,
        phone_number: formData.phone_number ? normalizePhoneNumber(formData.phone_number) : null,
        whatsapp_number: formData.whatsapp_number ? normalizePhoneNumber(formData.whatsapp_number) : null,
        company_name: formData.company_name?.trim() || null,
        bio: formData.bio?.trim() || null,
        location: formData.location?.trim() || null,
        is_visible: formData.is_visible,
      };

      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (updateError) throw updateError;

      // If username changed, update all property slugs
      if (usernameChanged) {
        // Fetch all properties for this user
        const { data: properties, error: fetchError } = await supabase
          .from('properties')
          .select('id, slug')
          .eq('user_id', userId);

        if (fetchError) {
          console.error('Error fetching properties for slug update:', fetchError);
        } else if (properties && properties.length > 0) {
          // Update each property's slug with the new username
          const updates = properties.map((property) => {
            if (!property.slug) return Promise.resolve({ error: null });

            // Replace old username prefix with new username
            const slugParts = property.slug.split('/');
            const propertySlugPart = slugParts.length > 1 ? slugParts.slice(1).join('/') : property.slug;
            const newSlug = `${newUsername}/${propertySlugPart}`;

            return supabase
              .from('properties')
              .update({ slug: newSlug, updated_at: new Date().toISOString() })
              .eq('id', property.id);
          });

          const results = await Promise.all(updates);
          const hasSlugError = results.some((result) => result.error);
          if (hasSlugError) {
            console.error('Error updating some property slugs');
          }
        }
      }

      // Update parent state
      onProfileUpdate(data as Profile);
      setSuccess(true);
      setIsEditing(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : 'Error al guardar el perfil';
      console.error('Error saving profile:', err);
      setError(errMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form to current profile data
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        username: profile.username || '',
        phone_number: profile.phone_number || '',
        whatsapp_number: profile.whatsapp_number || '',
        company_name: profile.company_name || '',
        bio: profile.bio || '',
        location: profile.location || '',
        is_visible: profile.is_visible ?? true,
      });
    }
    setIsEditing(false);
    setError(null);
    setUsernameError(null);
    setUsernameAvailable(null);
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Success message */}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          <Check className="h-5 w-5" />
          <span>Perfil actualizado correctamente</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-card rounded-xl shadow-soft p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-foreground text-lg">Información del perfil</h3>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-colors"
            >
              Editar perfil
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-4 py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || Boolean(usernameError)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Profile Image Section */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {uploadingImage ? (
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                ) : currentProfileImage ? (
                  <img
                    src={currentProfileImage}
                    alt={profile.full_name || 'Profile'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              {/* Camera button - always visible for upload */}
              <button
                type="button"
                onClick={triggerFileInput}
                disabled={uploadingImage}
                className="absolute -bottom-1 -right-1 p-1.5 bg-primary text-primary-foreground rounded-full shadow-md hover:opacity-90 transition-colors disabled:opacity-50"
              >
                {uploadingImage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
            </div>
            <div>
              <p className="font-medium text-foreground">{profile.full_name || 'Sin nombre'}</p>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <button
                type="button"
                onClick={triggerFileInput}
                disabled={uploadingImage}
                className="mt-1 text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Upload className="h-3 w-3" />
                {currentProfileImage ? 'Cambiar foto' : 'Subir foto'}
              </button>
            </div>
          </div>

          <div className="border-t border-border pt-6 space-y-4">
            {/* Full Name */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-start">
              <label className="flex items-center gap-2 text-sm text-muted-foreground sm:pt-2">
                <User className="h-4 w-4" />
                Nombre completo
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.full_name || ''}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  className="sm:col-span-2 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Tu nombre completo"
                />
              ) : (
                <p className="sm:col-span-2 font-medium text-foreground">{profile.full_name || '-'}</p>
              )}
            </div>

            {/* Username */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-start">
              <label className="flex items-center gap-2 text-sm text-muted-foreground sm:pt-2">
                <Globe className="h-4 w-4" />
                Nombre de usuario
              </label>
              {isEditing ? (
                <div className="sm:col-span-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                    <input
                      type="text"
                      value={formData.username || ''}
                      onChange={(e) => handleInputChange('username', e.target.value.toLowerCase())}
                      className={`w-full pl-8 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        usernameError 
                          ? 'border-red-300 focus:ring-red-500' 
                          : usernameAvailable 
                            ? 'border-green-300 focus:ring-green-500' 
                            : 'border-border focus:ring-primary'
                      }`}
                      placeholder="tu_usuario"
                    />
                    {checkingUsername && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {!checkingUsername && usernameAvailable === true && (
                      <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                    )}
                    {!checkingUsername && usernameAvailable === false && (
                      <X className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                    )}
                  </div>
                  {usernameError && (
                    <p className="mt-1 text-sm text-red-500">{usernameError}</p>
                  )}
                  {formData.username && !usernameError && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Tu perfil: habitex.mx/{formData.username}
                    </p>
                  )}
                </div>
              ) : (
                <div className="sm:col-span-2">
                  <p className="font-medium text-foreground">@{profile.username || '-'}</p>
                  {profile.username && (
                    <p className="text-xs text-muted-foreground mt-1">
                      habitex.mx/{profile.username}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Phone Number */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-start">
              <label className="flex items-center gap-2 text-sm text-muted-foreground sm:pt-2">
                <Phone className="h-4 w-4" />
                Teléfono
              </label>
              {isEditing ? (
                <div className="sm:col-span-2">
                  <input
                    type="tel"
                    value={formData.phone_number || ''}
                    onChange={(e) => handleInputChange('phone_number', formatPhoneAsYouType(e.target.value))}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="+52 332 183 1999"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Formato: +52 332 183 1999
                  </p>
                </div>
              ) : (
                <p className="sm:col-span-2 font-medium text-foreground">
                  {profile.phone_number ? formatPhoneDisplay(profile.phone_number) : '-'}
                </p>
              )}
            </div>

            {/* WhatsApp Number */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-start">
              <label className="flex items-center gap-2 text-sm text-muted-foreground sm:pt-2">
                <MessageCircle className="h-4 w-4" />
                WhatsApp <span className="text-red-500">*</span>
              </label>
              {isEditing ? (
                <div className="sm:col-span-2">
                  <input
                    type="tel"
                    value={formData.whatsapp_number || ''}
                    onChange={(e) => handleInputChange('whatsapp_number', formatPhoneAsYouType(e.target.value))}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="+52 332 183 1999"
                    required
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Requerido. Este número aparecerá en tus propiedades para que te contacten
                  </p>
                </div>
              ) : (
                <p className="sm:col-span-2 font-medium text-foreground">
                  {profile.whatsapp_number ? formatPhoneDisplay(profile.whatsapp_number) : '-'}
                </p>
              )}
            </div>

            {/* Company Name */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-start">
              <label className="flex items-center gap-2 text-sm text-muted-foreground sm:pt-2">
                <Building2 className="h-4 w-4" />
                Empresa
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.company_name || ''}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                  className="sm:col-span-2 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Nombre de tu empresa (opcional)"
                />
              ) : (
                <p className="sm:col-span-2 font-medium text-foreground">{profile.company_name || '-'}</p>
              )}
            </div>

            {/* Location */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-start">
              <label className="flex items-center gap-2 text-sm text-muted-foreground sm:pt-2">
                <MapPin className="h-4 w-4" />
                Ubicación
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="sm:col-span-2 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ciudad de México, México"
                />
              ) : (
                <p className="sm:col-span-2 font-medium text-foreground">{profile.location || '-'}</p>
              )}
            </div>

            {/* Bio */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-start">
              <label className="flex items-center gap-2 text-sm text-muted-foreground sm:pt-2">
                Biografía
              </label>
              {isEditing ? (
                <div className="sm:col-span-2">
                  <textarea
                    value={formData.bio || ''}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Cuéntanos sobre ti y tu experiencia en bienes raíces..."
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {(formData.bio?.length || 0)}/500 caracteres
                  </p>
                </div>
              ) : (
                <p className="sm:col-span-2 font-medium text-foreground whitespace-pre-wrap">{profile.bio || '-'}</p>
              )}
            </div>

            {/* Visibility Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                Perfil visible
              </label>
              {isEditing ? (
                <div className="sm:col-span-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleInputChange('is_visible', !formData.is_visible)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.is_visible ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.is_visible ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-muted-foreground">
                    {formData.is_visible ? 'Tu perfil y propiedades son visibles al público' : 'Tu perfil está oculto'}
                  </span>
                </div>
              ) : (
                <div className="sm:col-span-2 flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    profile.is_visible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {profile.is_visible ? 'Visible' : 'Oculto'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Profile Button */}
      {profile.username && (
        <div className="bg-card rounded-xl shadow-soft p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Tu perfil público</h3>
              <p className="text-muted-foreground text-sm mt-1">
                habitex.mx/{profile.username}
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

      {/* Account Information (read-only) */}
      <div className="bg-card rounded-xl shadow-soft p-6">
        <h3 className="font-semibold text-foreground text-lg mb-4">Información de la cuenta</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">Correo electrónico</span>
            <span className="font-medium text-foreground">{profile.email}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">Miembro desde</span>
            <span className="font-medium text-foreground">
              {new Date(profile.created_at).toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">Onboarding</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              profile.onboarding_completed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {profile.onboarding_completed ? 'Completado' : 'Pendiente'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
