-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'TEACHER', 'OPERATOR');

-- CreateEnum
CREATE TYPE "Subject" AS ENUM ('PORTUGUESE', 'MATHEMATICS', 'SINGLE');

-- CreateEnum
CREATE TYPE "TimeMode" AS ENUM ('PARTIAL', 'FULL');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'REVIEW_REQUIRED', 'READY', 'FINALIZED', 'FAILED');

-- CreateEnum
CREATE TYPE "AnswerStatus" AS ENUM ('MARKED', 'BLANK', 'MULTIPLE', 'REVIEW');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "educational_units" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "educational_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_memberships" (
    "profile_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,

    CONSTRAINT "unit_memberships_pkey" PRIMARY KEY ("profile_id","unit_id")
);

-- CreateTable
CREATE TABLE "school_classes" (
    "id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "school_year" INTEGER NOT NULL,
    "time_mode" "TimeMode" NOT NULL,

    CONSTRAINT "school_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "registration" TEXT,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "grade" INTEGER NOT NULL,
    "subject" "Subject" NOT NULL,
    "time_mode" "TimeMode" NOT NULL,
    "question_count" INTEGER NOT NULL,
    "max_score" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "assessment_date" DATE NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "official_answers" (
    "assessment_id" UUID NOT NULL,
    "question" INTEGER NOT NULL,
    "choice" CHAR(1) NOT NULL,

    CONSTRAINT "official_answers_pkey" PRIMARY KEY ("assessment_id","question")
);

-- CreateTable
CREATE TABLE "answer_sheets" (
    "id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "student_id" UUID,
    "public_code" UUID NOT NULL,
    "template_id" TEXT NOT NULL,
    "template_version" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "answer_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_processings" (
    "id" UUID NOT NULL,
    "sheet_id" UUID,
    "uploaded_by" UUID NOT NULL,
    "status" "ProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "algorithm_version" TEXT NOT NULL,
    "quality" JSONB,
    "error_code" TEXT,
    "error_detail" TEXT,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reading_processings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_answers" (
    "id" UUID NOT NULL,
    "processing_id" UUID NOT NULL,
    "question" INTEGER NOT NULL,
    "detected_choice" CHAR(1),
    "final_choice" CHAR(1),
    "status" "AnswerStatus" NOT NULL,
    "confidence" DECIMAL(5,4) NOT NULL,
    "fills" JSONB NOT NULL,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "student_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "results" (
    "id" UUID NOT NULL,
    "sheet_id" UUID NOT NULL,
    "processing_id" UUID NOT NULL,
    "total" INTEGER NOT NULL,
    "correct" INTEGER NOT NULL,
    "wrong" INTEGER NOT NULL,
    "blank" INTEGER NOT NULL,
    "invalid" INTEGER NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "finalized_by" UUID NOT NULL,
    "finalized_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "educational_units_organization_id_name_key" ON "educational_units"("organization_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "school_classes_unit_id_name_school_year_key" ON "school_classes"("unit_id", "name", "school_year");

-- CreateIndex
CREATE INDEX "students_class_id_name_idx" ON "students"("class_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "assessments_unit_id_year_number_subject_class_id_key" ON "assessments"("unit_id", "year", "number", "subject", "class_id");

-- CreateIndex
CREATE UNIQUE INDEX "answer_sheets_public_code_key" ON "answer_sheets"("public_code");

-- CreateIndex
CREATE UNIQUE INDEX "answer_sheets_assessment_id_student_id_key" ON "answer_sheets"("assessment_id", "student_id");

-- CreateIndex
CREATE INDEX "reading_processings_status_created_at_idx" ON "reading_processings"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "student_answers_processing_id_question_key" ON "student_answers"("processing_id", "question");

-- CreateIndex
CREATE UNIQUE INDEX "results_processing_id_key" ON "results"("processing_id");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educational_units" ADD CONSTRAINT "educational_units_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_memberships" ADD CONSTRAINT "unit_memberships_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_memberships" ADD CONSTRAINT "unit_memberships_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "educational_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_classes" ADD CONSTRAINT "school_classes_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "educational_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "school_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "educational_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "school_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "official_answers" ADD CONSTRAINT "official_answers_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_sheets" ADD CONSTRAINT "answer_sheets_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_sheets" ADD CONSTRAINT "answer_sheets_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_processings" ADD CONSTRAINT "reading_processings_sheet_id_fkey" FOREIGN KEY ("sheet_id") REFERENCES "answer_sheets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_answers" ADD CONSTRAINT "student_answers_processing_id_fkey" FOREIGN KEY ("processing_id") REFERENCES "reading_processings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_sheet_id_fkey" FOREIGN KEY ("sheet_id") REFERENCES "answer_sheets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

