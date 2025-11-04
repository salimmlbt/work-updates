
ALTER TABLE "public"."tasks"
ADD COLUMN "parent_task_id" UUID REFERENCES "public"."tasks"(id) ON DELETE SET NULL;

COMMENT ON COLUMN "public"."tasks"."parent_task_id" IS 'Link to the original task if this is a follow-up task (e.g., for posting).';
