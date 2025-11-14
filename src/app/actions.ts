
'use server'

import { revalidatePath } from 'next/cache'
import { prioritizeTasksByDeadline, type PrioritizeTasksInput } from '@/ai/flows/prioritize-tasks-by-deadline'
import type { TaskWithAssignee, Attachment, OfficialHoliday, Industry, WorkType, ContentSchedule, Task, Correction, Revisions } from '@/lib/types'
import { createServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { google } from 'googleapis';
import { formatInTimeZone } from 'date-fns-tz';

export async function checkIn() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to check in.' };
  }
  
  const today = new Date().toISOString().split('T')[0];

  const { data: existing, error: fetchError } = await supabase
    .from('attendance')
    .select('id, check_in')
    .eq('user_id', user.id)
    .eq('date', today)
    .maybeSingle();

  if (fetchError && fetchError.code !== 'PGRST116') {
     return { error: `Database error: ${fetchError.message}` };
  }
  
  if (existing && existing.check_in) {
    return { error: 'You have already checked in today.' };
  }

  const { data, error } = await supabase
    .from('attendance')
    .insert({
      user_id: user.id,
      date: today,
      check_in: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/attendance');
  return { data };
}

export async function checkOut() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to check out.' };
  }
  
  const today = new Date().toISOString().split('T')[0];

  const { data: attendance, error: fetchError } = await supabase
    .from('attendance')
    .select('id, check_in, check_out')
    .eq('user_id', user.id)
    .eq('date', today)
    .maybeSingle();
  
  if (fetchError || !attendance) {
    return { error: 'You have not checked in today.' };
  }
  
  if (attendance.check_out) {
    return { error: 'You have already checked out today.' };
  }

  const checkInTime = new Date(attendance.check_in!).getTime();
  const checkOutTime = new Date().getTime();
  const totalHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);

  const { data, error } = await supabase
    .from('attendance')
    .update({
      check_out: new Date().toISOString(),
      total_hours: totalHours,
    })
    .eq('id', attendance.id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }
  
  revalidatePath('/attendance');
  return { data };
}

export async function lunchOut() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in.' };
  }
  
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('attendance')
    .update({
      lunch_out: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('date', today)
    .select('id')
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }
  
  revalidatePath('/attendance');
  return { data };
}

export async function lunchIn() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in.' };
  }
  
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('attendance')
    .update({
      lunch_in: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('date', today)
    .select('id')
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }
  
  revalidatePath('/attendance');
  return { data };
}


export async function addProject(formData: FormData) {
  const supabase = await createServerClient()
  
  const rawFormData = {
    name: formData.get('name') as string,
    client_id: formData.get('client_id') as string | null,
    start_date: formData.get('start_date') as string | null,
    due_date: formData.get('due_date') as string | null,
    priority: formData.get('priority') as string,
    leaders: formData.getAll('leaders') as string[],
    members: formData.getAll('members') as string[],
    type: formData.get('type') as string | null,
  }

  if (!rawFormData.name) {
    return { error: 'Project name is required.' }
  }
   if (!rawFormData.members || rawFormData.members.length === 0) {
    return { error: 'At least one member is required.' };
  }
  if (!rawFormData.client_id || rawFormData.client_id === 'no-client') {
    return { error: 'Client is required.' };
  }
  if (!rawFormData.due_date) {
    return { error: 'Due date is required.' };
  }
  if (!rawFormData.priority) {
    return { error: 'Priority is required.' };
  }


  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      name: rawFormData.name,
      client_id: rawFormData.client_id === 'no-client' ? null : rawFormData.client_id,
      start_date: rawFormData.start_date ? new Date(rawFormData.start_date).toISOString() : null,
      due_date: rawFormData.due_date ? new Date(rawFormData.due_date).toISOString() : null,
      status: 'New',
      priority: rawFormData.priority,
      leaders: rawFormData.leaders,
      members: rawFormData.members,
      type: rawFormData.type,
      is_deleted: false,
    })
    .select('*')
    .single()

  if (projectError) {
    console.error('Error creating project:', projectError)
    return { error: projectError.message }
  }
  if (!project) {
    return { error: "Could not create project." }
  }

  revalidatePath('/dashboard')
  revalidatePath('/projects')
  return { data: project }
}

