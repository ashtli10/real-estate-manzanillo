-- Migration: Simplify dashboard stats to only show property counts
-- Date: 2026-01-06

DROP FUNCTION IF EXISTS public.get_agent_dashboard_stats(UUID);

CREATE OR REPLACE FUNCTION public.get_agent_dashboard_stats(agent_user_id UUID DEFAULT NULL)
RETURNS TABLE(
  user_id UUID,
  total_properties BIGINT,
  active_properties BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF agent_user_id IS NULL THEN
    agent_user_id := auth.uid();
  ELSIF agent_user_id != auth.uid() AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to view stats for this user';
  END IF;

  RETURN QUERY
  SELECT
    agent_user_id AS user_id,
    COUNT(*)::BIGINT AS total_properties,
    COUNT(*) FILTER (WHERE p.status = 'active')::BIGINT AS active_properties
  FROM public.properties p
  WHERE p.user_id = agent_user_id;
END;
$$;

ALTER FUNCTION public.get_agent_dashboard_stats(UUID) OWNER TO postgres;
