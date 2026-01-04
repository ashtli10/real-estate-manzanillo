import { Sparkles } from 'lucide-react';
import { AIToolsTab } from './AIToolsTab';

interface AIToolsContainerProps {
  userId: string;
  onNavigateToBilling: () => void;
}

export function AIToolsContainer({ userId, onNavigateToBilling }: AIToolsContainerProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 rounded-xl p-4 sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="p-2 sm:p-3 rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold">Herramientas IA</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Genera contenido profesional para tus propiedades usando inteligencia artificial.
            </p>
          </div>
        </div>
      </div>

      {/* AI Video Generator */}
      <div className="min-h-[400px]">
        <AIToolsTab 
          userId={userId} 
          onNavigateToBilling={onNavigateToBilling}
        />
      </div>
    </div>
  );
}
