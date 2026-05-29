ALTER TABLE public.tournament_predictions
  ADD COLUMN IF NOT EXISTS possession_pred_final integer;
