
ALTER TABLE "public"."tasks" ADD COLUMN "schedule_id" UUID;

ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."content_schedules"("id") ON DELETE SET NULL;
