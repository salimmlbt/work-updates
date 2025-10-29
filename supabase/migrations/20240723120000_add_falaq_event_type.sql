
create type public.falaq_event_type as enum ('holiday', 'event', 'meeting');

alter table public.official_holidays
add column falaq_event_type public.falaq_event_type;

    