
create or replace function delete_project_and_tasks(p_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  delete from public.tasks where project_id = p_id;
  delete from public.projects where id = p_id;
end;
$$;
