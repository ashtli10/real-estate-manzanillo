import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PropertyCard } from './PropertyCard';
import type { Property } from '../types/property';

// Mock formatPrice
vi.mock('../types/property', async () => {
  const actual = await vi.importActual('../types/property');
  return {
    ...actual,
    formatPrice: (price: number | null, currency: string = 'MXN') => {
      if (price === null) return '';
      return `$${price.toLocaleString()} ${currency}`;
    },
  };
});

const createMockProperty = (overrides: Partial<Property> = {}): Property => ({
  id: 'test-1',
  slug: 'test-property',
  title: 'Test Property',
  description: 'A test property description',
  property_type: 'casa',
  property_condition: 'excelente',
  price: 5000000,
  currency: 'MXN',
  is_for_sale: true,
  is_for_rent: false,
  rent_price: null,
  rent_currency: null,
  location_city: 'Manzanillo',
  location_state: 'Colima',
  location_neighborhood: 'Santiago',
  location_address: 'Test Address',
  location_lat: 19.05,
  location_lng: -104.32,
  images: ['https://example.com/image.jpg'],
  videos: [],
  characteristics: [
    { key: 'bedrooms', type: 'number', value: 3 },
    { key: 'bathrooms', type: 'number', value: 2 },
    { key: 'size_total', type: 'number', value: 200 },
    { key: 'parking_spaces', type: 'number', value: 2 },
  ],
  custom_bonuses: [],
  is_featured: false,
  status: 'active',
  show_map: true,
  display_order: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('PropertyCard', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders property title', () => {
      render(<PropertyCard property={createMockProperty()} onNavigate={mockNavigate} />);
      
      expect(screen.getByText('Test Property')).toBeInTheDocument();
    });

    it('renders property location', () => {
      render(<PropertyCard property={createMockProperty()} onNavigate={mockNavigate} />);
      
      expect(screen.getByText(/Santiago, Manzanillo/)).toBeInTheDocument();
    });

    it('renders property image', () => {
      render(<PropertyCard property={createMockProperty()} onNavigate={mockNavigate} />);
      
      const img = screen.getByAltText('Test Property');
      expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
    });

    it('renders fallback image when no images provided', () => {
      render(<PropertyCard property={createMockProperty({ images: [] })} onNavigate={mockNavigate} />);
      
      const img = screen.getByAltText('Test Property');
      expect(img.getAttribute('src')).toContain('pexels');
    });
  });

  describe('Sale property', () => {
    it('shows sale badge', () => {
      render(<PropertyCard property={createMockProperty({ is_for_sale: true })} onNavigate={mockNavigate} />);
      
      expect(screen.getByText(/en venta/i)).toBeInTheDocument();
    });

    it('shows sale price', () => {
      render(<PropertyCard property={createMockProperty({ price: 5000000 })} onNavigate={mockNavigate} />);
      
      expect(screen.getByText(/5,000,000/)).toBeInTheDocument();
    });
  });

  describe('Rent property', () => {
    it('shows rent badge', () => {
      const rentProperty = createMockProperty({
        is_for_sale: false,
        is_for_rent: true,
        price: null,
        rent_price: 15000,
        rent_currency: 'MXN',
      });
      render(<PropertyCard property={rentProperty} onNavigate={mockNavigate} />);
      
      expect(screen.getByText(/en renta/i)).toBeInTheDocument();
    });

    it('shows rent price', () => {
      const rentProperty = createMockProperty({
        is_for_sale: false,
        is_for_rent: true,
        price: null,
        rent_price: 15000,
        rent_currency: 'MXN',
      });
      render(<PropertyCard property={rentProperty} onNavigate={mockNavigate} />);
      
      expect(screen.getByText(/15,000/)).toBeInTheDocument();
    });
  });

  describe('Dual listing (sale and rent)', () => {
    it('shows both badges', () => {
      const dualProperty = createMockProperty({
        is_for_sale: true,
        is_for_rent: true,
        rent_price: 12000,
        rent_currency: 'MXN',
      });
      render(<PropertyCard property={dualProperty} onNavigate={mockNavigate} />);
      
      expect(screen.getByText(/en venta/i)).toBeInTheDocument();
      expect(screen.getByText(/en renta/i)).toBeInTheDocument();
    });
  });

  describe('Characteristics', () => {
    it('displays bedrooms count', () => {
      render(<PropertyCard property={createMockProperty()} onNavigate={mockNavigate} />);
      
      expect(screen.getByText(/3 recámaras/)).toBeInTheDocument();
    });

    it('displays bathrooms count', () => {
      render(<PropertyCard property={createMockProperty()} onNavigate={mockNavigate} />);
      
      expect(screen.getByText(/2 baños/)).toBeInTheDocument();
    });

    it('displays size', () => {
      render(<PropertyCard property={createMockProperty()} onNavigate={mockNavigate} />);
      
      expect(screen.getByText(/200 m²/)).toBeInTheDocument();
    });

    it('displays parking spaces', () => {
      render(<PropertyCard property={createMockProperty()} onNavigate={mockNavigate} />);
      
      expect(screen.getByText(/2 estacionamientos/)).toBeInTheDocument();
    });

    it('hides characteristics with zero value', () => {
      const property = createMockProperty({
        characteristics: [
          { key: 'bedrooms', type: 'number', value: 0 },
        ],
      });
      render(<PropertyCard property={property} onNavigate={mockNavigate} />);
      
      expect(screen.queryByText(/0 recámaras/)).not.toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('navigates to property detail on click', () => {
      render(<PropertyCard property={createMockProperty()} onNavigate={mockNavigate} />);
      
      const card = screen.getByText('Test Property').closest('div');
      fireEvent.click(card!);
      
      expect(mockNavigate).toHaveBeenCalledWith('/propiedad/test-property');
    });
  });
});
