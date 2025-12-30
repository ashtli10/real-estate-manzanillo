import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { translateBatch } from '../lib/translate';
import type { Property } from '../types/property';

/**
 * Hook to translate a single property's text fields
 * Translates: title, custom_bonuses (special features)
 */
export function useTranslatedProperty(property: Property | null) {
  const { i18n } = useTranslation();
  const [translatedProperty, setTranslatedProperty] = useState<Property | null>(property);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    const translatePropertyAsync = async () => {
      if (!property) {
        setTranslatedProperty(null);
        return;
      }

      const currentLang = i18n.language;

      // If Spanish, use original (properties are stored in Spanish)
      if (currentLang === 'es') {
        setTranslatedProperty(property);
        return;
      }

      setIsTranslating(true);
      try {
        // Collect all texts to translate
        const textsToTranslate: string[] = [];
        const textMap: { field: string; arrayIndex?: number }[] = [];

        // Title
        textsToTranslate.push(property.title);
        textMap.push({ field: 'title' });

        // Custom bonuses (special features)
        if (property.custom_bonuses && property.custom_bonuses.length > 0) {
          property.custom_bonuses.forEach((bonus, arrayIndex) => {
            textsToTranslate.push(bonus);
            textMap.push({ field: 'custom_bonuses', arrayIndex });
          });
        }

        // Translate all texts in batch
        const translations = await translateBatch(textsToTranslate, currentLang);

        // Apply translations
        const translated = { ...property };
        translated.custom_bonuses = property.custom_bonuses ? [...property.custom_bonuses] : [];

        translations.forEach((translatedText, index) => {
          const mapping = textMap[index];

          if (mapping.field === 'custom_bonuses' && mapping.arrayIndex !== undefined) {
            translated.custom_bonuses![mapping.arrayIndex] = translatedText;
          } else if (mapping.field === 'title') {
            translated.title = translatedText;
          }
        });

        setTranslatedProperty(translated);
      } catch (error) {
        console.error('Translation error:', error);
        setTranslatedProperty(property);
      } finally {
        setIsTranslating(false);
      }
    };

    translatePropertyAsync();
  }, [property, i18n.language]);

  return { translatedProperty, isTranslating };
}

/**
 * Hook to translate an array of properties
 * More efficient - batches all translations together
 */
export function useTranslatedProperties(properties: Property[]) {
  const { i18n } = useTranslation();
  const [translatedProperties, setTranslatedProperties] = useState<Property[]>(properties);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    const translatePropertiesAsync = async () => {
      if (!properties || properties.length === 0) {
        setTranslatedProperties([]);
        return;
      }

      const currentLang = i18n.language;

      // If Spanish, use originals (properties are stored in Spanish)
      if (currentLang === 'es') {
        setTranslatedProperties(properties);
        return;
      }

      setIsTranslating(true);
      try {
        // Collect all texts to translate from all properties
        const textsToTranslate: string[] = [];
        const textMap: { propertyIndex: number; field: string; arrayIndex?: number }[] = [];

        properties.forEach((property, propertyIndex) => {
          // Title
          textsToTranslate.push(property.title);
          textMap.push({ propertyIndex, field: 'title' });

          // Custom bonuses (special features)
          if (property.custom_bonuses && property.custom_bonuses.length > 0) {
            property.custom_bonuses.forEach((bonus, arrayIndex) => {
              textsToTranslate.push(bonus);
              textMap.push({ propertyIndex, field: 'custom_bonuses', arrayIndex });
            });
          }
        });

        // Translate all texts in batch
        const translations = await translateBatch(textsToTranslate, currentLang);

        // Apply translations to copies of properties
        const translatedArr = properties.map(p => ({
          ...p,
          custom_bonuses: p.custom_bonuses ? [...p.custom_bonuses] : []
        }));

        translations.forEach((translatedText, index) => {
          const mapping = textMap[index];
          const prop = translatedArr[mapping.propertyIndex];

          if (mapping.field === 'custom_bonuses' && mapping.arrayIndex !== undefined) {
            prop.custom_bonuses![mapping.arrayIndex] = translatedText;
          } else if (mapping.field === 'title') {
            prop.title = translatedText;
          }
        });

        setTranslatedProperties(translatedArr);
      } catch (error) {
        console.error('Translation error:', error);
        setTranslatedProperties(properties);
      } finally {
        setIsTranslating(false);
      }
    };

    translatePropertiesAsync();
  }, [properties, i18n.language]);

  return { translatedProperties, isTranslating };
}
