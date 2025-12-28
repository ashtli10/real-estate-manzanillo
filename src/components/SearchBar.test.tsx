import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchBar, SearchFilters } from './SearchBar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'landing.hero.searchPlaceholder': 'Search properties...',
        'landing.search.searchButton': 'Search',
        'common.search': 'Search',
        'properties.filters.all': 'All',
        'propertyTypes.casa': 'House',
        'propertyTypes.departamento': 'Apartment',
        'propertyTypes.terreno': 'Land',
        'propertyTypes.local': 'Commercial',
        'propertyTypes.oficina': 'Office',
        'neighborhoods.all': 'All locations',
        'neighborhoods.santiago': 'Santiago',
        'neighborhoods.salahua': 'Salahua',
        'common.forSale': 'For Sale',
        'common.forRent': 'For Rent',
        'common.all': 'All',
        'properties.filters.propertyType': 'Property Type',
        'properties.filters.location': 'Location',
        'properties.filters.listingType': 'Listing Type',
        'properties.filters.forSale': 'For Sale',
        'properties.filters.forRent': 'For Rent',
      };
      return translations[key] || key;
    },
  }),
}));

describe('SearchBar', () => {
  const mockOnSearch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Hero variant', () => {
    it('renders search input', () => {
      render(<SearchBar onSearch={mockOnSearch} variant="hero" />);
      
      expect(screen.getByPlaceholderText('Search properties...')).toBeInTheDocument();
    });

    it('renders search button', () => {
      render(<SearchBar onSearch={mockOnSearch} variant="hero" />);
      
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    });

    it('updates query when typing', () => {
      render(<SearchBar onSearch={mockOnSearch} variant="hero" />);
      
      const input = screen.getByPlaceholderText('Search properties...');
      fireEvent.change(input, { target: { value: 'beach house' } });
      
      expect(input).toHaveValue('beach house');
    });

    it('calls onSearch with filters when submit button clicked', async () => {
      render(<SearchBar onSearch={mockOnSearch} variant="hero" />);
      
      const input = screen.getByPlaceholderText('Search properties...');
      fireEvent.change(input, { target: { value: 'beach villa' } });
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      fireEvent.click(searchButton);
      
      expect(mockOnSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'beach villa',
        })
      );
    });

    it('calls onSearch when Enter is pressed', () => {
      render(<SearchBar onSearch={mockOnSearch} variant="hero" />);
      
      const input = screen.getByPlaceholderText('Search properties...');
      fireEvent.change(input, { target: { value: 'apartment' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      
      expect(mockOnSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'apartment',
        })
      );
    });

    it('uses initial filters when provided', () => {
      const initialFilters: Partial<SearchFilters> = {
        query: 'luxury',
        propertyType: 'casa',
        listingType: 'sale',
      };
      
      render(<SearchBar onSearch={mockOnSearch} variant="hero" initialFilters={initialFilters} />);
      
      const input = screen.getByPlaceholderText('Search properties...');
      expect(input).toHaveValue('luxury');
    });
  });

  describe('Compact variant', () => {
    it('renders search input', () => {
      render(<SearchBar onSearch={mockOnSearch} variant="compact" />);
      
      expect(screen.getByPlaceholderText('Search properties...')).toBeInTheDocument();
    });

    it('calls onSearch on form submission', () => {
      render(<SearchBar onSearch={mockOnSearch} variant="compact" />);
      
      const input = screen.getByPlaceholderText('Search properties...');
      fireEvent.change(input, { target: { value: 'condo' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      
      expect(mockOnSearch).toHaveBeenCalled();
    });
  });

  describe('Filter defaults', () => {
    it('has default values for all filters', () => {
      render(<SearchBar onSearch={mockOnSearch} variant="hero" />);
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      fireEvent.click(searchButton);
      
      expect(mockOnSearch).toHaveBeenCalledWith({
        query: '',
        propertyType: 'all',
        listingType: 'all',
        location: 'all',
      });
    });
  });
});
