/**
 * Breadcrumb navigation component for improved SEO and UX
 */

import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate: (path: string) => void;
}

export function Breadcrumb({ items, onNavigate }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center space-x-2 text-sm">
        <li>
          <button
            onClick={() => onNavigate('/')}
            className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
            aria-label="Ir a inicio"
          >
            <Home className="h-4 w-4" />
          </button>
        </li>
        {items.map((item, index) => (
          <li key={index} className="flex items-center space-x-2">
            <ChevronRight className="h-4 w-4 text-gray-400" />
            {item.path && index < items.length - 1 ? (
              <button
                onClick={() => onNavigate(item.path!)}
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                {item.label}
              </button>
            ) : (
              <span className="text-gray-800 font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