export async function updateProject(projectId: string, formData: FormData) {
    const supabase = await createServerClient()
    
    const rawFormData = {
        name: formData.get('name') as string,
        client_id: formData.get('client_id') as string | null,
        start_date: formData.get('start_date') as string | null,
        due_date: formData.get('due_date') as string | null,
        status: formData.get('status') as string,
        priority: formData.get('priority') as string,
        leaders: formData.getAll('leaders') as string[],
        members: formData.getAll('members') as string[],
        type: formData.get('type') as string | null,
    }

    if (!rawFormData.name) {
        return { error: 'Project name is required.' }
    }

    const { data: project, error: projectError } = await supabase
        .from('projects')
        .update({
            name: rawFormData.name,
            client_id: rawFormData.client_id === 'no-client' ? null : rawFormData.client_id,
            start_date: rawFormData.start_date ? new Date(rawFormData.start_date).toISOString() : null,
            due_date: rawFormData.due_date ? new Date(rawFormData.due_date).toISOString() : null,
            status: rawFormData.status,
            priority: rawFormData.priority,
            leaders: rawFormData.leaders,
            members: rawFormData.members,
            type: rawFormData.type,
            updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .select('*')
        .single();

    if (projectError) {
        console.error('Error updating project:', projectError)
        return { error: projectError.message }
    }
    
    revalidatePath('/dashboard')
    revalidatePath('/projects')
    return { data: project }
}

export async function updateProjectStatus(projectId: string, status: string) {
    const supabase = await createServerClient();
    const { data, error } = await supabase
        .from('projects')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', projectId)
        .select('id, status, updated_at')
        .single();

    if (error) {
        console.error('Error updating project status:', error)
        return { error: `Failed to update project status: ${error.message}` };
    }

    revalidatePath('/projects');
    revalidatePath('/dashboard');
    return { data };
}


export async function deleteProject(projectId: string) {
    const supabase = await createServerClient()

    const { error } = await supabase
        .from('projects')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', projectId);

    if (error) {
        return { error: `Failed to delete project: ${error.message}` };
    }

    revalidatePath('/dashboard');
    revalidatePath('/projects');
    return { success: true };
}

export async function restoreProject(projectId: string) {
    const supabase = await createServerClient()

    const { error } = await supabase
        .from('projects')
        .update({ is_deleted: false, updated_at: new Date().toISOString() })
        .eq('id', projectId);

    if (error) {
        return { error: `Failed to restore project: ${error.message}` };
    }

    revalidatePath('/projects');
    return { success: true };
}

export async function deleteProjectPermanently(projectId: string) {
    const supabase = await createServerClient()
    
    const { error } = await supabase.rpc('delete_project_and_tasks', {
      p_id: projectId,
    })

    if (error) {
        console.error("Error calling delete_project_and_tasks RPC:", error)
        return { error: `Failed to permanently delete project: ${error.message}` };
    }

    revalidatePath('/projects');
    return { success: true };
}

export async function addTask(formData: FormData) {
  const supabase = await createServerClient()
  
  const taskData = {
    project_id: formData.get('projectId') as string,
    description: formData.get('description') as string,
    deadline: new Date(formData.get('deadline') as string).toISOString(),
    assignee_id: formData.get('assigneeId') as string,
    tags: (formData.get('tags') as string)?.split(',').map(tag => tag.trim()).filter(Boolean),
  }

  if (!taskData.project_id || !taskData.description || !taskData.deadline) {
    return { error: 'Missing required fields' }
  }
  
  const { error } = await supabase.from('tasks').insert({ ...taskData, is_deleted: false })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/projects')
  revalidatePath('/tasks')
  return { success: true }
}

export async function updateTask(taskId: string, formData: FormData) {
    const supabase = await createServerClient()
    
    const rawData: { [key: string]: any } = {
        description: formData.get('description') as string,
        deadline: new Date(formData.get('deadline') as string).toISOString(),
        assignee_id: formData.get('assigneeId') as string,
        tags: (formData.get('tags') as string)?.split(',').map(tag => tag.trim()).filter(Boolean),
        project_id: formData.get('project_id') === 'no-project' ? null : formData.get('project_id') as string,
        client_id: formData.get('client_id') as string,
        type: formData.get('type') as string,
    }

    if (formData.has('post_date')) {
        rawData['post_date'] = new Date(formData.get('post_date') as string).toISOString();
    }


    const { data, error } = await supabase
        .from('tasks')
        .update(rawData)
        .eq('id', taskId)
        .select()
        .single();
        
    if (error) {
        return { error: error.message }
    }

    revalidatePath('/tasks')
    return { data }
}

export async function updateTaskStatus(
    taskId: string,
    status: Task['status'],
    correction?: { note: string; authorId: string }
) {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "You must be logged in to update a task." };
    }

    const { data: currentTask, error: fetchError } = await supabase
        .from('tasks')
        .select('revisions, corrections')
        .eq('id', taskId)
        .single();
    
    if (fetchError) {
        console.error('Error fetching task for status update:', fetchError);
        return { error: 'Could not retrieve task to update status.' };
    }

    const updates: Partial<Task> = { 
      status, 
      status_updated_at: new Date().toISOString(),
      status_updated_by: user.id
    };
    
    const revisions: Revisions = (currentTask.revisions as Revisions | null) || { corrections: 0, recreations: 0 };
    if (status === 'corrections') {
        revisions.corrections = (revisions.corrections || 0) + 1;
        updates.revisions = revisions;
        
        const newCorrection: Correction = {
            note: correction?.note || 'No note provided.',
            author_id: correction?.authorId || '',
            created_at: new Date().toISOString(),
        };
        const corrections = (currentTask.corrections as Correction[] | null) || [];
        updates.corrections = [...corrections, newCorrection];
    } else if (status === 'recreate') {
        revisions.recreations = (revisions.recreations || 0) + 1;
        updates.revisions = revisions;
    }

    const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

    if (error) {
        console.error('Error updating task status:', error);
        return { error: error.message };
    }

    revalidatePath('/tasks');
    return { success: true };
}


