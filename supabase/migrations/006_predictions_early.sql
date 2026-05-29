ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS predictions_early boolean NOT NULL DEFAULT false;
