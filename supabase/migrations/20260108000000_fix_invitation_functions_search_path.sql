-- Fix invitation token functions search_path and schema qualification
-- Resolves 42P01 errors when calling validate_invitation_token/use_invitation_token

CREATE OR REPLACE FUNCTION public.validate_invitation_token(invite_token text)
RETURNS TABLE(is_valid boolean, token_email text, token_trial_days integer)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (it.used_at IS NULL AND it.expires_at > now()) AS is_valid,
    it.email AS token_email,
    COALESCE(it.trial_days, 0) AS token_trial_days
  FROM public.invitation_tokens it
  WHERE it.token = validate_invitation_token.invite_token;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::text, 0;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.use_invitation_token(invite_token text, user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token_record public.invitation_tokens%ROWTYPE;
BEGIN
  SELECT * INTO token_record
  FROM public.invitation_tokens
  WHERE token = use_invitation_token.invite_token
    AND used_at IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.invitation_tokens
  SET used_at = now(),
      used_by = user_uuid
  WHERE token = use_invitation_token.invite_token;

  INSERT INTO public.subscriptions (user_id, status, trial_ends_at)
  VALUES (
    user_uuid,
    'trialing',
    CASE
      WHEN token_record.trial_days > 0 THEN now() + (token_record.trial_days || ' days')::interval
      ELSE NULL
    END
  )
  ON CONFLICT (user_id) DO UPDATE
  SET status = 'trialing',
      trial_ends_at = CASE
        WHEN token_record.trial_days > 0 THEN now() + (token_record.trial_days || ' days')::interval
        ELSE NULL
      END,
      updated_at = now();

  RETURN true;
END;
$$;
