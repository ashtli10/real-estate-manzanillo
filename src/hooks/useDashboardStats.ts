import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';

export interface DashboardStats {
  totalProperties: number;
  activeProperties: number;
  totalViews: number;
  viewsThisWeek: number;
  totalLeads: number;
  leadsThisMonth: number;
}

export interface UseDashboardStatsReturn {
  stats: DashboardStats;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const DEFAULT_STATS: DashboardStats = {
  totalProperties: 0,
  activeProperties: 0,
  totalViews: 0,
  viewsThisWeek: 0,
  totalLeads: 0,
  leadsThisMonth: 0,
};

/**
 * Hook to fetch dashboard statistics for an agent
 * Uses the get_agent_dashboard_stats RPC function for efficient server-side calculation
 */
export function useDashboardStats(userId: string | undefined): UseDashboardStatsReturn {
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use the RPC function for efficient server-side stats calculation
      const { data, error: rpcError } = await supabase.rpc('get_agent_dashboard_stats', {
        agent_user_id: userId,
      });

      if (rpcError) throw rpcError;

      if (data && data.length > 0) {
        const result = data[0];
        setStats({
          totalProperties: result.total_properties || 0,
          activeProperties: result.active_properties || 0,
          totalViews: result.total_views || 0,
          viewsThisWeek: result.views_this_week || 0,
          totalLeads: result.total_leads || 0,
          leadsThisMonth: result.leads_this_month || 0,
        });
      } else {
        // No data returned, set defaults
        setStats(DEFAULT_STATS);
      }
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : 'Failed to load dashboard stats';
      console.error('Error fetching dashboard stats:', err);
      setError(errMessage);
      // Keep default stats on error
      setStats(DEFAULT_STATS);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refresh: fetchStats,
  };
}