export async function updateTaskPostingStatus(taskId: string, posting_status: 'Planned' | 'Scheduled' | 'Posted') {
    const supabase = await createServerClient();
    const { error } = await supabase
        .from('tasks')
        .update({ posting_status, status_updated_at: new Date().toISOString() })
        .eq('id', taskId);

    if (error) {
        console.error('Error updating task posting status:', error);
        return { error: error.message };
    }

    revalidatePath('/tasks');
    revalidatePath('/dashboard');
    return { success: true };
}


export async function deleteTask(taskId: string) {
  const supabase = await createServerClient()
  const { error } = await supabase.from('tasks').update({ is_deleted: true }).eq('id', taskId)
  
  if (error) {
    return { error: error.message }
  }

  revalidatePath('/tasks')
  return { success: true }
}

export async function deleteTasks(taskIds: string[]) {
  const supabase = await createServerClient()
  const { error } = await supabase.from('tasks').update({ is_deleted: true }).in('id', taskIds)
  
  if (error) {
    return { error: error.message }
  }

  revalidatePath('/tasks')
  return { success: true }
}

export async function restoreTask(taskId: string) {
  const supabase = await createServerClient()
  const { error } = await supabase.from('tasks').update({ is_deleted: false }).eq('id', taskId)
  
  if (error) {
    return { error: error.message }
  }

  revalidatePath('/tasks')
  return { success: true }
}

export async function restoreTasks(taskIds: string[]) {
  const supabase = await createServerClient()
  const { error } = await supabase.from('tasks').update({ is_deleted: false }).in('id', taskIds)
  
  if (error) {
    return { error: error.message }
  }

  revalidatePath('/tasks')
  return { success: true }
}

export async function deleteTaskPermanently(taskId: string) {
  const supabase = await createServerClient()
  const { error } = await supabase.from('tasks').delete().eq('id', taskId)
  
  if (error) {
    return { error: error.message }
  }

  revalidatePath('/tasks')
  return { success: true }
}

export async function deleteTasksPermanently(taskIds: string[]) {
  const supabase = await createServerClient()
  const { error } = await supabase.from('tasks').delete().in('id', taskIds)
  
  if (error) {
    return { error: error.message }
  }

  revalidatePath('/tasks')
  return { success: true }
}


export async function prioritizeTasks(tasks: TaskWithAssignee[]) {
  const input: PrioritizeTasksInput = {
    tasks: tasks.map(task => ({
      id: task.id,
      description: task.description,
      deadline: task.deadline,
    }))
  }

  try {
    const result = await prioritizeTasksByDeadline(input);
    return { data: result.prioritizedTasks };
  } catch (error) {
    return { error: 'Failed to prioritize tasks with AI.' };
  }
}

