DROP INDEX IF EXISTS "school_classes_unit_id_name_school_year_key";
CREATE UNIQUE INDEX IF NOT EXISTS "school_classes_unit_id_grade_name_school_year_time_mode_key" ON "school_classes"("unit_id", "grade", "name", "school_year", "time_mode");
