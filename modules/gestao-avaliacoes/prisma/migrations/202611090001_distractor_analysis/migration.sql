ALTER TABLE "avalia_assessments"
ADD COLUMN IF NOT EXISTS "distractor_analysis" JSONB;
