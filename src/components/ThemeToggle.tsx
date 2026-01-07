import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors ${className}`}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      {showLabel && (
        <span className="text-sm font-medium">
          {isDark ? 'Modo claro' : 'Modo oscuro'}
        </span>
      )}
    </button>
  );
}