export async function addClient(formData: FormData) {
  const supabase = await createServerClient();
  
  const name = formData.get('name') as string;
  const avatarFile = formData.get('avatar') as File | null;
  let avatarUrl = `https://i.pravatar.cc/150?u=${name}`;

  if (avatarFile && avatarFile.size > 0) {
    const filePath = `public/${Date.now()}_${avatarFile.name}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile);

    if (uploadError) {
      return { error: `Failed to upload avatar: ${uploadError.message}` };
    }

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
    
    if (!publicUrlData) {
        return { error: 'Could not get public URL for avatar.' };
    }
    avatarUrl = publicUrlData.publicUrl;
  }

  const clientData = {
    name: name,
    industry: formData.get('industry') as string,
    contact: formData.get('contact') as string,
    whatsapp: formData.get('whatsapp') as string,
    avatar: avatarUrl,
  };

  if (!clientData.name || !clientData.industry || !clientData.contact) {
    return { error: 'Missing required fields' };
  }
  
  const { data, error } = await supabase.from('clients').insert(clientData).select().single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/clients');
  return { data };
}

export async function updateClient(clientId: string, formData: FormData) {
    const supabase = await createServerClient();
    
    const { data: currentClient, error: fetchError } = await supabase
        .from('clients')
        .select('avatar')
        .eq('id', clientId)
        .single();
    
    if (fetchError) {
        return { error: `Could not fetch client data: ${fetchError.message}` };
    }

    const name = formData.get('name') as string;
    const avatarFile = formData.get('avatar') as File | null;
    let avatarUrl = currentClient.avatar;

    // Handle new avatar upload
    if (avatarFile && avatarFile.size > 0) {
        // Delete old avatar if it's not a pravatar link
        if (currentClient.avatar && !currentClient.avatar.includes('pravatar.cc')) {
            const oldAvatarPath = new URL(currentClient.avatar).pathname.split('/avatars/').pop();
            if (oldAvatarPath) {
                await supabase.storage.from('avatars').remove([oldAvatarPath]);
            }
        }

        // Upload new avatar
        const newFilePath = `public/${Date.now()}_${avatarFile.name}`;
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(newFilePath, avatarFile);

        if (uploadError) {
            return { error: `Failed to upload new avatar: ${uploadError.message}` };
        }

        const { data: publicUrlData } = await supabase.storage
            .from('avatars')
            .getPublicUrl(newFilePath);
        
        avatarUrl = publicUrlData.publicUrl;
    }

    const clientData = {
        name: name,
        industry: formData.get('industry') as string,
        contact: formData.get('contact') as string,
        whatsapp: formData.get('whatsapp') as string,
        avatar: avatarUrl,
    };

    if (!clientData.name || !clientData.industry || !clientData.contact) {
        return { error: 'Missing required fields' };
    }
    
    const { data, error } = await supabase
        .from('clients')
        .update(clientData)
        .eq('id', clientId)
        .select()
        .single();

    if (error) {
        return { error: `Failed to update client: ${error.message}` };
    }

    revalidatePath('/clients');
    return { data };
}


export async function deleteClient(clientId: string) {
    const supabase = await createServerClient();

    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('avatar')
      .eq('id', clientId)
      .single();

    if (fetchError) {
      return { error: `Could not fetch client to delete avatar: ${fetchError.message}` };
    }
    
    if (client.avatar && !client.avatar.includes('pravatar.cc')) {
        const avatarPath = new URL(client.avatar).pathname.split('/avatars/').pop();
        if (avatarPath) {
            const { error: storageError } = await supabase.storage.from('avatars').remove([avatarPath]);
            if (storageError) {
                console.error(`Could not delete avatar from storage: ${storageError.message}`);
            }
        }
    }

    const { error } = await supabase.from('clients').delete().eq('id', clientId);

    if (error) {
        return { error: `Failed to delete client: ${error.message}` };
    }

    revalidatePath('/clients');
    return { success: true };
}

export async function createTeam(name: string, defaultTasks: string[]) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to create a team.' };
  }

  const { data, error } = await supabase
    .from('teams')
    .insert({ 
      name, 
      default_tasks: defaultTasks,
      owner_id: user.id 
    })
    .select()
    .single()
  
  if (error) {
    return { error: error.message }
  }
  revalidatePath('/teams')
  return { data }
}

export async function createRole(name: string, permissions: Record<string, "Restricted" | "Viewer" | "Editor">) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('roles')
    .insert({ name, permissions })
    .select()
    .single()
  
  if (error) {
    return { error: error.message }
  }
  revalidatePath('/teams')
  return { data }
}

export async function updateRole(id: string, name: string, permissions: Record<string, "Restricted" | "Viewer" | "Editor">) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('roles')
    .update({ name, permissions })
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    return { error: error.message }
  }
  revalidatePath('/teams')
  return { data }
}


export async function deleteRole(id: string) {
    const supabase = await createServerClient()
    const { error } = await supabase.from('roles').delete().eq('id', id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/teams')
    return { success: true }
}

export async function addUser(userData: Omit<import('@/lib/types').Profile, 'id' | 'roles' | 'teams'> & {password: string, role_id: string, team_id: string}) {
    const supabaseAdmin = createSupabaseAdminClient()
    if (!supabaseAdmin) {
        return { error: "Admin client not initialized. Cannot create user." }
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email!,
      password: userData.password,
      user_metadata: {
          full_name: userData.full_name,
          avatar_url: userData.avatar_url,
      },
      email_confirm: true,
    })

    if (authError) {
      return { error: authError.message }
    }

    if (!authData.user) {
      return { error: "User could not be created in Auth."}
    }
    
    const supabase = await createServerClient()
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name: userData.full_name,
        email: userData.email,
        avatar_url: userData.avatar_url,
        role_id: userData.role_id,
      })
      .select('*, roles(*), teams:profile_teams(teams(*))')
      .single();

    if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return { error: `Failed to create user profile: ${profileError.message}` };
    }

    revalidatePath('/teams')
    return { data: profileData }
}

export async function updateUserRole(userId: string, roleId: string) {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('profiles')
    .update({ role_id: roleId })
    .eq('id', userId)
  
  if (error) {
    return { error: error.message }
  }
  revalidatePath('/teams')
  return { success: true }
}

export async function updateUserTeam(userId: string, teamId: string) {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('profiles')
    .update({ team_id: teamId })
    .eq('id', userId)

  if (error) {
    return { error: error.message }
  }
  revalidatePath('/teams')
  return { success: true }
}

export async function createProjectType(name: string) {
    const supabase = await createServerClient();
    const { data, error } = await supabase.from('project_types').insert({ name }).select().single();
    if (error) {
        return { error: error.message };
    }
    revalidatePath('/projects');
    return { data };
}

export async function renameProjectType(id: string, oldName: string, newName: string) {
    const supabase = await createServerClient();

    // First update all projects with the old type name
    const { error: projectsError } = await supabase
        .from('projects')
        .update({ type: newName })
        .eq('type', oldName);
    
    if (projectsError) {
        console.error('Error updating projects with new type name:', projectsError);
        return { error: `Failed to update projects: ${projectsError.message}` };
    }

    // Then update the project type itself
    const { data, error } = await supabase
        .from('project_types')
        .update({ name: newName })
        .eq('id', id)
        .select()
        .single();
        
    if (error) {
        console.error('Error renaming project type:', error);
        return { error: `Failed to rename project type: ${error.message}` };
    }
    
    revalidatePath('/projects');
    return { data };
}

export async function deleteProjectType(id: string) {
    const supabase = await createServerClient();
    const { error } = await supabase.from('project_types').delete().eq('id', id);

    if (error) {
        console.error('Error deleting project type:', error);
        return { error: `Failed to delete project type: ${error.message}` };
    }
    
    revalidatePath('/projects');
    return { success: true };
}

const months = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

export async function updateProfile(userId: string, formData: FormData) {
  const supabase = await createServerClient();

  const fullName = formData.get('full_name') as string;
  const contact = formData.get('contact') as string | null;
  const instagramUsername = formData.get('instagram_username') as string | null;
  const linkedinUsername = formData.get('linkedin_username') as string | null;
  const birthdayDay = formData.get('birthday_day') as string | null;
  const birthdayMonth = formData.get('birthday_month') as string | null;
  const avatarFile = formData.get('avatar') as File | null;
  
  const { data: currentProfile, error: fetchError } = await supabase.from('profiles').select('avatar_url').eq('id', userId).single();
  if (fetchError) {
    return { error: 'Could not fetch current profile' };
  }
  let avatarUrl = currentProfile.avatar_url;

  if (avatarFile && avatarFile.size > 0) {
      if (avatarUrl && !avatarUrl.includes('pravatar.cc')) {
          try {
            const oldAvatarPath = new URL(avatarUrl).pathname.split('/avatars/').pop();
            if (oldAvatarPath) {
                await supabase.storage.from('avatars').remove([oldAvatarPath]);
            }
          } catch (e) {
            console.error("Failed to parse or delete old avatar URL:", e);
          }
      }
      const newFilePath = `public/${Date.now()}_${avatarFile.name}`;
      const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(newFilePath, avatarFile);

      if (uploadError) {
          return { error: `Failed to upload new avatar: ${uploadError.message}` };
      }
      
      const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(newFilePath);
      
      avatarUrl = publicUrlData.publicUrl;
  }

  let instagramUrl = null;
  if (instagramUsername) {
    instagramUrl = `https://www.instagram.com/${instagramUsername}`;
  }

  let linkedinUrl = null;
  if (linkedinUsername) {
    linkedinUrl = `https://www.linkedin.com/in/${linkedinUsername}`;
  }

  let birthday = null;
  if (birthdayDay && birthdayMonth) {
    const monthIndex = months.indexOf(birthdayMonth);
    if (monthIndex > -1) {
      // Use a placeholder year like 2000, since we are not storing it.
      // Store as YYYY-MM-DD format in UTC
      const date = new Date(Date.UTC(2000, monthIndex, parseInt(birthdayDay, 10)));
      birthday = date.toISOString();
    }
  }

  const updates: { [key: string]: any } = {
    full_name: fullName,
    contact: contact,
    instagram: instagramUrl,
    linkedin: linkedinUrl,
    birthday,
    avatar_url: avatarUrl
  };

  const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().single();
  
  if (error) {
    return { error: error.message };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  if (supabaseAdmin) {
    await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
            full_name: fullName,
            avatar_url: avatarUrl,
        }
    })
  }

  revalidatePath('/settings');
  revalidatePath('/', 'layout');
  return { data };
}

