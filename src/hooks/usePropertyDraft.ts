import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../integrations/supabase/client';
import type { PropertyInsert } from '../types/property';
import type { Json } from '../integrations/supabase/types';

interface PropertyDraft {
  id: string;
  user_id: string;
  property_id: string | null;
  form_data: PropertyInsert;
  current_step: string;
  ai_text: string | null;
  created_at: string;
  updated_at: string;
}

interface UsePropertyDraftOptions {
  userId: string | undefined;
  propertyId?: string | null; // Set when editing an existing property
}

const DEFAULT_FORM_DATA: PropertyInsert = {
  title: '',
  slug: '',
  description: '',
  price: null,
  currency: 'MXN',
  is_for_sale: true,
  is_for_rent: false,
  rent_price: null,
  rent_currency: 'MXN',
  location_city: '',
  location_state: '',
  location_neighborhood: '',
  location_address: '',
  location_lat: null,
  location_lng: null,
  property_type: 'casa',
  custom_bonuses: [],
  images: [],
  videos: [],
  is_featured: false,
  status: 'active',
  display_order: 0,
  show_map: true,
  characteristics: [],
};

export function usePropertyDraft({ userId, propertyId = null }: UsePropertyDraftOptions) {
  const [draft, setDraft] = useState<PropertyDraft | null>(null);
  const [formData, setFormData] = useState<PropertyInsert>(DEFAULT_FORM_DATA);
  const [currentStep, setCurrentStep] = useState<string>('basic');
  const [aiText, setAiText] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
  // Debounce timer ref
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');

  // Load existing draft or create new one
  const loadDraft = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      // Check for existing draft
      let query = supabase
        .from('property_drafts')
        .select('*')
        .eq('user_id', userId);
      
      if (propertyId) {
        query = query.eq('property_id', propertyId);
      } else {
        query = query.is('property_id', null);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error('Error loading draft:', error);
        setLoading(false);
        setInitialized(true);
        return;
      }

      if (data) {
        const draftData = data as unknown as PropertyDraft;
        setDraft(draftData);
        setFormData(draftData.form_data || DEFAULT_FORM_DATA);
        setCurrentStep(draftData.current_step || 'basic');
        setAiText(draftData.ai_text || '');
        lastSavedRef.current = JSON.stringify(draftData.form_data);
      }
    } catch (err) {
      console.error('Error loading draft:', err);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [userId, propertyId]);

  // Initialize on mount
  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  // Save draft to database
  const saveDraft = useCallback(async (
    data: PropertyInsert, 
    step: string, 
    text: string,
    force = false
  ) => {
    if (!userId || !initialized) return;
    
    // Check if there are actual changes
    const dataString = JSON.stringify(data);
    if (!force && dataString === lastSavedRef.current) {
      return;
    }

    setSaving(true);
    try {
      const draftPayload = {
        user_id: userId,
        property_id: propertyId || null,
        form_data: data as unknown as Json,
        current_step: step,
        ai_text: text || null,
      };

      if (draft?.id) {
        // Update existing draft
        const { error } = await supabase
          .from('property_drafts')
          .update(draftPayload)
          .eq('id', draft.id);

        if (error) throw error;
      } else {
        // Create new draft
        const { data: newDraft, error } = await supabase
          .from('property_drafts')
          .upsert(draftPayload, {
            onConflict: 'user_id,property_id',
          })
          .select()
          .single();

        if (error) throw error;
        if (newDraft) {
          setDraft(newDraft as unknown as PropertyDraft);
        }
      }
      
      lastSavedRef.current = dataString;
    } catch (err) {
      console.error('Error saving draft:', err);
    } finally {
      setSaving(false);
    }
  }, [userId, propertyId, draft?.id, initialized]);

  // Debounced auto-save when form data changes
  useEffect(() => {
    if (!initialized) return;
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(() => {
      saveDraft(formData, currentStep, aiText);
    }, 1500); // 1.5 second debounce

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData, currentStep, aiText, saveDraft, initialized]);

  // Delete draft
  const deleteDraft = useCallback(async () => {
    if (!draft?.id) return;

    try {
      const { error } = await supabase
        .from('property_drafts')
        .delete()
        .eq('id', draft.id);

      if (error) throw error;
      setDraft(null);
    } catch (err) {
      console.error('Error deleting draft:', err);
    }
  }, [draft?.id]);

  // Reset to default state
  const resetDraft = useCallback(() => {
    setFormData(DEFAULT_FORM_DATA);
    setCurrentStep('basic');
    setAiText('');
    deleteDraft();
  }, [deleteDraft]);

  // Update a single field
  const updateField = useCallback(<K extends keyof PropertyInsert>(
    key: K, 
    value: PropertyInsert[K]
  ) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  // Update multiple fields at once
  const updateFields = useCallback((updates: Partial<PropertyInsert>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  // Force save immediately
  const forceSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await saveDraft(formData, currentStep, aiText, true);
  }, [formData, currentStep, aiText, saveDraft]);

  // Check if there's an existing draft with data
  const hasDraft = Boolean(draft?.id && (
    formData.title || 
    formData.description || 
    formData.images.length > 0
  ));

  return {
    // State
    formData,
    currentStep,
    aiText,
    loading,
    saving,
    hasDraft,
    draftId: draft?.id,
    
    // Setters
    setFormData,
    setCurrentStep,
    setAiText,
    updateField,
    updateFields,
    
    // Actions
    saveDraft: forceSave,
    deleteDraft,
    resetDraft,
    loadDraft,
  };
}
