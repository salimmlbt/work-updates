
CREATE TABLE "public"."content_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "scheduled_date" "date" NOT NULL,
    "status" "text" DEFAULT 'Planned'::text NOT NULL,
    "content_type" "text",
    "notes" "text",
    "is_deleted" boolean DEFAULT false NOT NULL
);

ALTER TABLE "public"."content_schedules" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON "public"."content_schedules" FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON "public"."content_schedules" FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON "public"."content_schedules" FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON "public"."content_schedules" FOR DELETE USING (auth.role() = 'authenticated');

ALTER TABLE "public"."content_schedules" ADD CONSTRAINT "content_schedules_pkey" PRIMARY KEY USING INDEX ON "content_schedules" ("id");
ALTER TABLE "public"."content_schedules" ADD CONSTRAINT "content_schedules_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- Add new type to database.types.ts
ALTER TABLE "public"."database_types" ADD COLUMN "content_schedules" JSONB;
    