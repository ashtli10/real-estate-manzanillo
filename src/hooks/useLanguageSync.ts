import { useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import i18n from '../i18n';

/**
 * Hook to sync language preference from Supabase profile
 * Should be called in the App component after auth is initialized
 */
export function useLanguageSync(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    const loadLanguagePreference = async () => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('language_preference')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error loading language preference:', error);
          return;
        }

        if (profile?.language_preference && 
            ['en', 'es'].includes(profile.language_preference) &&
            profile.language_preference !== i18n.language?.substring(0, 2)) {
          // Update i18n and localStorage with the profile preference
          i18n.changeLanguage(profile.language_preference);
          localStorage.setItem('language', profile.language_preference);
        }
      } catch (error) {
        console.error('Failed to load language preference:', error);
      }
    };

    loadLanguagePreference();
  }, [userId]);
}