export async function uploadAttachment(formData: FormData): Promise<{ data: Attachment | null, error: string | null }> {
  const supabase = await createServerClient();
  const file = formData.get('file') as File;

  if (!file) {
    return { data: null, error: 'No file provided.' };
  }

  const filePath = `public/${Date.now()}_${file.name}`;
  
  const { error: uploadError } = await supabase.storage
    .from('attachments')
    .upload(filePath, file);

  if (uploadError) {
    console.error('Error uploading attachment:', uploadError);
    return { data: null, error: uploadError.message };
  }

  const { data: publicUrlData } = supabase.storage
    .from('attachments')
    .getPublicUrl(filePath);

  if (!publicUrlData) {
    return { data: null, error: 'Could not get public URL for attachment.' };
  }

  const attachment: Attachment = {
    path: filePath,
    publicUrl: publicUrlData.publicUrl,
    name: file.name
  };

  return { data: attachment, error: null };
}

export async function schedule_task_attachment_deletion(task_id: string, delay_seconds: number) {
    const supabase = await createServerClient()
    const { error } = await supabase.rpc('schedule_task_attachment_deletion', {
        p_task_id: task_id,
        p_delay_seconds: delay_seconds
    })
    if (error) {
        console.error('Error scheduling attachment deletion:', error)
        return { error: error.message }
    }
    return { success: true }
}

