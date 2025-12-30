import {
  Sparkles,
  Video,
  Image,
  Wand2,
  Zap,
  Clock,
  CreditCard,
  Play,
  Info,
} from 'lucide-react';
import { useCredits } from '../hooks/useCredits';

interface AIToolsTabProps {
  userId: string;
  onNavigateToBilling: () => void;
}

// Credit costs for AI features
const AI_FEATURE_COSTS = {
  generateFrames: 5,
  regenerateFrames: 5,
  generateVideo: 30,
} as const;

export function AIToolsTab({ userId, onNavigateToBilling }: AIToolsTabProps) {
  const { totalCredits, freeCredits, paidCredits } = useCredits(userId);

  return (
    <div className="max-w-4xl space-y-6">
      {/* Coming Soon Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 bg-amber-400 text-amber-900 text-xs font-bold rounded-full">
              PRÓXIMAMENTE
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            Generador de Videos con IA
          </h2>
          <p className="text-white/80 max-w-xl">
            Crea videos profesionales de tus propiedades usando inteligencia artificial. 
            Perfectos para Instagram, TikTok, Facebook y más.
          </p>
        </div>  
      </div>

      {/* Credits Overview */}
      <div className="bg-card rounded-xl shadow-soft p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground text-lg">Tus Créditos de IA</h3>
          <button
            onClick={onNavigateToBilling}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-colors text-sm"
          >
            <CreditCard className="h-4 w-4" />
            Comprar más
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-foreground">{totalCredits}</p>
            <p className="text-sm text-muted-foreground">Total disponible</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{freeCredits}</p>
            <p className="text-sm text-green-700">Gratis (mensuales)</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{paidCredits}</p>
            <p className="text-sm text-blue-700">Comprados</p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Recibes <strong>50 créditos gratis</strong> cada mes con tu suscripción. 
            Los créditos no utilizados no se acumulan al siguiente mes.
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-card rounded-xl shadow-soft p-6">
        <h3 className="font-semibold text-foreground text-lg mb-6">¿Cómo funciona?</h3>
        
        <div className="space-y-6">
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Image className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-foreground">1. Selecciona una propiedad</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Elige una de tus propiedades publicadas con al menos 3 imágenes de calidad.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Wand2 className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-foreground">2. Genera frames iniciales</h4>
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                  {AI_FEATURE_COSTS.generateFrames} créditos
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                La IA genera 3 frames de alta calidad basados en tus imágenes. 
                Puedes regenerar hasta estar satisfecho.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Video className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-foreground">3. Crea el video final</h4>
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                  {AI_FEATURE_COSTS.generateVideo} créditos
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Genera un video de 24 segundos en formato vertical (9:16), perfecto para 
                redes sociales.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Credit Cost Breakdown */}
      <div className="bg-card rounded-xl shadow-soft p-6">
        <h3 className="font-semibold text-foreground text-lg mb-4">Costo de Créditos</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-foreground">Generar frames</p>
                <p className="text-sm text-muted-foreground">3 frames iniciales</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-primary">{AI_FEATURE_COSTS.generateFrames} créditos</p>
          </div>

          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Zap className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-foreground">Regenerar</p>
                <p className="text-sm text-muted-foreground">Nuevos 3 frames</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-primary">{AI_FEATURE_COSTS.regenerateFrames} créditos</p>
          </div>

          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Video className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-foreground">Video final</p>
                <p className="text-sm text-muted-foreground">24 segundos, 9:16</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-primary">{AI_FEATURE_COSTS.generateVideo} créditos</p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            <strong>Costo total por video:</strong> {AI_FEATURE_COSTS.generateFrames + AI_FEATURE_COSTS.generateVideo} créditos 
            (sin regeneraciones)
          </p>
        </div>
      </div>

      {/* Preview Placeholder */}
      <div className="bg-card rounded-xl shadow-soft p-6">
        <h3 className="font-semibold text-foreground text-lg mb-4">Vista previa</h3>
        
        <div className="aspect-[9/16] max-w-xs mx-auto bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="relative z-10 text-center p-6">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play className="h-8 w-8 text-white/60" />
            </div>
            <p className="text-white/80 text-sm">
              Aquí aparecerá tu video generado
            </p>
            <div className="mt-4 flex items-center gap-2 justify-center text-white/60">
              <Clock className="h-4 w-4" />
              <span className="text-xs">24 segundos • 9:16</span>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-card rounded-xl shadow-soft p-6">
        <h3 className="font-semibold text-foreground text-lg mb-4">Preguntas frecuentes</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-foreground mb-1">
              ¿Cuándo estará disponible?
            </h4>
            <p className="text-sm text-muted-foreground">
              Estamos trabajando para lanzar esta función en las próximas semanas. 
              Recibirás un email cuando esté lista.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-foreground mb-1">
              ¿Qué tipo de videos puedo crear?
            </h4>
            <p className="text-sm text-muted-foreground">
              Videos promocionales verticales (9:16) de 24 segundos, perfectos para 
              Instagram Reels, TikTok, y YouTube Shorts.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-foreground mb-1">
              ¿Mis créditos expiran?
            </h4>
            <p className="text-sm text-muted-foreground">
              Los créditos gratis mensuales se renuevan cada mes. Los créditos comprados 
              no expiran mientras tengas una suscripción activa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
