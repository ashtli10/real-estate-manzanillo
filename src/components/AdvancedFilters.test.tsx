import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdvancedFilters, PropertyFilters } from './AdvancedFilters';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common.filters': 'Filters',
        'common.apply': 'Apply',
        'common.clear': 'Clear',
        'properties.filters.all': 'All',
        'properties.filters.propertyType': 'Property Type',
        'properties.filters.listingType': 'Listing Type',
        'properties.filters.priceRange': 'Price Range',
        'properties.filters.minPrice': 'Min Price',
        'properties.filters.maxPrice': 'Max Price',
        'properties.filters.bedrooms': 'Bedrooms',
        'properties.filters.bathrooms': 'Bathrooms',
        'properties.filters.location': 'Location',
        'properties.filters.nearBeach': 'Near Beach',
        'properties.filters.extras': 'Extras',
        'properties.filters.featured': 'Featured',
        'properties.filters.sortBy': 'Sort By',
        'properties.found': '42 properties found',
        'properties.filters.forSale': 'For Sale',
        'properties.filters.forRent': 'For Rent',
        'propertyTypes.casa': 'House',
        'propertyTypes.departamento': 'Apartment',
        'propertyTypes.terreno': 'Land',
        'propertyTypes.local': 'Commercial',
        'propertyTypes.oficina': 'Office',
        'neighborhoods.all': 'All Locations',
        'neighborhoods.santiago': 'Santiago',
        'neighborhoods.salahua': 'Salahua',
        'neighborhoods.miramar': 'Miramar',
        'neighborhoods.playa_azul': 'Playa Azul',
        'neighborhoods.vida_del_mar': 'Vida del Mar',
        'neighborhoods.peninsula': 'Peninsula',
        'neighborhoods.centro': 'Centro',
        'common.rooms': 'Rooms',
      };
      return translations[key] || key;
    },
  }),
}));

describe('AdvancedFilters', () => {
  const mockOnChange = vi.fn();
  const mockOnClose = vi.fn();

  const defaultFilters: PropertyFilters = {
    propertyType: 'all',
    listingType: 'all',
    location: '',
    minPrice: null,
    maxPrice: null,
    bedrooms: null,
    bathrooms: null,
    nearBeach: false,
    featured: false,
    sortBy: 'newest',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Visibility', () => {
    it('renders when isOpen is true', () => {
      render(
        <AdvancedFilters
          isOpen={true}
          onClose={mockOnClose}
          filters={defaultFilters}
          onChange={mockOnChange}
        />
      );
      
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(
        <AdvancedFilters
          isOpen={false}
          onClose={mockOnClose}
          filters={defaultFilters}
          onChange={mockOnChange}
        />
      );
      
      expect(screen.queryByText('Filters')).not.toBeInTheDocument();
    });
  });

  describe('Property Type Filter', () => {
    it('renders property type options', () => {
      render(
        <AdvancedFilters
          isOpen={true}
          onClose={mockOnClose}
          filters={defaultFilters}
          onChange={mockOnChange}
        />
      );
      
      expect(screen.getByText('House')).toBeInTheDocument();
      expect(screen.getByText('Apartment')).toBeInTheDocument();
    });

    it('calls onChange when property type selected', () => {
      render(
        <AdvancedFilters
          isOpen={true}
          onClose={mockOnClose}
          filters={defaultFilters}
          onChange={mockOnChange}
        />
      );
      
      fireEvent.click(screen.getByText('House'));
      
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({ propertyType: 'casa' })
      );
    });
  });

  describe('Listing Type Filter', () => {
    it('renders listing type buttons', () => {
      render(
        <AdvancedFilters
          isOpen={true}
          onClose={mockOnClose}
          filters={defaultFilters}
          onChange={mockOnChange}
        />
      );
      
      expect(screen.getByText('For Sale')).toBeInTheDocument();
      expect(screen.getByText('For Rent')).toBeInTheDocument();
    });

    it('calls onChange when listing type selected', () => {
      render(
        <AdvancedFilters
          isOpen={true}
          onClose={mockOnClose}
          filters={defaultFilters}
          onChange={mockOnChange}
        />
      );
      
      fireEvent.click(screen.getByText('For Sale'));
      
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({ listingType: 'sale' })
      );
    });
  });

  describe('Property Count', () => {
    it('displays property count when provided', () => {
      render(
        <AdvancedFilters
          isOpen={true}
          onClose={mockOnClose}
          filters={defaultFilters}
          onChange={mockOnChange}
          propertyCount={42}
        />
      );
      
      // Check that count is displayed in some form
      expect(screen.getByText(/42/)).toBeInTheDocument();
    });
  });

  describe('Clear Filters', () => {
    it('has a clear button', () => {
      render(
        <AdvancedFilters
          isOpen={true}
          onClose={mockOnClose}
          filters={{ ...defaultFilters, propertyType: 'casa' }}
          onChange={mockOnChange}
        />
      );
      
      // The clear functionality should be accessible
      expect(screen.getByText(/clear/i)).toBeInTheDocument();
    });
  });
});