export async function delete_task_attachments(task_id: string) {
    const supabase = await createServerClient();
    const { data: task, error: fetchError } = await supabase
        .from('tasks')
        .select('attachments')
        .eq('id', task_id)
        .single();

    if (fetchError || !task) {
        console.error('Could not fetch task to delete attachments:', fetchError);
        return { error: 'Could not fetch task to delete attachments' };
    }

    const attachments = task.attachments as Attachment[] | null;
    if (attachments && attachments.length > 0) {
        const paths = attachments.map(att => att.path);
        const { error: deleteError } = await supabase.storage.from('attachments').remove(paths);
        if (deleteError) {
            console.error('Error deleting attachments from storage:', deleteError);
            return { error: 'Failed to delete attachments from storage' };
        }
    }

    return { success: true };
}

export async function updateSetting(key: string, value: any) {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from('app_settings')
    .update({ value: value })
    .eq('key', key)
    .select()
    .single();

  if (error) {
    // If the setting doesn't exist, create it.
    if (error.code === 'PGRST116') {
      const { data: insertData, error: insertError } = await supabase
        .from('app_settings')
        .insert({ key, value })
        .select()
        .single();
      
      if (insertError) {
        return { error: `Failed to create setting: ${insertError.message}` };
      }
      revalidatePath('/accessibility');
      revalidatePath('/dashboard', 'layout'); // Revalidate layout to update header
      return { data: insertData };
    }
    return { error: `Failed to update setting: ${error.message}` };
  }

  revalidatePath('/accessibility');
  revalidatePath('/dashboard', 'layout'); // Revalidate layout to update header
  return { data };
}


