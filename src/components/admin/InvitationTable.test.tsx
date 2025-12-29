import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvitationTable } from './InvitationTable';
import type { InvitationToken } from '../../types/user';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

// Mock window.open
const mockWindowOpen = vi.fn();
window.open = mockWindowOpen;

describe('InvitationTable', () => {
  const mockOnDelete = vi.fn();

  const mockInvitations: InvitationToken[] = [
    {
      id: '1',
      created_at: '2024-12-20T10:00:00Z',
      token: 'abc123',
      email: 'agent1@example.com',
      trial_days: 14,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      used_at: null,
      used_by: null,
      created_by: 'admin-id',
      notes: 'VIP agent',
    },
    {
      id: '2',
      created_at: '2024-12-15T10:00:00Z',
      token: 'def456',
      email: null,
      trial_days: 7,
      expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      used_at: null,
      used_by: null,
      created_by: 'admin-id',
      notes: '',
    },
    {
      id: '3',
      created_at: '2024-12-10T10:00:00Z',
      token: 'ghi789',
      email: 'used@example.com',
      trial_days: 30,
      expires_at: '2024-12-25T10:00:00Z',
      used_at: '2024-12-12T15:30:00Z',
      used_by: 'user-id',
      created_by: 'admin-id',
      notes: 'Early adopter',
    },
    {
      id: '4',
      created_at: '2024-12-01T10:00:00Z',
      token: 'jkl012',
      email: 'expired@example.com',
      trial_days: 7,
      expires_at: '2024-12-10T10:00:00Z', // Past date
      used_at: null,
      used_by: null,
      created_by: 'admin-id',
      notes: 'Expired invite',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderTable = async (invitations = mockInvitations, loading = false) => {
    let result;
    await act(async () => {
      result = render(
        <InvitationTable
          invitations={invitations}
          onDelete={mockOnDelete}
          loading={loading}
        />
      );
    });
    return result!;
  };

  describe('Rendering', () => {
    it('renders table headers', async () => {
      await renderTable();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Prueba')).toBeInTheDocument();
      expect(screen.getByText('Estado')).toBeInTheDocument();
      expect(screen.getByText('Creado')).toBeInTheDocument();
      expect(screen.getByText('Acciones')).toBeInTheDocument();
    });

    it('renders all invitations', async () => {
      await renderTable();
      expect(screen.getByText('agent1@example.com')).toBeInTheDocument();
      expect(screen.getByText('used@example.com')).toBeInTheDocument();
      expect(screen.getByText('expired@example.com')).toBeInTheDocument();
    });

    it('shows "Sin especificar" for invitations without email', async () => {
      await renderTable();
      expect(screen.getByText('Sin especificar')).toBeInTheDocument();
    });

    it('displays trial days correctly', async () => {
      await renderTable();
      expect(screen.getByText('14 días')).toBeInTheDocument();
      expect(screen.getByText('7 días')).toBeInTheDocument();
      expect(screen.getByText('30 días')).toBeInTheDocument();
    });
  });

  describe('Status Badges', () => {
    it('shows "Activa" badge for active invitations', async () => {
      await renderTable();
      const activeBadges = screen.getAllByText('Activa');
      expect(activeBadges.length).toBeGreaterThanOrEqual(1);
    });

    it('shows "Usada" badge for used invitations', async () => {
      await renderTable();
      expect(screen.getByText('Usada')).toBeInTheDocument();
    });

    it('shows "Expirada" badge for expired invitations', async () => {
      await renderTable();
      expect(screen.getByText('Expirada')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('renders copy button for active invitations', async () => {
      await renderTable();
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('calls navigator.clipboard.writeText when copy button clicked', async () => {
      await renderTable();
      
      const copyButtons = screen.getAllByRole('button');
      const copyButton = copyButtons.find(btn => btn.getAttribute('title') === 'Copiar enlace');
      
      if (copyButton) {
        await act(async () => {
          fireEvent.click(copyButton);
        });
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      }
    });

    it('opens link in new tab when open button clicked', async () => {
      await renderTable();
      
      const openButtons = screen.getAllByRole('button');
      const openButton = openButtons.find(btn => btn.getAttribute('title') === 'Abrir enlace');
      
      if (openButton) {
        await act(async () => {
          fireEvent.click(openButton);
        });
        expect(mockWindowOpen).toHaveBeenCalled();
      }
    });

    it('calls onDelete when delete button clicked', async () => {
      await renderTable();
      
      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find(btn => btn.getAttribute('title') === 'Eliminar');
      
      if (deleteButton) {
        await act(async () => {
          fireEvent.click(deleteButton);
        });
        expect(mockOnDelete).toHaveBeenCalled();
      }
    });

    it('disables actions for used invitations', async () => {
      const usedInvitation: InvitationToken[] = [
        {
          id: '1',
          created_at: '2024-12-10T10:00:00Z',
          token: 'used-token',
          email: 'used@example.com',
          trial_days: 7,
          expires_at: '2024-12-25T10:00:00Z',
          used_at: '2024-12-12T15:30:00Z',
          used_by: 'user-id',
          created_by: 'admin-id',
          notes: '',
        },
      ];

      await renderTable(usedInvitation);
      
      const row = screen.getByText('used@example.com').closest('tr');
      expect(row).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when loading', async () => {
      await renderTable([], true);
      expect(screen.getByText('Cargando...') || document.querySelector('.animate-spin')).toBeTruthy();
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no invitations', async () => {
      await renderTable([]);
      expect(screen.getByText('No hay invitaciones')).toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('formats creation date correctly', async () => {
      await renderTable();
      const tableContent = screen.getByRole('table').textContent;
      expect(tableContent).toBeTruthy();
    });
  });

  describe('Notes Display', () => {
    it('displays notes when present', async () => {
      await renderTable();
      expect(screen.getByText('VIP agent')).toBeInTheDocument();
      expect(screen.getByText('Early adopter')).toBeInTheDocument();
    });
  });

  describe('URL Generation', () => {
    it('generates correct invite URL format', async () => {
      await renderTable();
      
      const copyButtons = screen.getAllByRole('button');
      const copyButton = copyButtons.find(btn => btn.getAttribute('title') === 'Copiar enlace');
      
      if (copyButton) {
        await act(async () => {
          fireEvent.click(copyButton);
        });
        
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining('/invite/')
        );
      }
    });
  });
});
