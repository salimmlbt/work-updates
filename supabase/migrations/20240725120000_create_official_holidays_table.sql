
CREATE TABLE "public"."official_holidays" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "name" text NOT NULL,
    "date" date NOT NULL,
    "description" text,
    "user_id" uuid
);

ALTER TABLE "public"."official_holidays" OWNER TO "postgres";

CREATE SEQUENCE "public"."official_holidays_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."official_holidays_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."official_holidays_id_seq" OWNED BY "public"."official_holidays"."id";

ALTER TABLE ONLY "public"."official_holidays" ALTER COLUMN "id" SET DEFAULT nextval('public.official_holidays_id_seq'::regclass);

ALTER TABLE ONLY "public"."official_holidays"
    ADD CONSTRAINT "official_holidays_pkey" PRIMARY KEY ("id");

ALTER TABLE "public"."official_holidays" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read all holidays" ON "public"."official_holidays" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow users to insert their own holidays" ON "public"."official_holidays" FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow admins to insert official holidays" ON "public"."official_holidays" FOR INSERT TO authenticated WITH CHECK (user_id IS NULL AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role_id = (SELECT id FROM roles WHERE name = 'Falaq Admin')));
CREATE POLICY "Allow users to update their own holidays" ON "public"."official_holidays" FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow admins to update official holidays" ON "public"."official_holidays" FOR UPDATE TO authenticated USING (user_id IS NULL AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role_id = (SELECT id FROM roles WHERE name = 'Falaq Admin'))) WITH CHECK (user_id IS NULL AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role_id = (SELECT id FROM roles WHERE name = 'Falaq Admin')));
CREATE POLICY "Allow users to delete their own holidays" ON "public"."official_holidays" FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Allow admins to delete official holidays" ON "public"."official_holidays" FOR DELETE TO authenticated USING (user_id IS NULL AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role_id = (SELECT id FROM roles WHERE name = 'Falaq Admin')));

ALTER TABLE "public"."official_holidays" ADD CONSTRAINT "official_holidays_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

GRANT ALL ON TABLE "public"."official_holidays" TO "anon";
GRANT ALL ON TABLE "public"."official_holidays" TO "authenticated";
GRANT ALL ON TABLE "public"."official_holidays" TO "service_role";
GRANT ALL ON SEQUENCE "public"."official_holidays_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."official_holidays_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."official_holidays_id_seq" TO "service_role";
