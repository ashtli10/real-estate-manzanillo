import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateInvitationModal } from './CreateInvitationModal';

describe('CreateInvitationModal', () => {
  const mockOnClose = vi.fn();
  const mockOnCreate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnCreate.mockResolvedValue(undefined);
  });

  const renderModal = (loading = false) => {
    return render(
      <CreateInvitationModal
        onClose={mockOnClose}
        onCreate={mockOnCreate}
        loading={loading}
      />
    );
  };

  describe('Rendering', () => {
    it('renders modal with title', () => {
      renderModal();
      expect(screen.getByText('Crear Invitación')).toBeInTheDocument();
    });

    it('renders email input field', () => {
      renderModal();
      expect(screen.getByPlaceholderText('agente@ejemplo.com')).toBeInTheDocument();
    });

    it('renders trial days dropdown', () => {
      renderModal();
      expect(screen.getByText('Días de prueba')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('renders expiration days input', () => {
      renderModal();
      expect(screen.getByText('Días hasta expiración')).toBeInTheDocument();
    });

    it('renders notes textarea', () => {
      renderModal();
      expect(screen.getByText('Notas')).toBeInTheDocument();
    });

    it('renders create button', () => {
      renderModal();
      expect(screen.getByRole('button', { name: /crear invitación/i })).toBeInTheDocument();
    });

    it('renders close button', () => {
      renderModal();
      const closeButtons = screen.getAllByRole('button');
      expect(closeButtons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Trial Days Options', () => {
    it('has option for no trial', () => {
      renderModal();
      expect(screen.getByText('Sin prueba (pago inmediato)')).toBeInTheDocument();
    });

    it('has option for 7 day trial', () => {
      renderModal();
      expect(screen.getByText('7 días')).toBeInTheDocument();
    });

    it('has option for 14 day trial', () => {
      renderModal();
      expect(screen.getByText('14 días')).toBeInTheDocument();
    });

    it('has option for 30 day trial', () => {
      renderModal();
      expect(screen.getByText('30 días')).toBeInTheDocument();
    });

    it('has option for 60 day trial', () => {
      renderModal();
      expect(screen.getByText('60 días')).toBeInTheDocument();
    });

    it('has option for 90 day trial', () => {
      renderModal();
      expect(screen.getByText('90 días')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('calls onCreate with form data when submitted', async () => {
      renderModal();

      // Fill in email
      const emailInput = screen.getByPlaceholderText('agente@ejemplo.com');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /crear invitación/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledTimes(1);
      });

      const callArgs = mockOnCreate.mock.calls[0][0];
      expect(callArgs.email).toBe('test@example.com');
      expect(callArgs.trial_days).toBe(7); // Default value
      expect(callArgs.expires_at).toBeDefined();
      expect(callArgs.notes).toBe('');
    });

    it('sends null email when email field is empty', async () => {
      renderModal();

      // Submit without email
      const submitButton = screen.getByRole('button', { name: /crear invitación/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledTimes(1);
      });

      const callArgs = mockOnCreate.mock.calls[0][0];
      expect(callArgs.email).toBeNull();
    });

    it('includes notes when provided', async () => {
      renderModal();

      // Fill in notes
      const notesInput = screen.getByPlaceholderText('Notas internas sobre esta invitación...');
      fireEvent.change(notesInput, { target: { value: 'VIP agent' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /crear invitación/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledTimes(1);
      });

      const callArgs = mockOnCreate.mock.calls[0][0];
      expect(callArgs.notes).toBe('VIP agent');
    });

    it('calculates expiration date correctly', async () => {
      renderModal();

      // Set expiration to 14 days
      const expirationInput = screen.getByDisplayValue('7');
      fireEvent.change(expirationInput, { target: { value: '14' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /crear invitación/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledTimes(1);
      });

      const callArgs = mockOnCreate.mock.calls[0][0];
      const expiresAt = new Date(callArgs.expires_at);
      const now = new Date();
      const daysDiff = Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      expect(daysDiff).toBeGreaterThanOrEqual(13);
      expect(daysDiff).toBeLessThanOrEqual(14);
    });
  });

  describe('Close Button', () => {
    it('calls onClose when close button clicked', () => {
      renderModal();

      // Find the X button in the header
      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find(btn => btn.querySelector('svg'));
      
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('Loading State', () => {
    it('disables submit button when loading', () => {
      renderModal(true);

      const submitButton = screen.getByRole('button', { name: /creando/i });
      expect(submitButton).toBeDisabled();
    });

    it('shows loading text when loading', () => {
      renderModal(true);
      expect(screen.getByText(/creando/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('accepts valid email format', async () => {
      renderModal();

      const emailInput = screen.getByPlaceholderText('agente@ejemplo.com');
      fireEvent.change(emailInput, { target: { value: 'valid@email.com' } });

      const submitButton = screen.getByRole('button', { name: /crear invitación/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalled();
      });
    });

    it('trims whitespace from email', async () => {
      renderModal();

      const emailInput = screen.getByPlaceholderText('agente@ejemplo.com');
      fireEvent.change(emailInput, { target: { value: '  test@example.com  ' } });

      const submitButton = screen.getByRole('button', { name: /crear invitación/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledTimes(1);
      });

      const callArgs = mockOnCreate.mock.calls[0][0];
      expect(callArgs.email).toBe('test@example.com');
    });

    it('trims whitespace from notes', async () => {
      renderModal();

      const notesInput = screen.getByPlaceholderText('Notas internas sobre esta invitación...');
      fireEvent.change(notesInput, { target: { value: '  Some notes  ' } });

      const submitButton = screen.getByRole('button', { name: /crear invitación/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledTimes(1);
      });

      const callArgs = mockOnCreate.mock.calls[0][0];
      expect(callArgs.notes).toBe('Some notes');
    });
  });

  describe('Accessibility', () => {
    it('has proper form structure', () => {
      renderModal();
      expect(screen.getByRole('form') || document.querySelector('form')).toBeTruthy();
    });

    it('has labels for inputs', () => {
      renderModal();
      expect(screen.getByText('Email (opcional)')).toBeInTheDocument();
      expect(screen.getByText('Días de prueba')).toBeInTheDocument();
      expect(screen.getByText('Días hasta expiración')).toBeInTheDocument();
      expect(screen.getByText('Notas')).toBeInTheDocument();
    });
  });
});