export async function getPublicHolidays(year: number, countryCode: string): Promise<{ data?: any[], error?: string | null }> {
    try {
        const API_KEY = process.env.GOOGLE_API_KEY;
        if (!API_KEY) {
          const msg = 'Google API Key is not set in environment variables (GOOGLE_API_KEY)';
          console.error(msg);
          return { error: msg };
        }

        const calendar = google.calendar({ version: 'v3' });
        
        let calendarId = `en.${countryCode.toLowerCase()}#holiday@group.v.calendar.google.com`;
        if (countryCode.toLowerCase() === 'in') {
          calendarId = `en.indian#holiday@group.v.calendar.google.com`;
        }

        const response = await calendar.events.list({
            calendarId,
            key: API_KEY,
            timeMin: `${year}-01-01T00:00:00Z`,
            timeMax: `${year}-12-31T23:59:59Z`,
            singleEvents: true,
            orderBy: 'startTime',
        });
        
        const holidays = response.data.items?.map(item => ({
            date: item.start?.date,
            localName: item.summary,
            name: item.summary,
            countryCode: countryCode,
        })) || [];
        
        return { data: holidays as any[], error: null };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error fetching public holidays from Google Calendar:', errorMessage);
        if (errorMessage.includes('API key not valid')) {
            return { data: [], error: 'The provided Google API Key is not valid.' };
        }
        if (errorMessage.includes('Not Found')) {
             return { data: [], error: `Could not find holiday calendar for country code: ${countryCode}`};
        }
        return { data: [], error: `An unexpected error occurred while fetching holidays: ${errorMessage}` };
    }
}

export async function addHoliday(formData: FormData) {
    const supabase = await createServerClient();
    const name = formData.get('name') as string;
    const date = formData.get('date') as string;
    const description = formData.get('description') as string;
    const userId = formData.get('user_id') as string | null;
    const type = formData.get('type') as OfficialHoliday['type'];
    const falaqEventType = formData.get('falaq_event_type') as OfficialHoliday['falaq_event_type'] | null;

    const { data, error } = await supabase
        .from('official_holidays')
        .insert({ 
            name, 
            date, 
            description, 
            user_id: userId, 
            type,
            falaq_event_type: falaqEventType,
            is_deleted: false,
        })
        .select()
        .single();
    
    if (error) {
        return { error: error.message };
    }
    
    revalidatePath('/calendar');
    return { data: data as OfficialHoliday };
}

export async function updateHoliday(id: number, formData: FormData) {
    const supabase = await createServerClient();
    const name = formData.get('name') as string;
    const date = formData.get('date') as string;
    const description = formData.get('description') as string;
    const falaqEventType = formData.get('falaq_event_type') as OfficialHoliday['falaq_event_type'] | null;

    const { data, error } = await supabase
        .from('official_holidays')
        .update({ 
            name, 
            date, 
            description,
            falaq_event_type: falaqEventType,
        })
        .eq('id', id)
        .select()
        .single();
    
    if (error) {
        return { error: error.message };
    }
    
    revalidatePath('/calendar');
    return { data: data as OfficialHoliday };
}


export async function deleteHoliday(id: number) {
    const supabase = await createServerClient();
    const { error } = await supabase
        .from('official_holidays')
        .update({ is_deleted: true })
        .eq('id', id);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/calendar');
    return { success: true };
}

export async function addIndustry(name: string): Promise<{ data: Industry | null, error: string | null }> {
    const supabase = await createServerClient();
    const { data, error } = await supabase.from('industries').insert({ name }).select().single();
    if (error) return { data: null, error: error.message };
    revalidatePath('/accessibility');
    return { data, error: null };
}

export async function renameIndustry(id: number, name: string): Promise<{ data: Industry | null, error: string | null }> {
    const supabase = await createServerClient();
    const { data, error } = await supabase.from('industries').update({ name }).eq('id', id).select().single();
    if (error) return { data: null, error: error.message };
    revalidatePath('/accessibility');
    return { data, error: null };
}

export async function deleteIndustry(id: number): Promise<{ error: string | null }> {
    const supabase = await createServerClient();
    const { error } = await supabase.from('industries').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidatePath('/accessibility');
    return { error: null };
}

export async function addWorkType(name: string): Promise<{ data: WorkType | null, error: string | null }> {
    const supabase = await createServerClient();
    const { data, error } = await supabase.from('work_types').insert({ name }).select().single();
    if (error) return { data: null, error: error.message };
    revalidatePath('/accessibility');
    return { data, error: null };
}

export async function renameWorkType(id: number, name: string): Promise<{ data: WorkType | null, error: string | null }> {
    const supabase = await createServerClient();
    const { data, error } = await supabase.from('work_types').update({ name }).eq('id', id).select().single();
    if (error) return { data: null, error: error.message };
    revalidatePath('/accessibility');
    return { data, error: null };
}

