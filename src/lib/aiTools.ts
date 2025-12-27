/**
 * AI Tools Configuration
 * Defines available AI tools and their credit costs
 */

import { FileText, Image, DollarSign, Box, type LucideIcon } from 'lucide-react';

export interface AITool {
  id: string;
  name: string;
  description: string;
  creditCost: number;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

export const AI_TOOLS: AITool[] = [
  {
    id: 'generate_description',
    name: 'Generar descripción',
    description: 'La IA crea una descripción atractiva y profesional para tu propiedad',
    creditCost: 2,
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    id: 'enhance_photos',
    name: 'Mejorar fotos',
    description: 'Optimiza la iluminación, colores y calidad de tus fotografías',
    creditCost: 3,
    icon: Image,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    id: 'price_suggestion',
    name: 'Sugerencia de precio',
    description: 'Análisis de mercado con IA para sugerir el precio óptimo',
    creditCost: 5,
    icon: DollarSign,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  {
    id: 'virtual_tour',
    name: 'Tour virtual',
    description: 'Genera un recorrido 3D interactivo de tu propiedad',
    creditCost: 10,
    icon: Box,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
];
