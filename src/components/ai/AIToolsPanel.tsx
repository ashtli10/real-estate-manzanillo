/**
 * AI Tools Panel
 * Interactive AI tools that consume credits for property-related tasks
 */

import { useState } from 'react';
import { 
  Sparkles, 
  Loader2,
  Check,
  AlertCircle,
  Copy,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../integrations/supabase/client';
import { AI_TOOLS, type AITool } from '../../lib/aiTools';

interface AIToolsPanelProps {
  propertyId?: string;
  propertyData?: {
    title?: string;
    type?: string;
    bedrooms?: number;
    bathrooms?: number;
    squareMeters?: number;
    location?: string;
    features?: string[];
    price?: number;
  };
  onResult?: (toolId: string, result: string) => void;
}

export function AIToolsPanel({ propertyId, propertyData, onResult }: AIToolsPanelProps) {
  const { credits, refreshCredits } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const totalCredits = (credits?.balance ?? 0) + (credits?.freeCreditsRemaining ?? 0);

  // Deduct credits via Supabase RPC
  const deductCredits = async (toolId: string, amount: number): Promise<boolean> => {
    try {
      // Use raw RPC call to bypass TypeScript strict typing for new functions
      const { error } = await supabase.rpc('deduct_credits' as never, {
        p_amount: amount,
        p_description: `AI Tool: ${toolId}`,
        p_reference_type: 'ai_tool',
        p_reference_id: propertyId || null,
      } as never);

      if (error) {
        console.error('Deduct credits error:', error);
        if (error.message.includes('Insufficient')) {
          setError('No tienes suficientes créditos. ¡Compra más para continuar!');
        } else {
          setError('Error al procesar los créditos');
        }
        return false;
      }

      // Refresh credits after deduction
      await refreshCredits();
      return true;
    } catch (err) {
      console.error('Deduct credits exception:', err);
      setError('Error de conexión');
      return false;
    }
  };

  // Simulate AI processing (in production, this would call actual AI APIs)
  const processAITool = async (toolId: string): Promise<string> => {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));

    switch (toolId) {
      case 'generate_description':
        return generatePropertyDescription();
      case 'enhance_photos':
        return '✅ Fotos mejoradas exitosamente. La iluminación y los colores han sido optimizados. Las imágenes actualizadas se mostrarán en tu propiedad.';
      case 'price_suggestion':
        return generatePriceSuggestion();
      case 'virtual_tour':
        return '🎥 Tour virtual generado. El recorrido 3D estará disponible en 24-48 horas. Te notificaremos cuando esté listo.';
      default:
        return 'Procesamiento completado.';
    }
  };

  const generatePropertyDescription = (): string => {
    const data = propertyData;
    if (!data) {
      return `🏠 **Espectacular propiedad en venta**

Esta hermosa propiedad ofrece el equilibrio perfecto entre comodidad y estilo. Con acabados de primera calidad y una ubicación privilegiada, es ideal para familias que buscan un hogar acogedor.

**Características destacadas:**
• Espacios amplios y luminosos
• Diseño moderno y funcional
• Excelente ubicación con todos los servicios
• Áreas verdes y estacionamiento

¡No pierdas la oportunidad de conocer tu nuevo hogar! Agenda una visita hoy mismo.`;
    }

    const propertyType = data.type || 'propiedad';
    const beds = data.bedrooms ? `${data.bedrooms} recámara${data.bedrooms > 1 ? 's' : ''}` : '';
    const baths = data.bathrooms ? `${data.bathrooms} baño${data.bathrooms > 1 ? 's' : ''}` : '';
    const size = data.squareMeters ? `${data.squareMeters}m² de construcción` : '';
    const location = data.location || 'Manzanillo';
    const features = data.features?.slice(0, 5).join(', ') || 'acabados de lujo';

    return `🏠 **${data.title || `Hermosa ${propertyType} en ${location}`}**

Descubre esta increíble ${propertyType} ubicada en ${location}. ${beds && baths ? `Cuenta con ${beds} y ${baths}` : 'Amplios espacios'}, perfecta para quienes buscan calidad de vida y comodidad.

**Características principales:**
${size ? `• ${size}\n` : ''}${beds ? `• ${beds}\n` : ''}${baths ? `• ${baths}\n` : ''}• ${features}
• Ubicación privilegiada en ${location}

Esta propiedad destaca por su diseño moderno, acabados de primera y la excelente plusvalía de la zona. Ideal tanto para vivir como para inversión.

📞 ¡Agenda tu visita hoy y conoce tu próximo hogar!`;
  };

  const generatePriceSuggestion = (): string => {
    const data = propertyData;
    const basePrice = data?.price || 2500000;
    const minPrice = Math.round(basePrice * 0.92);
    const maxPrice = Math.round(basePrice * 1.08);
    const optimalPrice = Math.round(basePrice * 1.02);

    return `📊 **Análisis de Precio de Mercado**

Basado en propiedades similares en la zona y las condiciones actuales del mercado:

**Rango sugerido:** $${minPrice.toLocaleString()} - $${maxPrice.toLocaleString()} MXN

**Precio óptimo recomendado:** $${optimalPrice.toLocaleString()} MXN

**Factores considerados:**
• Ubicación y plusvalía de la zona
• Características y amenidades
• Precios de propiedades comparables
• Tendencias del mercado actual

**Recomendación:** ${optimalPrice > basePrice 
  ? 'Tu precio actual está ligeramente por debajo del mercado. Considera aumentarlo para maximizar tu retorno.'
  : 'Tu precio actual es competitivo. Podrías considerar una ligera reducción para una venta más rápida.'}

_Este análisis se basa en datos de mercado simulados. Consulta con un valuador profesional para una evaluación completa._`;
  };

  const handleUseTool = async (tool: AITool) => {
    if (totalCredits < tool.creditCost) {
      setError(`Necesitas ${tool.creditCost} créditos para usar esta herramienta. Tienes ${totalCredits}.`);
      return;
    }

    setLoading(tool.id);
    setError(null);

    try {
      // First deduct credits
      const success = await deductCredits(tool.id, tool.creditCost);
      if (!success) {
        setLoading(null);
        return;
      }

      // Then process with AI
      const result = await processAITool(tool.id);
      setResults(prev => ({ ...prev, [tool.id]: result }));
      onResult?.(tool.id, result);
    } catch (err) {
      console.error('AI tool error:', err);
      setError('Error al procesar. Por favor intenta de nuevo.');
    } finally {
      setLoading(null);
    }
  };

  const handleCopy = async (text: string, toolId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(toolId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleRegenerate = async (tool: AITool) => {
    // Clear previous result and regenerate
    setResults(prev => {
      const next = { ...prev };
      delete next[tool.id];
      return next;
    });
    await handleUseTool(tool);
  };

  return (
    <div className="space-y-6">
      {/* Credits Balance */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-amber-500" />
          <div>
            <p className="text-sm text-amber-700">Créditos disponibles</p>
            <p className="text-2xl font-bold text-gray-900">{totalCredits}</p>
          </div>
        </div>
        {totalCredits < 10 && (
          <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
            Créditos bajos
          </span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="text-sm text-red-600 hover:text-red-800 mt-1"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Tools Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {AI_TOOLS.map((tool) => {
          const hasResult = !!results[tool.id];
          const isLoading = loading === tool.id;
          const canAfford = totalCredits >= tool.creditCost;

          return (
            <div
              key={tool.id}
              className={`rounded-xl border-2 transition-all ${
                hasResult 
                  ? 'border-green-200 bg-green-50' 
                  : canAfford 
                  ? 'border-gray-200 bg-white hover:border-sky-300' 
                  : 'border-gray-100 bg-gray-50 opacity-60'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg ${tool.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <tool.icon className={`h-6 w-6 ${tool.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">{tool.name}</h4>
                      {hasResult && <Check className="h-4 w-4 text-green-600" />}
                    </div>
                    <p className="text-sm text-gray-500 mb-3">{tool.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${tool.color}`}>
                        {tool.creditCost} créditos
                      </span>
                      
                      {hasResult ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCopy(results[tool.id], tool.id)}
                            className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-100 flex items-center gap-1"
                          >
                            {copiedId === tool.id ? (
                              <>
                                <Check className="h-3 w-3" /> Copiado
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" /> Copiar
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleRegenerate(tool)}
                            disabled={isLoading || !canAfford}
                            className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-100 flex items-center gap-1 disabled:opacity-50"
                          >
                            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                            Regenerar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleUseTool(tool)}
                          disabled={isLoading || !canAfford}
                          className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 ${
                            canAfford 
                              ? 'bg-sky-600 text-white hover:bg-sky-700' 
                              : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Procesando...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4" />
                              Usar
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Result display */}
              {hasResult && (
                <div className="border-t border-green-200 p-4 bg-white rounded-b-xl">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                    {results[tool.id]}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info note */}
      <p className="text-xs text-gray-500 text-center">
        Los créditos se deducen al usar cada herramienta. Los resultados son generados por IA y pueden requerir ajustes manuales.
      </p>
    </div>
  );
}
