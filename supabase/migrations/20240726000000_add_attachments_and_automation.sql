-- 1. Create attachments bucket
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true);

-- 2. Add attachments column to tasks
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS attachments jsonb;

-- 3. Create a function to delete attachments for a given task
create or replace function delete_task_attachments(task_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  attachment_path text;
begin
  -- Select all attachment paths for the given task
  for attachment_path in
    select jsonb_array_elements(attachments)->>'path'
    from public.tasks
    where id = task_id
  loop
    -- Delete the file from storage
    perform storage.delete_object('attachments', attachment_path);
  end loop;

  -- Clear the attachments column for the task
  update public.tasks
  set attachments = null
  where id = task_id;
end;
$$;

-- 4. Create a function to be called by the trigger
create or replace function handle_task_done()
returns trigger
language plpgsql
security definer
as $$
declare
  delay_in_seconds int;
  job_id bigint;
begin
  if new.status = 'done' and (old is null or old.status <> 'done') then
    -- Get the delay from app_settings, default to 300 seconds (5 minutes)
    select value::int into delay_in_seconds
    from public.app_settings
    where key = 'attachment_deletion_delay'
    limit 1;
    
    if delay_in_seconds is null then
      delay_in_seconds := 300;
    end if;

    -- Schedule a one-off cron job to delete attachments after the delay
    select cron.schedule(
      'delete-attachments-' || new.id::text,
      (now() + (delay_in_seconds || ' seconds')::interval)::text,
      format('select public.delete_task_attachments(%L)', new.id)
    ) into job_id;
  elsif old.status = 'done' and new.status <> 'done' then
    -- If the task status changes from 'done' to something else, cancel the scheduled job.
    perform cron.unschedule('delete-attachments-' || new.id::text);
  end if;

  return new;
end;
$$;

-- 5. Create a trigger on the tasks table
drop trigger if exists on_task_done_trigger on public.tasks;
create trigger on_task_done_trigger
after update on public.tasks
for each row
execute function handle_task_done();


-- 6. Add default value for attachment deletion delay
insert into public.app_settings (key, value)
values ('attachment_deletion_delay', '300')
on conflict (key) do nothing;

-- 7. Modify update_task_status RPC
CREATE OR REPLACE FUNCTION public.update_task_status(task_id uuid, new_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  update public.tasks
  set status = new_status::public.task_status
  where id = task_id;
end;
$function$;
