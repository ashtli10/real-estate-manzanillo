import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Dashboard } from './Dashboard';

// Mock useAuth hook
const mockUseAuth = {
  user: { id: 'user-123', email: 'agent@example.com' } as { id: string; email: string } | null,
  loading: false,
  signOut: vi.fn(),
};

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth,
}));

// Helper to create mock chain
const createMockChain = (data: unknown, isArray = false) => {
  const result = { data: isArray ? data : data, error: null };
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(result),
        maybeSingle: vi.fn().mockResolvedValue(result),
        order: vi.fn().mockResolvedValue({ data: isArray ? data : [data], error: null }),
      }),
      order: vi.fn().mockResolvedValue({ data: isArray ? data : [data], error: null }),
    }),
    insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
    }),
  };
};

const mockData: Record<string, unknown> = {
  profiles: {
    id: 'user-123',
    full_name: 'John Doe',
    email: 'agent@example.com',
    username: 'johndoe',
    company_name: 'Doe Realty',
    bio: 'Experienced agent',
    phone_number: '3141234567',
    whatsapp_number: '5213141234567',
    location: 'Manzanillo, Colima',
    profile_image: '',
    cover_image: '',
    is_visible: true,
    onboarding_completed: true,
  },
  subscriptions: {
    id: 'sub-123',
    user_id: 'user-123',
    status: 'trialing',
    trial_starts_at: new Date().toISOString(),
    trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    stripe_subscription_id: null,
  },
  credits: {
    id: 'credits-123',
    user_id: 'user-123',
    balance: 50,
    monthly_credits_used: 0,
  },
  properties: [
    {
      id: 'prop-1',
      title: 'Beach House',
      slug: 'beach-house',
      price: 5000000,
      status: 'active',
      characteristics: [],
      images: [],
      videos: [],
      custom_bonuses: [],
    },
  ],
};

// Mock Supabase client
vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      return createMockChain(mockData[table] || null, table === 'properties');
    }),
  },
}));

// Mock child components
vi.mock('../components/admin/PropertyTable', () => ({
  PropertyTable: ({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) => (
    <div data-testid="property-table">
      <button onClick={onEdit}>Edit Property</button>
      <button onClick={onDelete}>Delete Property</button>
    </div>
  ),
}));

vi.mock('../components/admin/PropertyForm', () => ({
  PropertyForm: ({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) => (
    <div data-testid="property-form">
      <button onClick={onSave}>Save Property</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock('../components/admin/DeleteConfirmModal', () => ({
  DeleteConfirmModal: ({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) => (
    <div data-testid="delete-modal">
      <button onClick={onConfirm}>Confirm Delete</button>
      <button onClick={onCancel}>Cancel Delete</button>
    </div>
  ),
}));

describe('Dashboard', () => {
  const mockOnNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.user = { id: 'user-123', email: 'agent@example.com' };
    mockUseAuth.loading = false;
  });

  const renderDashboard = async () => {
    let result;
    await act(async () => {
      result = render(<Dashboard onNavigate={mockOnNavigate} />);
      // Allow effects to settle
      await new Promise(resolve => setTimeout(resolve, 50));
    });
    return result!;
  };

  describe('Authentication', () => {
    it('redirects to login if not authenticated', async () => {
      mockUseAuth.user = null;
      
      await renderDashboard();
      
      await waitFor(() => {
        expect(mockOnNavigate).toHaveBeenCalledWith('/login');
      });
    });

    it('shows loading while auth is loading', async () => {
      mockUseAuth.loading = true;
      
      await renderDashboard();
      
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Sidebar Navigation', () => {
    it('renders sidebar with navigation items', async () => {
      await renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText(/resumen|overview|panel/i)).toBeInTheDocument();
      });
    });

    it('shows properties navigation item', async () => {
      await renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText(/propiedades|properties/i)).toBeInTheDocument();
      });
    });

    it('shows profile navigation item', async () => {
      await renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText(/perfil|profile/i)).toBeInTheDocument();
      });
    });

    it('shows billing navigation item', async () => {
      await renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText(/facturación|billing|suscripción/i)).toBeInTheDocument();
      });
    });

    it('shows AI tools navigation item', async () => {
      await renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText(/herramientas ai|ai tools/i)).toBeInTheDocument();
      });
    });

    it('shows logout button', async () => {
      await renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText(/cerrar sesión|logout|salir/i)).toBeInTheDocument();
      });
    });

    it('calls signOut when logout clicked', async () => {
      await renderDashboard();
      
      await waitFor(() => {
        const logoutButton = screen.getByText(/cerrar sesión|logout|salir/i);
        fireEvent.click(logoutButton);
      });
      
      expect(mockUseAuth.signOut).toHaveBeenCalled();
    });
  });

  describe('Overview Tab', () => {
    it('shows subscription status', async () => {
      await renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText(/suscripción|subscription|trial/i)).toBeInTheDocument();
      });
    });

    it('shows credit balance', async () => {
      await renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText(/créditos|credits/i)).toBeInTheDocument();
      });
    });

    it('shows property count', async () => {
      await renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText(/propiedades|properties/i)).toBeInTheDocument();
      });
    });
  });

  describe('Properties Tab', () => {
    it('switches to properties tab when clicked', async () => {
      await renderDashboard();
      
      await waitFor(() => {
        const propertiesNav = screen.getAllByText(/propiedades|properties/i)[0];
        fireEvent.click(propertiesNav);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('property-table')).toBeInTheDocument();
      });
    });

    it('shows add property button', async () => {
      await renderDashboard();
      
      await waitFor(() => {
        const propertiesNav = screen.getAllByText(/propiedades|properties/i)[0];
        fireEvent.click(propertiesNav);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/agregar|nueva|add|new/i)).toBeInTheDocument();
      });
    });
  });

  describe('AI Tools Tab', () => {
    it('shows coming soon badge', async () => {
      await renderDashboard();
      
      await waitFor(() => {
        const aiToolsNav = screen.getByText(/herramientas ai|ai tools/i);
        fireEvent.click(aiToolsNav);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/próximamente|coming soon/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Info', () => {
    it('displays user profile info', async () => {
      await renderDashboard();
      
      await waitFor(() => {
        const content = document.body.textContent;
        expect(content).toContain('John Doe');
      });
    });

    it('shows company name', async () => {
      await renderDashboard();
      
      await waitFor(() => {
        const content = document.body.textContent;
        expect(content).toContain('Doe Realty');
      });
    });
  });

  describe('Subscription Display', () => {
    it('shows trial status correctly', async () => {
      await renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText(/trial|prueba/i)).toBeInTheDocument();
      });
    });
  });

  describe('Credits Display', () => {
    it('shows credit balance', async () => {
      await renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText(/50/)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Layout', () => {
    it('has sidebar', async () => {
      await renderDashboard();
      
      await waitFor(() => {
        const sidebar = document.querySelector('aside, nav, [class*="sidebar"]');
        expect(sidebar).toBeInTheDocument();
      });
    });

    it('has main content area', async () => {
      await renderDashboard();
      
      await waitFor(() => {
        const main = document.querySelector('main, [class*="content"]');
        expect(main).toBeInTheDocument();
      });
    });
  });
});
