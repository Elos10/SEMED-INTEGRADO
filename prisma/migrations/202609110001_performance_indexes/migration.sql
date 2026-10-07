-- Índices para os filtros e relacionamentos mais usados pela API.
CREATE INDEX IF NOT EXISTS "profiles_organization_id_active_idx" ON "profiles"("organization_id", "active");
CREATE INDEX IF NOT EXISTS "school_classes_unit_id_school_year_grade_idx" ON "school_classes"("unit_id", "school_year", "grade");
CREATE INDEX IF NOT EXISTS "assessments_unit_id_assessment_date_idx" ON "assessments"("unit_id", "assessment_date");
CREATE INDEX IF NOT EXISTS "assessments_class_id_idx" ON "assessments"("class_id");
CREATE INDEX IF NOT EXISTS "answer_sheets_student_id_idx" ON "answer_sheets"("student_id");
CREATE INDEX IF NOT EXISTS "reading_processings_sheet_id_created_at_idx" ON "reading_processings"("sheet_id", "created_at");
CREATE INDEX IF NOT EXISTS "results_sheet_id_finalized_at_idx" ON "results"("sheet_id", "finalized_at");
