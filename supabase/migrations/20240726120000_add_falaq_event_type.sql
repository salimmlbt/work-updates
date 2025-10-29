
CREATE TYPE public.falaq_event_type AS ENUM ('holiday', 'event', 'meeting');

ALTER TABLE public.official_holidays
ADD COLUMN falaq_event_type public.falaq_event_type;

ALTER TABLE public.official_holidays
ALTER COLUMN type SET DATA TYPE text;

DROP TYPE IF EXISTS public.holiday_type;

CREATE TYPE public.holiday_type AS ENUM ('official', 'personal', 'special_day', 'weekend');

ALTER TABLE public.official_holidays
ALTER COLUMN type TYPE public.holiday_type
USING type::text::public.holiday_type;
