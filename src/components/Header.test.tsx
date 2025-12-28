import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Header } from './Header';

// Mock the auth context
const mockSignOut = vi.fn();
let mockUser: { id: string } | null = null;

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    signOut: mockSignOut,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'brand.name': 'Real Estate Manzanillo',
        'brand.tagline': 'Your dream home awaits',
        'nav.home': 'Home',
        'nav.properties': 'Properties',
        'nav.dashboard': 'Dashboard',
        'common.login': 'Login',
        'common.logout': 'Logout',
        'common.language': 'Language',
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock('./LanguageSwitcher', () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher">LanguageSwitcher</div>,
}));

describe('Header', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
  });

  describe('Branding', () => {
    it('renders brand name', () => {
      render(<Header onNavigate={mockNavigate} currentPath="/" />);
      
      expect(screen.getByText('Real Estate Manzanillo')).toBeInTheDocument();
    });

    it('renders brand tagline', () => {
      render(<Header onNavigate={mockNavigate} currentPath="/" />);
      
      expect(screen.getByText('Your dream home awaits')).toBeInTheDocument();
    });

    it('navigates to home when logo clicked', () => {
      render(<Header onNavigate={mockNavigate} currentPath="/propiedades" />);
      
      const logo = screen.getByText('Real Estate Manzanillo').closest('button');
      fireEvent.click(logo!);
      
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Navigation', () => {
    it('renders Home link', () => {
      render(<Header onNavigate={mockNavigate} currentPath="/" />);
      
      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    it('renders Properties link', () => {
      render(<Header onNavigate={mockNavigate} currentPath="/" />);
      
      expect(screen.getByText('Properties')).toBeInTheDocument();
    });

    it('highlights current route', () => {
      render(<Header onNavigate={mockNavigate} currentPath="/" />);
      
      const homeLink = screen.getByText('Home').closest('button');
      expect(homeLink).toHaveClass('bg-white');
    });

    it('navigates when nav item clicked', () => {
      render(<Header onNavigate={mockNavigate} currentPath="/" />);
      
      fireEvent.click(screen.getByText('Properties'));
      
      expect(mockNavigate).toHaveBeenCalledWith('/propiedades');
    });
  });

  describe('Language Switcher', () => {
    it('renders language switcher', () => {
      render(<Header onNavigate={mockNavigate} currentPath="/" />);
      
      expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
    });
  });

  describe('Unauthenticated user', () => {
    beforeEach(() => {
      mockUser = null;
    });

    it('renders login button', () => {
      render(<Header onNavigate={mockNavigate} currentPath="/" />);
      
      expect(screen.getByText('Login')).toBeInTheDocument();
    });

    it('does not render dashboard button', () => {
      render(<Header onNavigate={mockNavigate} currentPath="/" />);
      
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    });

    it('navigates to login when login clicked', () => {
      render(<Header onNavigate={mockNavigate} currentPath="/" />);
      
      fireEvent.click(screen.getByText('Login'));
      
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('Authenticated user', () => {
    beforeEach(() => {
      mockUser = { id: 'user-123' };
    });

    it('renders dashboard button', () => {
      render(<Header onNavigate={mockNavigate} currentPath="/" />);
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('renders logout button', () => {
      render(<Header onNavigate={mockNavigate} currentPath="/" />);
      
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    it('does not render login button', () => {
      render(<Header onNavigate={mockNavigate} currentPath="/" />);
      
      expect(screen.queryByText('Login')).not.toBeInTheDocument();
    });

    it('navigates to admin when dashboard clicked', () => {
      render(<Header onNavigate={mockNavigate} currentPath="/" />);
      
      fireEvent.click(screen.getByText('Dashboard'));
      
      expect(mockNavigate).toHaveBeenCalledWith('/admin');
    });

    it('calls signOut when logout clicked', () => {
      render(<Header onNavigate={mockNavigate} currentPath="/" />);
      
      fireEvent.click(screen.getByText('Logout'));
      
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe('Mobile menu', () => {
    it('renders mobile menu toggle button', () => {
      render(<Header onNavigate={mockNavigate} currentPath="/" />);
      
      const menuButton = screen.getByLabelText('Toggle menu');
      expect(menuButton).toBeInTheDocument();
    });

    it('shows mobile menu when toggle clicked', () => {
      render(<Header onNavigate={mockNavigate} currentPath="/" />);
      
      const menuButton = screen.getByLabelText('Toggle menu');
      fireEvent.click(menuButton);
      
      // Menu items should be visible in mobile menu
      const homeItems = screen.getAllByText('Home');
      expect(homeItems.length).toBeGreaterThan(1); // Desktop + Mobile
    });
  });
});
