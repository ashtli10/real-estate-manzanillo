/**
 * Route Access Hook
 * Check if user has access to a route without rendering protection UI
 */

import { useAuthState } from '../contexts/AuthContext';
import type { RouteProtection } from '../types/auth';

/**
 * Hook for checking route access without rendering protection UI
 * Useful for conditionally showing/hiding UI elements
 */
export function useRouteAccess(protection: RouteProtection): {
  hasAccess: boolean;
  isLoading: boolean;
  reason: 'none' | 'auth' | 'subscription' | 'admin';
} {
  const { isAuthenticated, isAdmin, hasActiveSubscription, isLoading } = useAuthState();

  if (isLoading) {
    return { hasAccess: false, isLoading: true, reason: 'none' };
  }

  if (protection === 'public') {
    return { hasAccess: true, isLoading: false, reason: 'none' };
  }

  if (!isAuthenticated) {
    return { hasAccess: false, isLoading: false, reason: 'auth' };
  }

  if (protection === 'admin' && !isAdmin) {
    return { hasAccess: false, isLoading: false, reason: 'admin' };
  }

  if (protection === 'subscribed' && !hasActiveSubscription && !isAdmin) {
    return { hasAccess: false, isLoading: false, reason: 'subscription' };
  }

  return { hasAccess: true, isLoading: false, reason: 'none' };
}
