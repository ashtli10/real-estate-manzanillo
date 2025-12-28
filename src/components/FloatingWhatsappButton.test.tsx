import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FloatingWhatsappButton } from './FloatingWhatsappButton';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'whatsapp.contactUs': 'Contact us via WhatsApp',
        'whatsapp.writeUs': 'Write us on WhatsApp',
        'whatsapp.openWhatsapp': 'Open WhatsApp',
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock('../lib/whatsapp', () => ({
  buildWhatsappUrl: (message: string, phone?: string) => {
    const safePhone = phone || '5213141417309';
    return `https://api.whatsapp.com/send?phone=${safePhone}&text=${encodeURIComponent(message)}`;
  },
}));

describe('FloatingWhatsappButton', () => {
  describe('Rendering', () => {
    it('renders as a link', () => {
      render(<FloatingWhatsappButton message="Hello" />);
      
      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
    });

    it('has correct accessibility label', () => {
      render(<FloatingWhatsappButton message="Hello" />);
      
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('aria-label', 'Contact us via WhatsApp');
    });

    it('has correct title attribute', () => {
      render(<FloatingWhatsappButton message="Hello" />);
      
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('title', 'Write us on WhatsApp');
    });
  });

  describe('WhatsApp URL', () => {
    it('uses default phone number when not provided', () => {
      render(<FloatingWhatsappButton message="Hello" />);
      
      const link = screen.getByRole('link');
      expect(link.getAttribute('href')).toContain('phone=5213141417309');
    });

    it('uses custom phone number when provided', () => {
      render(<FloatingWhatsappButton message="Hello" phone="5213149876543" />);
      
      const link = screen.getByRole('link');
      expect(link.getAttribute('href')).toContain('phone=5213149876543');
    });

    it('includes message in URL', () => {
      render(<FloatingWhatsappButton message="I want more information" />);
      
      const link = screen.getByRole('link');
      expect(link.getAttribute('href')).toContain('I%20want%20more%20information');
    });
  });

  describe('Link behavior', () => {
    it('opens in new tab', () => {
      render(<FloatingWhatsappButton message="Hello" />);
      
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('has security attributes', () => {
      render(<FloatingWhatsappButton message="Hello" />);
      
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Styling', () => {
    it('has fixed positioning', () => {
      render(<FloatingWhatsappButton message="Hello" />);
      
      const link = screen.getByRole('link');
      expect(link).toHaveClass('fixed');
    });

    it('is positioned at bottom right', () => {
      render(<FloatingWhatsappButton message="Hello" />);
      
      const link = screen.getByRole('link');
      expect(link).toHaveClass('bottom-6');
      expect(link).toHaveClass('right-6');
    });

    it('has green background', () => {
      render(<FloatingWhatsappButton message="Hello" />);
      
      const link = screen.getByRole('link');
      expect(link).toHaveClass('bg-green-500');
    });
  });

  describe('Screen reader text', () => {
    it('has screen reader only text', () => {
      render(<FloatingWhatsappButton message="Hello" />);
      
      expect(screen.getByText('Open WhatsApp')).toBeInTheDocument();
    });
  });
});
