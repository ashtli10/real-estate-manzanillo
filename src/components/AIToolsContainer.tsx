import { useState, useEffect } from 'react';
import { Sparkles, Video, ChevronRight } from 'lucide-react';
import { AIToolsTab } from './AIToolsTab';
import { VideoTourTab } from './VideoTourTab';

type AITool = 'video-generator' | 'video-tour';

interface AIToolsContainerProps {
  userId: string;
  onNavigateToBilling: () => void;
  initialTool?: AITool;
}

const TOOL_STORAGE_KEY = 'habitex-last-ai-tool';

export function AIToolsContainer({ userId, onNavigateToBilling, initialTool }: AIToolsContainerProps) {
  // Load last used tool from localStorage, or use initialTool, or default
  const getInitialTool = (): AITool => {
    if (initialTool) return initialTool;
    try {
      const stored = localStorage.getItem(TOOL_STORAGE_KEY);
      if (stored === 'video-generator' || stored === 'video-tour') {
        return stored;
      }
    } catch {
      // localStorage not available
    }
    return 'video-generator';
  };

  const [selectedTool, setSelectedTool] = useState<AITool>(getInitialTool);

  // Save selected tool to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(TOOL_STORAGE_KEY, selectedTool);
    } catch {
      // localStorage not available
    }
  }, [selectedTool]);

  const tools = [
    {
      id: 'video-generator' as AITool,
      name: 'IA Video Generator',
      description: 'Crea videos con avatar IA, voz y guión automatizado',
      icon: Sparkles,
      color: 'from-amber-500/10 via-orange-500/10 to-red-500/10',
      iconBg: 'bg-amber-100 text-amber-600',
    },
    {
      id: 'video-tour' as AITool,
      name: 'Video Tour Generator',
      description: 'Crea video tours con transiciones profesionales',
      icon: Video,
      color: 'from-purple-500/10 via-indigo-500/10 to-blue-500/10',
      iconBg: 'bg-purple-100 text-purple-600',
    },
  ];

  // Render tool selector
  const renderToolSelector = () => (
    <div className="mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isSelected = selectedTool === tool.id;
          
          return (
            <button
              key={tool.id}
              onClick={() => setSelectedTool(tool.id)}
              className={`
                relative flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left
                ${isSelected 
                  ? 'border-primary bg-primary/5 shadow-md' 
                  : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                }
              `}
            >
              <div className={`p-2.5 rounded-lg ${tool.iconBg} flex-shrink-0`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm sm:text-base">{tool.name}</h3>
                  {isSelected && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                      Activo
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-2">
                  {tool.description}
                </p>
              </div>
              <ChevronRight className={`h-5 w-5 flex-shrink-0 transition-transform ${
                isSelected ? 'text-primary rotate-90' : 'text-muted-foreground'
              }`} />
            </button>
          );
        })}
      </div>
    </div>
  );

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

      {/* Tool Selector */}
      {renderToolSelector()}

      {/* Selected Tool Content */}
      <div className="min-h-[400px]">
        {selectedTool === 'video-generator' && (
          <AIToolsTab 
            userId={userId} 
            onNavigateToBilling={onNavigateToBilling}
          />
        )}
        {selectedTool === 'video-tour' && (
          <VideoTourTab 
            userId={userId} 
            onNavigateToBilling={onNavigateToBilling}
          />
        )}
      </div>
    </div>
  );
}
