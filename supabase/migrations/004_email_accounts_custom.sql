-- Allow 'custom' provider (IMAP/POP3) and optional server fields
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'email_accounts_provider_check'
  ) THEN
    ALTER TABLE public.email_accounts DROP CONSTRAINT email_accounts_provider_check;
  END IF;
END $$;

ALTER TABLE public.email_accounts
  ADD CONSTRAINT email_accounts_provider_check CHECK (provider IN ('gmail','outlook','custom'));
