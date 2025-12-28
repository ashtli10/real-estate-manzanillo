import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LanguageSwitcher } from './LanguageSwitcher';

// Mock the i18n hook
const mockChangeLanguage = vi.fn();
let mockCurrentLanguage = 'en';

vi.mock('../i18n', () => ({
  useLanguage: () => ({
    currentLanguage: mockCurrentLanguage,
    changeLanguage: mockChangeLanguage,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: mockCurrentLanguage },
  }),
}));

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentLanguage = 'en';
  });

  describe('Default (header) variant', () => {
    it('renders EN and ES buttons', () => {
      render(<LanguageSwitcher />);
      
      expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ES' })).toBeInTheDocument();
    });

    it('highlights current language (EN)', () => {
      mockCurrentLanguage = 'en';
      render(<LanguageSwitcher />);
      
      const enButton = screen.getByRole('button', { name: 'EN' });
      expect(enButton).toHaveClass('bg-white');
    });

    it('highlights current language (ES)', () => {
      mockCurrentLanguage = 'es';
      render(<LanguageSwitcher />);
      
      const esButton = screen.getByRole('button', { name: 'ES' });
      expect(esButton).toHaveClass('bg-white');
    });

    it('calls changeLanguage with "en" when EN clicked', () => {
      render(<LanguageSwitcher />);
      
      fireEvent.click(screen.getByRole('button', { name: 'EN' }));
      
      expect(mockChangeLanguage).toHaveBeenCalledWith('en');
    });

    it('calls changeLanguage with "es" when ES clicked', () => {
      render(<LanguageSwitcher />);
      
      fireEvent.click(screen.getByRole('button', { name: 'ES' }));
      
      expect(mockChangeLanguage).toHaveBeenCalledWith('es');
    });
  });

  describe('Compact variant', () => {
    it('renders single toggle button with current language', () => {
      mockCurrentLanguage = 'en';
      render(<LanguageSwitcher variant="compact" />);
      
      const button = screen.getByRole('button');
      // The component uses lowercase 'en' with CSS uppercase transform
      expect(button).toHaveTextContent('en');
    });

    it('toggles from EN to ES when clicked', () => {
      mockCurrentLanguage = 'en';
      render(<LanguageSwitcher variant="compact" />);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(mockChangeLanguage).toHaveBeenCalledWith('es');
    });

    it('toggles from ES to EN when clicked', () => {
      mockCurrentLanguage = 'es';
      render(<LanguageSwitcher variant="compact" />);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(mockChangeLanguage).toHaveBeenCalledWith('en');
    });
  });

  describe('Footer variant', () => {
    it('renders similar to header variant', () => {
      render(<LanguageSwitcher variant="footer" />);
      
      expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ES' })).toBeInTheDocument();
    });
  });
});
