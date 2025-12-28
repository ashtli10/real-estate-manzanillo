import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Footer } from './Footer';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'brand.name': 'Real Estate Manzanillo',
        'brand.tagline': 'Your dream home awaits',
        'footer.description': 'Find your ideal property in Manzanillo',
        'footer.quickLinks': 'Quick Links',
        'footer.neighborhoods': 'Neighborhoods',
        'footer.contact': 'Contact',
        'footer.rights': 'All rights reserved',
        'footer.madeWith': 'Made with',
        'footer.inManzanillo': 'in Manzanillo',
        'nav.home': 'Home',
        'nav.properties': 'Properties',
        'common.forSale': 'For Sale',
        'common.forRent': 'For Rent',
        'common.language': 'Language',
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock('./LanguageSwitcher', () => ({
  LanguageSwitcher: ({ variant }: { variant?: string }) => (
    <div data-testid={`language-switcher-${variant || 'default'}`}>LanguageSwitcher</div>
  ),
}));

describe('Footer', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Branding', () => {
    it('renders brand name', () => {
      render(<Footer onNavigate={mockNavigate} />);
      
      expect(screen.getByText('Real Estate Manzanillo')).toBeInTheDocument();
    });

    it('renders brand tagline', () => {
      render(<Footer onNavigate={mockNavigate} />);
      
      expect(screen.getByText('Your dream home awaits')).toBeInTheDocument();
    });

    it('renders footer description', () => {
      render(<Footer onNavigate={mockNavigate} />);
      
      expect(screen.getByText('Find your ideal property in Manzanillo')).toBeInTheDocument();
    });
  });

  describe('Quick Links', () => {
    it('renders quick links section', () => {
      render(<Footer onNavigate={mockNavigate} />);
      
      expect(screen.getByText('Quick Links')).toBeInTheDocument();
    });

    it('renders home link', () => {
      render(<Footer onNavigate={mockNavigate} />);
      
      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    it('renders properties link', () => {
      render(<Footer onNavigate={mockNavigate} />);
      
      expect(screen.getByText('Properties')).toBeInTheDocument();
    });

    it('renders for sale link', () => {
      render(<Footer onNavigate={mockNavigate} />);
      
      expect(screen.getByText('For Sale')).toBeInTheDocument();
    });

    it('renders for rent link', () => {
      render(<Footer onNavigate={mockNavigate} />);
      
      expect(screen.getByText('For Rent')).toBeInTheDocument();
    });

    it('navigates when quick link clicked', () => {
      render(<Footer onNavigate={mockNavigate} />);
      
      fireEvent.click(screen.getByText('Home'));
      
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('navigates to properties with listing filter', () => {
      render(<Footer onNavigate={mockNavigate} />);
      
      fireEvent.click(screen.getByText('For Sale'));
      
      expect(mockNavigate).toHaveBeenCalledWith('/propiedades?listing=sale');
    });
  });

  describe('Neighborhoods', () => {
    it('renders neighborhoods section', () => {
      render(<Footer onNavigate={mockNavigate} />);
      
      expect(screen.getByText('Neighborhoods')).toBeInTheDocument();
    });

    it('renders Santiago neighborhood', () => {
      render(<Footer onNavigate={mockNavigate} />);
      
      expect(screen.getByText('Santiago')).toBeInTheDocument();
    });

    it('renders Las Brisas neighborhood', () => {
      render(<Footer onNavigate={mockNavigate} />);
      
      expect(screen.getByText('Las Brisas')).toBeInTheDocument();
    });

    it('navigates to properties with location filter when neighborhood clicked', () => {
      render(<Footer onNavigate={mockNavigate} />);
      
      fireEvent.click(screen.getByText('Santiago'));
      
      expect(mockNavigate).toHaveBeenCalledWith('/propiedades?location=Santiago');
    });
  });

  describe('Contact', () => {
    it('renders contact section', () => {
      render(<Footer onNavigate={mockNavigate} />);
      
      expect(screen.getByText('Contact')).toBeInTheDocument();
    });

    it('renders location', () => {
      render(<Footer onNavigate={mockNavigate} />);
      
      expect(screen.getByText('Manzanillo, Colima')).toBeInTheDocument();
    });

    it('renders email link', () => {
      render(<Footer onNavigate={mockNavigate} />);
      
      const emailLink = screen.getByText('info@inmobiliariamanzanillo.com');
      expect(emailLink).toHaveAttribute('href', 'mailto:info@inmobiliariamanzanillo.com');
    });
  });

  describe('Social Links', () => {
    it('renders Facebook link', () => {
      render(<Footer onNavigate={mockNavigate} />);
      
      const facebookLink = screen.getByLabelText('Facebook');
      expect(facebookLink).toHaveAttribute('href', 'https://facebook.com');
      expect(facebookLink).toHaveAttribute('target', '_blank');
    });

    it('renders Instagram link', () => {
      render(<Footer onNavigate={mockNavigate} />);
      
      const instagramLink = screen.getByLabelText('Instagram');
      expect(instagramLink).toHaveAttribute('href', 'https://instagram.com');
      expect(instagramLink).toHaveAttribute('target', '_blank');
    });
  });

  describe('Language Switcher', () => {
    it('renders language switcher with footer variant', () => {
      render(<Footer onNavigate={mockNavigate} />);
      
      expect(screen.getByTestId('language-switcher-footer')).toBeInTheDocument();
    });
  });

  describe('Copyright', () => {
    it('renders current year in copyright', () => {
      render(<Footer onNavigate={mockNavigate} />);
      
      const currentYear = new Date().getFullYear();
      expect(screen.getByText(new RegExp(`${currentYear}`))).toBeInTheDocument();
    });

    it('renders rights reserved text', () => {
      render(<Footer onNavigate={mockNavigate} />);
      
      // The rights text is part of a larger string, use regex to find it
      expect(screen.getByText(/All rights reserved/)).toBeInTheDocument();
    });
  });
});
