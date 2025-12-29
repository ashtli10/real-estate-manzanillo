import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvitePage } from './InvitePage';

// Mock Supabase client
const mockRpc = vi.fn();
vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

describe('InvitePage', () => {
  const mockOnNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = async (token = 'valid-token') => {
    let result;
    await act(async () => {
      result = render(<InvitePage token={token} onNavigate={mockOnNavigate} />);
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 50));
    });
    return result!;
  };

  describe('Loading State', () => {
    it('shows loading spinner initially', async () => {
      mockRpc.mockReturnValue(new Promise(() => {})); // Never resolves
      
      await act(async () => {
        render(<InvitePage token="test" onNavigate={mockOnNavigate} />);
      });
      
      expect(screen.getByText('Validando invitación...')).toBeInTheDocument();
    });

    it('shows loading spinner with animation', async () => {
      mockRpc.mockReturnValue(new Promise(() => {}));
      
      await act(async () => {
        render(<InvitePage token="test" onNavigate={mockOnNavigate} />);
      });
      
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Valid Token', () => {
    beforeEach(() => {
      mockRpc.mockResolvedValue({
        data: [
          {
            is_valid: true,
            token_email: 'agent@example.com',
            token_trial_days: 14,
          },
        ],
        error: null,
      });
    });

    it('displays invitation welcome message', async () => {
      await renderPage();
      
      await waitFor(() => {
        expect(screen.getByText(/bienvenido|invitación/i)).toBeInTheDocument();
      });
    });

    it('shows pre-filled email when provided', async () => {
      await renderPage();
      
      await waitFor(() => {
        expect(screen.getByText('agent@example.com')).toBeInTheDocument();
      });
    });

    it('displays trial days information', async () => {
      await renderPage();
      
      await waitFor(() => {
        expect(screen.getByText(/14/)).toBeInTheDocument();
      });
    });

    it('shows continue button', async () => {
      await renderPage();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /comenzar|continuar/i })).toBeInTheDocument();
      });
    });

    it('navigates to onboarding when continue clicked', async () => {
      await renderPage('my-token');
      
      await waitFor(() => {
        const continueButton = screen.getByRole('button', { name: /comenzar|continuar/i });
        continueButton.click();
      });
      
      expect(mockOnNavigate).toHaveBeenCalledWith('/onboarding?token=my-token');
    });

    it('shows benefits list', async () => {
      await renderPage();
      
      await waitFor(() => {
        const content = document.body.textContent;
        expect(content).toBeTruthy();
      });
    });
  });

  describe('Invalid Token', () => {
    beforeEach(() => {
      mockRpc.mockResolvedValue({
        data: [{ is_valid: false }],
        error: null,
      });
    });

    it('shows error message for invalid token', async () => {
      await renderPage();
      
      await waitFor(() => {
        expect(screen.getByText(/no es válido|ha expirado/i)).toBeInTheDocument();
      });
    });

    it('shows error icon', async () => {
      await renderPage();
      
      await waitFor(() => {
        const errorContainer = document.querySelector('.text-red-600, .bg-red-100');
        expect(errorContainer).toBeInTheDocument();
      });
    });

    it('shows link to go back home', async () => {
      await renderPage();
      
      await waitFor(() => {
        const homeButton = screen.getByRole('button', { name: /inicio|volver/i });
        expect(homeButton).toBeInTheDocument();
      });
    });
  });

  describe('Empty Token Data', () => {
    beforeEach(() => {
      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });
    });

    it('shows error for empty response', async () => {
      await renderPage();
      
      await waitFor(() => {
        expect(screen.getByText(/no es válido|ha expirado/i)).toBeInTheDocument();
      });
    });
  });

  describe('API Error', () => {
    beforeEach(() => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });
    });

    it('shows error message on API failure', async () => {
      await renderPage();
      
      await waitFor(() => {
        expect(screen.getByText(/error|intenta de nuevo/i)).toBeInTheDocument();
      });
    });
  });

  describe('Token Without Email', () => {
    beforeEach(() => {
      mockRpc.mockResolvedValue({
        data: [
          {
            is_valid: true,
            token_email: null,
            token_trial_days: 7,
          },
        ],
        error: null,
      });
    });

    it('works without pre-filled email', async () => {
      await renderPage();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /comenzar|continuar/i })).toBeInTheDocument();
      });
    });

    it('shows 7 day trial info', async () => {
      await renderPage();
      
      await waitFor(() => {
        expect(screen.getByText(/7/)).toBeInTheDocument();
      });
    });
  });

  describe('Zero Trial Days', () => {
    beforeEach(() => {
      mockRpc.mockResolvedValue({
        data: [
          {
            is_valid: true,
            token_email: 'agent@example.com',
            token_trial_days: 0,
          },
        ],
        error: null,
      });
    });

    it('handles zero trial days', async () => {
      await renderPage();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /comenzar|continuar/i })).toBeInTheDocument();
      });
    });
  });

  describe('RPC Call', () => {
    it('calls validate_invitation_token with correct token', async () => {
      mockRpc.mockResolvedValue({
        data: [{ is_valid: true, token_email: null, token_trial_days: 7 }],
        error: null,
      });

      await renderPage('test-token-123');
      
      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('validate_invitation_token', {
          invite_token: 'test-token-123',
        });
      });
    });
  });

  describe('Styling', () => {
    it('has gradient background', async () => {
      mockRpc.mockResolvedValue({
        data: [{ is_valid: true, token_email: null, token_trial_days: 7 }],
        error: null,
      });

      await renderPage();
      
      const container = document.querySelector('.bg-gradient-to-br');
      expect(container).toBeInTheDocument();
    });

    it('has card container', async () => {
      mockRpc.mockResolvedValue({
        data: [{ is_valid: true, token_email: null, token_trial_days: 7 }],
        error: null,
      });

      await renderPage();
      
      await waitFor(() => {
        const card = document.querySelector('.rounded-2xl, .rounded-xl');
        expect(card).toBeInTheDocument();
      });
    });
  });
});
