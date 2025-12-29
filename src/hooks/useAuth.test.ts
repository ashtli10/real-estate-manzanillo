import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuth, UserRole } from './useAuth';

// Mock Supabase client
const mockOnAuthStateChange = vi.fn();
const mockGetSession = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockFrom = vi.fn();

vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      getSession: () => mockGetSession(),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signOut: () => mockSignOut(),
    },
    from: (table: string) => mockFrom(table),
  },
}));

describe('useAuth', () => {
  let authCallback: ((event: string, session: unknown) => void) | null = null;
  let unsubscribeMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    authCallback = null;
    unsubscribeMock = vi.fn();

    // Default mock for onAuthStateChange
    mockOnAuthStateChange.mockImplementation((callback: (event: string, session: unknown) => void) => {
      authCallback = callback;
      return {
        data: {
          subscription: {
            unsubscribe: unsubscribeMock,
          },
        },
      };
    });

    // Default mock for getSession (no session)
    mockGetSession.mockResolvedValue({
      data: { session: null },
    });

    // Default mock for database queries
    mockFrom.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }));

    mockSignOut.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('starts with loading true', () => {
      const { result } = renderHook(() => useAuth());
      
      // Initially loading should be true
      expect(result.current.loading).toBe(true);
    });

    it('has null user initially', () => {
      const { result } = renderHook(() => useAuth());
      
      expect(result.current.user).toBeNull();
    });

    it('has null session initially', () => {
      const { result } = renderHook(() => useAuth());
      
      expect(result.current.session).toBeNull();
    });

    it('has null role initially', () => {
      const { result } = renderHook(() => useAuth());
      
      expect(result.current.role).toBeNull();
    });

    it('isAdmin is false initially', () => {
      const { result } = renderHook(() => useAuth());
      
      expect(result.current.isAdmin).toBe(false);
    });

    it('isAgent is false initially', () => {
      const { result } = renderHook(() => useAuth());
      
      expect(result.current.isAgent).toBe(false);
    });
  });

  describe('Session Detection', () => {
    it('sets loading to false when no session exists', async () => {
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('calls getSession on mount', async () => {
      renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(mockGetSession).toHaveBeenCalled();
      });
    });

    it('sets up auth state listener', () => {
      renderHook(() => useAuth());
      
      expect(mockOnAuthStateChange).toHaveBeenCalled();
    });
  });

  describe('With Authenticated User', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    const mockSession = {
      user: mockUser,
      access_token: 'token',
    };

    beforeEach(() => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
      });
    });

    it('sets user from session', async () => {
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });
    });

    it('sets session', async () => {
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.session).toEqual(mockSession);
      });
    });

    it('loads user role from database', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'user_roles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { role: 'agent' }, error: null }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        };
      });

      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.role).toBe('agent');
        expect(result.current.isAgent).toBe(true);
      });
    });

    it('sets isAdmin for admin role', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'user_roles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { role: 'admin' }, error: null }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        };
      });

      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.role).toBe('admin');
        expect(result.current.isAdmin).toBe(true);
        expect(result.current.isAgent).toBe(false);
      });
    });

    it('loads profile from database', async () => {
      const mockProfile = {
        id: 'user-123',
        full_name: 'John Doe',
        email: 'test@example.com',
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: mockProfile, error: null }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        };
      });

      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.profile).toEqual(mockProfile);
      });
    });

    it('loads subscription from database', async () => {
      const mockSubscription = {
        id: 'sub-123',
        user_id: 'user-123',
        status: 'active',
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: mockSubscription, error: null }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        };
      });

      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.subscription).toEqual(mockSubscription);
      });
    });
  });

  describe('signIn', () => {
    it('calls supabase signInWithPassword', async () => {
      mockSignInWithPassword.mockResolvedValue({ error: null });
      
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('returns error on failure', async () => {
      const mockError = { message: 'Invalid credentials' };
      mockSignInWithPassword.mockResolvedValue({ error: mockError });
      
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', 'wrong');
      });

      expect(signInResult).toEqual({ error: mockError });
    });
  });

  describe('signUp', () => {
    it('calls supabase signUp', async () => {
      mockSignUp.mockResolvedValue({ data: { user: { id: 'new-user' } }, error: null });
      
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signUp('new@example.com', 'password123');
      });

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
      });
    });

    it('returns user data on success', async () => {
      const mockData = { user: { id: 'new-user' } };
      mockSignUp.mockResolvedValue({ data: mockData, error: null });
      
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let signUpResult;
      await act(async () => {
        signUpResult = await result.current.signUp('new@example.com', 'password123');
      });

      expect(signUpResult).toEqual({ data: mockData, error: null });
    });
  });

  describe('signOut', () => {
    it('calls supabase signOut', async () => {
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSignOut).toHaveBeenCalled();
    });

    it('resets user state on successful signOut', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
      });

      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.profile).toBeNull();
      expect(result.current.subscription).toBeNull();
      expect(result.current.role).toBeNull();
    });
  });

  describe('hasActiveSubscription', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
      });
    });

    it('returns false when no subscription', async () => {
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasActiveSubscription()).toBe(false);
    });

    it('returns true for active subscription', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({
                  data: { status: 'active' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        };
      });

      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.subscription).toBeTruthy();
      });

      expect(result.current.hasActiveSubscription()).toBe(true);
    });

    it('returns true for valid trial', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({
                  data: {
                    status: 'trialing',
                    trial_ends_at: futureDate.toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        };
      });

      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.subscription).toBeTruthy();
      });

      expect(result.current.hasActiveSubscription()).toBe(true);
    });

    it('returns false for expired trial', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({
                  data: {
                    status: 'trialing',
                    trial_ends_at: pastDate.toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        };
      });

      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.subscription).toBeTruthy();
      });

      expect(result.current.hasActiveSubscription()).toBe(false);
    });

    it('returns true for past_due (grace period)', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({
                  data: { status: 'past_due' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        };
      });

      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.subscription).toBeTruthy();
      });

      expect(result.current.hasActiveSubscription()).toBe(true);
    });

    it('returns false for canceled subscription', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({
                  data: { status: 'canceled' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        };
      });

      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.subscription).toBeTruthy();
      });

      expect(result.current.hasActiveSubscription()).toBe(false);
    });

    it('returns false for unpaid subscription', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({
                  data: { status: 'unpaid' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        };
      });

      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.subscription).toBeTruthy();
      });

      expect(result.current.hasActiveSubscription()).toBe(false);
    });
  });

  describe('Auth State Changes', () => {
    it('handles sign in through auth state change', async () => {
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Simulate auth state change (sign in)
      const newUser = { id: 'new-user-123', email: 'new@example.com' };
      const newSession = { user: newUser, access_token: 'new-token' };

      await act(async () => {
        if (authCallback) {
          authCallback('SIGNED_IN', newSession);
        }
        // Wait for state updates
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(newUser);
      });
    });

    it('handles sign out through auth state change', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
      });

      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.user).toBeTruthy();
      });

      // Simulate auth state change (sign out)
      await act(async () => {
        if (authCallback) {
          authCallback('SIGNED_OUT', null);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
      });
    });
  });

  describe('Cleanup', () => {
    it('unsubscribes from auth listener on unmount', () => {
      const mockUnsubscribe = vi.fn();
      mockOnAuthStateChange.mockImplementation(() => ({
        data: {
          subscription: {
            unsubscribe: mockUnsubscribe,
          },
        },
      }));

      const { unmount } = renderHook(() => useAuth());
      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles database error gracefully', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
      });

      mockFrom.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.reject(new Error('Database error')),
          }),
        }),
      }));

      const { result } = renderHook(() => useAuth());
      
      // Should not throw and should still set loading to false
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });
});
