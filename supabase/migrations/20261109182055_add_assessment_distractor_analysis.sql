-- Mantém o histórico central do Supabase alinhado com a alteração já aplicada
-- no banco da Gestão de Avaliações.
ALTER TABLE "avalia_assessments"
ADD COLUMN IF NOT EXISTS "distractor_analysis" JSONB;
