const API_KEY = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY;
const TRANSLATE_API_URL = 'https://translation.googleapis.com/language/translate/v2';

// In-memory cache to reduce API calls and costs
const translationCache = new Map<string, string>();

// Generate cache key
const getCacheKey = (text: string, targetLang: string, sourceLang: string = 'es'): string => {
  return `${sourceLang}-${targetLang}:${text}`;
};

/**
 * Translate text using Google Cloud Translation API
 * @param text - Text to translate
 * @param targetLang - Target language code (en, es, etc.)
 * @param sourceLang - Source language code (default: es)
 * @returns Translated text or original if translation fails
 */
export async function translateText(
  text: string,
  targetLang: string,
  sourceLang: string = 'es'
): Promise<string> {
  // If target language is same as source, return original
  if (targetLang === sourceLang) {
    return text;
  }

  // If text is empty or null, return as-is
  if (!text || text.trim().length === 0) {
    return text;
  }

  // Check cache first
  const cacheKey = getCacheKey(text, targetLang, sourceLang);
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // If no API key configured, return original text
  if (!API_KEY) {
    console.warn('Google Translate API key not configured');
    return text;
  }

  try {
    const response = await fetch(
      `${TRANSLATE_API_URL}?key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          target: targetLang,
          source: sourceLang,
          format: 'text',
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();
    const translatedText = data.data.translations[0].translatedText;

    // Cache the translation
    translationCache.set(cacheKey, translatedText);

    return translatedText;
  } catch (error) {
    console.error('Translation error:', error);
    // Return original text if translation fails
    return text;
  }
}

/**
 * Translate multiple texts in a single API call (more efficient)
 * @param texts - Array of texts to translate
 * @param targetLang - Target language code
 * @param sourceLang - Source language code (default: es)
 * @returns Array of translated texts
 */
export async function translateBatch(
  texts: string[],
  targetLang: string,
  sourceLang: string = 'es'
): Promise<string[]> {
  // If target language is same as source, return originals
  if (targetLang === sourceLang) {
    return texts;
  }

  // If no API key configured, return original texts
  if (!API_KEY) {
    console.warn('Google Translate API key not configured');
    return texts;
  }

  // Check cache and separate cached vs uncached texts
  const results: string[] = new Array(texts.length);
  const uncachedIndices: number[] = [];
  const uncachedTexts: string[] = [];

  texts.forEach((text, index) => {
    if (!text || text.trim().length === 0) {
      results[index] = text;
      return;
    }

    const cacheKey = getCacheKey(text, targetLang, sourceLang);
    if (translationCache.has(cacheKey)) {
      results[index] = translationCache.get(cacheKey)!;
    } else {
      uncachedIndices.push(index);
      uncachedTexts.push(text);
    }
  });

  // If everything is cached, return results
  if (uncachedTexts.length === 0) {
    return results;
  }

  try {
    const response = await fetch(
      `${TRANSLATE_API_URL}?key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: uncachedTexts,
          target: targetLang,
          source: sourceLang,
          format: 'text',
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();
    const translations = data.data.translations.map((t: any) => t.translatedText);

    // Fill in results and cache translations
    uncachedIndices.forEach((originalIndex, translationIndex) => {
      const translatedText = translations[translationIndex];
      results[originalIndex] = translatedText;
      
      // Cache the translation
      const cacheKey = getCacheKey(uncachedTexts[translationIndex], targetLang, sourceLang);
      translationCache.set(cacheKey, translatedText);
    });

    return results;
  } catch (error) {
    console.error('Batch translation error:', error);
    // Return original texts for uncached items if translation fails
    uncachedIndices.forEach((originalIndex, translationIndex) => {
      results[originalIndex] = uncachedTexts[translationIndex];
    });
    return results;
  }
}

/**
 * Clear translation cache (useful for debugging or memory management)
 */
export function clearTranslationCache(): void {
  translationCache.clear();
}

/**
 * Get cache statistics
 */
export function getTranslationCacheStats() {
  return {
    size: translationCache.size,
    keys: Array.from(translationCache.keys()),
  };
}