export async function deleteWorkType(id: number): Promise<{ error: string | null }> {
    const supabase = await createServerClient();
    const { error } = await supabase.from('work_types').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidatePath('/accessibility');
    return { error: null };
}

export async function addSchedule(formData: FormData): Promise<{ data?: ContentSchedule, error?: string }> {
    const supabase = await createServerClient();

    const rawData = {
        client_id: formData.get('client_id') as string,
        title: formData.get('title') as string,
        content_type: formData.get('content_type') as string,
        scheduled_date: formData.get('scheduled_date') as string,
        team_id: formData.get('team_id') as string,
        project_id: formData.get('project_id') === 'no-project' ? null : formData.get('project_id') as string | null,
    };

    if (!rawData.client_id || !rawData.title || !rawData.scheduled_date || !rawData.content_type || !rawData.team_id) {
        return { error: "Client, title, content type, team, and scheduled date are required." };
    }

    const { data, error } = await supabase
        .from('content_schedules')
        .insert({
            ...rawData,
            status: 'Planned',
            is_deleted: false,
        })
        .select()
        .single();
    
    if (error) {
        console.error("Error adding schedule:", error);
        return { error: error.message };
    }

    revalidatePath('/scheduler');
    return { data: data as ContentSchedule };
}

export async function updateSchedule(scheduleId: string, formData: FormData): Promise<{ data?: ContentSchedule, error?: string }> {
    const supabase = await createServerClient();

    const rawData = {
        title: formData.get('title') as string,
        content_type: formData.get('content_type') as string,
        scheduled_date: formData.get('scheduled_date') as string,
        team_id: formData.get('team_id') as string,
        project_id: formData.get('project_id') === 'no-project' ? null : formData.get('project_id') as string | null,
    };

    if (!rawData.title || !rawData.scheduled_date || !rawData.content_type || !rawData.team_id) {
        return { error: "Title, content type, team, and scheduled date are required." };
    }

    const { data, error } = await supabase
        .from('content_schedules')
        .update(rawData)
        .eq('id', scheduleId)
        .select()
        .single();
    
    if (error) {
        console.error("Error updating schedule:", error);
        return { error: error.message };
    }

    revalidatePath('/scheduler');
    return { data: data as ContentSchedule };
}

export async function deleteSchedule(scheduleId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createServerClient();
    const { error } = await supabase.from('content_schedules').update({ is_deleted: true }).eq('id', scheduleId);
    if (error) {
        return { success: false, error: error.message };
    }
    revalidatePath('/scheduler');
    return { success: true };
}

export async function restoreSchedule(scheduleId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createServerClient();
    const { error } = await supabase.from('content_schedules').update({ is_deleted: false }).eq('id', scheduleId);
    if (error) {
        return { success: false, error: error.message };
    }
    revalidatePath('/scheduler');
    return { success: true };
}

export async function deleteSchedulePermanently(scheduleId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createServerClient();
    const { error } = await supabase.from('content_schedules').delete().eq('id', scheduleId);
    if (error) {
        return { success: false, error: error.message };
    }
    revalidatePath('/scheduler');
    return { success: true };
}

export async function createTaskFromSchedule(schedule: ContentSchedule): Promise<{ data?: Task, error?: string }> {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "You must be logged in to assign tasks." };
    }

    if (!schedule.team_id) {
        return { error: "Cannot assign task: schedule is not associated with a team." };
    }

    // Find the first member of the team to assign the task to.
    // In a real-world scenario, this logic might be more complex (e.g., round-robin, load balancing, etc.)
    const { data: teamMembers, error: teamMembersError } = await supabase
        .from('profile_teams')
        .select('profile_id')
        .eq('team_id', schedule.team_id)
        .limit(1);

    if (teamMembersError || !teamMembers || teamMembers.length === 0) {
        return { error: `No members found for team to assign the task. Error: ${teamMembersError?.message}` };
    }
    
    const assigneeId = teamMembers[0].profile_id;

    const taskData = {
        description: schedule.title,
        client_id: schedule.client_id,
        deadline: schedule.scheduled_date,
        type: schedule.content_type,
        schedule_id: schedule.id,
        assignee_id: assigneeId,
        status: 'todo' as const,
        project_id: schedule.project_id,
    };

    const { data: newTask, error: createTaskError } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single();
    
    if (createTaskError) {
        console.error('Error creating task from schedule:', createTaskError);
        return { error: createTaskError.message };
    }

    // No need to revalidate here, as the client-side will handle the optimistic update
    return { data: newTask as Task };
}

    