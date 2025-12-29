import { useState } from 'react';
import { Plus, X, Check, ChevronDown, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { 
  CHARACTERISTIC_DEFINITIONS, 
  CHARACTERISTIC_CATEGORY_LABELS,
  type PropertyCharacteristic, 
  type CharacteristicDefinition,
  type CharacteristicCategory 
} from '../../types/property';

// Simple unique ID generator
const generateId = () => `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Re-export the type for PropertyForm
export type Characteristic = PropertyCharacteristic;

interface CharacteristicInputProps {
  characteristics: PropertyCharacteristic[];
  onChange: (characteristics: PropertyCharacteristic[]) => void;
}

// Category emojis for visual distinction
const CATEGORY_EMOJIS: Record<CharacteristicCategory, string> = {
  core: '⭐',
  premium: '🌊',
  outdoor: '🌳',
  spaces: '🏠',
  parking: '🚗',
  kitchen: '🍳',
  climate: '❄️',
  entertainment: '🎬',
  utilities: '⚡',
  technology: '📱',
  security: '🔒',
  building: '🏢',
  rental: '🔑',
  commercial: '🏪',
  accessibility: '♿',
  family: '👨‍👩‍👧‍👦',
};

export function CharacteristicInput({ characteristics, onChange }: CharacteristicInputProps) {
  const { t } = useTranslation();
  const [showSelector, setShowSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Get characteristics that are already added
  const addedKeys = new Set(characteristics.map(c => c.key));

  // Get translated label for a characteristic key
  const getTranslatedLabel = (key: string) => {
    // Try to get translation, fallback to definition label if key not found in translations
    const translated = t(`characteristics.${key}`);
    // If translation returns the key itself (not found), use the original label
    return translated.startsWith('characteristics.') 
      ? CHARACTERISTIC_DEFINITIONS.find(d => d.key === key)?.label || key
      : translated;
  };

  // Get translated category label
  const getTranslatedCategory = (category: CharacteristicCategory) => {
    const translated = t(`characteristicCategories.${category}`);
    return translated.startsWith('characteristicCategories.') 
      ? CHARACTERISTIC_CATEGORY_LABELS[category].label 
      : translated;
  };

  // Filter characteristics based on search (search in both Spanish and translated labels)
  const filteredDefinitions = CHARACTERISTIC_DEFINITIONS.filter(def => {
    if (addedKeys.has(def.key)) return false;
    const translatedLabel = getTranslatedLabel(def.key).toLowerCase();
    const originalLabel = def.label.toLowerCase();
    const query = searchQuery.toLowerCase();
    return translatedLabel.includes(query) || originalLabel.includes(query);
  });

  // Group filtered by category using the category property from definitions
  const groupedFiltered: Partial<Record<CharacteristicCategory, CharacteristicDefinition[]>> = {};
  
  // Get all categories sorted by order
  const sortedCategories = (Object.keys(CHARACTERISTIC_CATEGORY_LABELS) as CharacteristicCategory[])
    .sort((a, b) => CHARACTERISTIC_CATEGORY_LABELS[a].order - CHARACTERISTIC_CATEGORY_LABELS[b].order);
  
  for (const category of sortedCategories) {
    const items = filteredDefinitions.filter(def => def.category === category);
    if (items.length > 0) {
      groupedFiltered[category] = items;
    }
  }

  const addCharacteristic = (def: CharacteristicDefinition) => {
    const newChar: PropertyCharacteristic = {
      id: generateId(),
      key: def.key,
      label: getTranslatedLabel(def.key), // Use translated label
      type: def.type,
      value: def.type === 'boolean' ? true : 1,
      description: '',
    };
    onChange([...characteristics, newChar]);
    setShowSelector(false);
    setSearchQuery('');
  };

  const updateCharacteristic = (id: string, updates: Partial<PropertyCharacteristic>) => {
    onChange(characteristics.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const removeCharacteristic = (id: string) => {
    onChange(characteristics.filter(c => c.id !== id));
  };

  const getDefinition = (key: string) => CHARACTERISTIC_DEFINITIONS.find(d => d.key === key);
  
  // Group added characteristics by category for organized display
  const addedByCategory: Partial<Record<CharacteristicCategory, PropertyCharacteristic[]>> = {};
  characteristics.forEach(char => {
    const def = getDefinition(char.key);
    const category = def?.category || 'core';
    if (!addedByCategory[category]) {
      addedByCategory[category] = [];
    }
    addedByCategory[category].push(char);
  });

  return (
    <div className="space-y-4">
      {/* Added Characteristics - Grouped by Category */}
      {characteristics.length > 0 && (
        <div className="space-y-6">
          {sortedCategories
            .filter(category => (addedByCategory[category]?.length ?? 0) > 0)
            .map(category => {
              const categoryChars = addedByCategory[category] ?? [];
              const emoji = CATEGORY_EMOJIS[category];
              
              return (
                <div key={category} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Category Header */}
                  <div className="bg-gray-50 px-4 py-2 flex items-center gap-2 border-b border-gray-200">
                    <span className="text-lg">{emoji}</span>
                    <span className="font-semibold text-gray-700">{getTranslatedCategory(category)}</span>
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                      {categoryChars.length}
                    </span>
                  </div>
                  
                  {/* Category Items */}
                  <div className="p-3 space-y-2">
                    {categoryChars.map((char) => {
                      return (
                        <div
                          key={char.id}
                          className="relative p-3 rounded-lg border border-gray-200 bg-white transition-all hover:shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              {/* Header with label */}
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium text-gray-800">{getTranslatedLabel(char.key)}</span>
                                {char.type === 'boolean' && (
                                  <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                                    ✓ Incluido
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-3">
                                {/* Value input for numeric types */}
                                {char.type === 'number' && (
                                  <div className="flex items-center gap-1">
                                    <label className="text-xs text-gray-500">Cant:</label>
                                    <button
                                      type="button"
                                      onClick={() => updateCharacteristic(char.id, { value: Math.max(1, (char.value as number) - 1) })}
                                      className="w-7 h-7 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min="1"
                                      value={char.value as number}
                                      onChange={(e) => updateCharacteristic(char.id, { value: Math.max(1, parseInt(e.target.value) || 1) })}
                                      className="w-12 text-center border border-gray-200 rounded py-0.5 text-sm font-semibold"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => updateCharacteristic(char.id, { value: (char.value as number) + 1 })}
                                      className="w-7 h-7 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm"
                                    >
                                      +
                                    </button>
                                  </div>
                                )}
                                
                                {/* Description input */}
                                <div className="flex-1 min-w-[200px]">
                                  <input
                                    type="text"
                                    value={char.description || ''}
                                    onChange={(e) => updateCharacteristic(char.id, { description: e.target.value })}
                                    placeholder="Descripción opcional..."
                                    className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded bg-gray-50 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                              </div>
                            </div>
                            
                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={() => removeCharacteristic(char.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Add Button */}
      <button
        type="button"
        onClick={() => setShowSelector(!showSelector)}
        className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2"
      >
        <Plus className="h-5 w-5" />
        <span>Agregar característica</span>
      </button>

      {/* Characteristic Selector Modal */}
      {showSelector && (
        <div className="border border-gray-200 rounded-xl bg-white shadow-lg overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar característica..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* Categories */}
          <div className="max-h-80 overflow-y-auto">
            {(Object.keys(groupedFiltered) as CharacteristicCategory[]).map((category) => {
              const items = groupedFiltered[category] ?? [];
              const emoji = CATEGORY_EMOJIS[category];
              
              return (
                <div key={category} className="border-b border-gray-100 last:border-0">
                  <button
                    type="button"
                    onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-gray-700">
                      <span className="mr-2">{emoji}</span>
                      {getTranslatedCategory(category)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {items.length}
                      </span>
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expandedCategory === category ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  
                  {expandedCategory === category && (
                    <div className="px-2 pb-2 grid grid-cols-1 gap-1">
                      {items.map((def) => (
                        <button
                          key={def.key}
                          type="button"
                          onClick={() => addCharacteristic(def)}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-left transition-colors group"
                        >
                          <div className="p-1.5 rounded-md bg-gray-100">
                            <Check className="h-4 w-4 opacity-0 group-hover:opacity-100 text-green-600 transition-opacity" />
                          </div>
                          <div className="flex-1">
                            <span className="text-sm text-gray-700">{getTranslatedLabel(def.key)}</span>
                            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${def.type === 'boolean' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                              {def.type === 'boolean' ? 'Sí/No' : 'Cantidad'}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {Object.keys(groupedFiltered).length === 0 && (
              <div className="p-8 text-center text-gray-500">
                {searchQuery ? 'No se encontraron características' : 'Todas las características han sido agregadas'}
              </div>
            )}
          </div>

          {/* Close */}
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={() => {
                setShowSelector(false);
                setSearchQuery('');
              }}
              className="w-full py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Help text */}
      {characteristics.length === 0 && !showSelector && (
        <p className="text-sm text-gray-500 text-center">
          Agrega características como terrazas, sistema de alarma, alberca, etc. 
          Puedes incluir descripciones para destacar detalles especiales.
        </p>
      )}
    </div>
  );
}
