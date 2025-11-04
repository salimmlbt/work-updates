
CREATE TYPE public.posting_status_enum AS ENUM ('Planned', 'Scheduled', 'Posted');

ALTER TABLE public.tasks
ADD COLUMN posting_status public.posting_status_enum;

    