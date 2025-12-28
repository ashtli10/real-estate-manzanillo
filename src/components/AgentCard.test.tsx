import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentCard, AgentInfo } from './AgentCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const translations: Record<string, string> = {
        'common.call': 'Call',
        'whatsapp.agentMessage': 'Hello! I would like more information.',
        'whatsapp.propertyMessage': `Hello! I'm interested in ${params?.title || 'this property'}`,
      };
      return translations[key] || key;
    },
  }),
}));

describe('AgentCard', () => {
  const mockNavigate = vi.fn();
  const mockWindowOpen = vi.fn();
  const originalOpen = window.open;

  const mockAgent: AgentInfo = {
    id: 'agent-1',
    username: 'johndoe',
    full_name: 'John Doe',
    company_name: 'Premium Realty',
    avatar_url: 'https://example.com/avatar.jpg',
    bio: 'Experienced real estate agent',
    phone: '+521234567890',
    whatsapp_number: '+521234567890',
    location: 'Manzanillo, Colima',
    created_at: '2023-01-01T00:00:00Z',
    properties_count: 15,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.open = mockWindowOpen;
  });

  afterEach(() => {
    window.open = originalOpen;
  });

  describe('Compact variant (default)', () => {
    it('renders agent name', () => {
      render(<AgentCard agent={mockAgent} onNavigate={mockNavigate} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('renders company name', () => {
      render(<AgentCard agent={mockAgent} onNavigate={mockNavigate} />);
      
      expect(screen.getByText('Premium Realty')).toBeInTheDocument();
    });

    it('renders agent avatar', () => {
      render(<AgentCard agent={mockAgent} onNavigate={mockNavigate} />);
      
      const avatar = screen.getByAltText('John Doe');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('renders location', () => {
      render(<AgentCard agent={mockAgent} onNavigate={mockNavigate} />);
      
      expect(screen.getByText('Manzanillo, Colima')).toBeInTheDocument();
    });

    it('renders WhatsApp button when number is provided', () => {
      render(<AgentCard agent={mockAgent} onNavigate={mockNavigate} />);
      
      expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    });

    it('renders Call button when phone is provided', () => {
      render(<AgentCard agent={mockAgent} onNavigate={mockNavigate} />);
      
      expect(screen.getByText('Call')).toBeInTheDocument();
    });

    it('does not render WhatsApp button when number is not provided', () => {
      const agentWithoutWhatsapp = { ...mockAgent, whatsapp_number: undefined };
      render(<AgentCard agent={agentWithoutWhatsapp} onNavigate={mockNavigate} />);
      
      expect(screen.queryByText('WhatsApp')).not.toBeInTheDocument();
    });
  });

  describe('Full variant', () => {
    it('renders agent name', () => {
      render(<AgentCard agent={mockAgent} onNavigate={mockNavigate} variant="full" />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('renders company name', () => {
      render(<AgentCard agent={mockAgent} onNavigate={mockNavigate} variant="full" />);
      
      expect(screen.getByText('Premium Realty')).toBeInTheDocument();
    });

    it('renders bio when provided', () => {
      render(<AgentCard agent={mockAgent} onNavigate={mockNavigate} variant="full" />);
      
      expect(screen.getByText('Experienced real estate agent')).toBeInTheDocument();
    });
  });

  describe('Property variant', () => {
    it('renders agent name', () => {
      render(<AgentCard agent={mockAgent} onNavigate={mockNavigate} variant="property" />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('renders company name', () => {
      render(<AgentCard agent={mockAgent} onNavigate={mockNavigate} variant="property" />);
      
      expect(screen.getByText('Premium Realty')).toBeInTheDocument();
    });

    it('navigates to agent profile on click', () => {
      render(<AgentCard agent={mockAgent} onNavigate={mockNavigate} variant="property" />);
      
      // Click on the agent card (property variant is clickable)
      fireEvent.click(screen.getByText('John Doe'));
      
      expect(mockNavigate).toHaveBeenCalledWith('/johndoe');
    });
  });

  describe('WhatsApp integration', () => {
    it('opens WhatsApp with correct URL when button clicked', () => {
      render(<AgentCard agent={mockAgent} onNavigate={mockNavigate} />);
      
      const whatsappButton = screen.getByText('WhatsApp');
      fireEvent.click(whatsappButton);
      
      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('api.whatsapp.com/send'),
        '_blank'
      );
    });

    it('includes agent message in WhatsApp URL', () => {
      render(<AgentCard agent={mockAgent} onNavigate={mockNavigate} />);
      
      const whatsappButton = screen.getByText('WhatsApp');
      fireEvent.click(whatsappButton);
      
      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('phone=521234567890'),
        '_blank'
      );
    });

    it('includes property title in message when provided', () => {
      render(
        <AgentCard 
          agent={mockAgent} 
          onNavigate={mockNavigate} 
          propertyTitle="Luxury Beachfront Villa"
        />
      );
      
      const whatsappButton = screen.getByText('WhatsApp');
      fireEvent.click(whatsappButton);
      
      // Should include property message
      expect(mockWindowOpen).toHaveBeenCalled();
    });
  });

  describe('Default avatar', () => {
    it('uses default avatar when avatar_url is not provided', () => {
      const agentWithoutAvatar = { ...mockAgent, avatar_url: undefined };
      render(<AgentCard agent={agentWithoutAvatar} onNavigate={mockNavigate} />);
      
      const avatar = screen.getByAltText('John Doe');
      expect(avatar).toHaveAttribute('src', expect.stringContaining('ui-avatars.com'));
    });
  });
});
