

'use server'

import { revalidatePath } from 'next/cache'
import { prioritizeTasksByDeadline, type PrioritizeTasksInput } from '@/ai/flows/prioritize-tasks-by-deadline'
import type { TaskWithAssignee, Attachment } from '@/lib/types'
import { createServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function addProject(formData: FormData) {
  const supabase = createServerClient()
  
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
    .select('*, client:clients(*)')
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
    const supabase = createServerClient()
    
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
    const supabase = createServerClient();
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
    const supabase = createServerClient()

    const { error } = await supabase
        .from('projects')
        .update({ is_deleted: true })
        .eq('id', projectId);

    if (error) {
        return { error: `Failed to delete project: ${error.message}` };
    }

    revalidatePath('/dashboard');
    revalidatePath('/projects');
    return { success: true };
}

export async function restoreProject(projectId: string) {
    const supabase = createServerClient()

    const { error } = await supabase
        .from('projects')
        .update({ is_deleted: false })
        .eq('id', projectId);

    if (error) {
        return { error: `Failed to restore project: ${error.message}` };
    }

    revalidatePath('/projects');
    return { success: true };
}

export async function deleteProjectPermanently(projectId: string) {
    const supabase = createServerClient()
    
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
  const supabase = createServerClient()
  
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
    const supabase = createServerClient()
    
    const taskData = {
        description: formData.get('description') as string,
        deadline: new Date(formData.get('deadline') as string).toISOString(),
        assignee_id: formData.get('assigneeId') as string,
        tags: (formData.get('tags') as string)?.split(',').map(tag => tag.trim()).filter(Boolean),
        project_id: formData.get('project_id') === 'no-project' ? null : formData.get('project_id') as string,
        client_id: formData.get('client_id') as string,
        type: formData.get('type') as string,
    }

    const { data, error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', taskId)
        .select()
        .single();
        
    if (error) {
        return { error: error.message }
    }

    revalidatePath('/tasks')
    return { data }
}

export async function updateTaskStatus(taskId: string, status: 'todo' | 'inprogress' | 'done') {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', taskId);
  
  if (error) {
    console.error('Error updating task status:', error);
    return { error: error.message };
  }

  revalidatePath('/tasks');
  revalidatePath('/dashboard');
  return { success: true };
}


export async function deleteTask(taskId: string) {
  const supabase = createServerClient()
  const { error } = await supabase.from('tasks').update({ is_deleted: true }).eq('id', taskId)
  
  if (error) {
    return { error: error.message }
  }

  revalidatePath('/tasks')
  return { success: true }
}

export async function restoreTask(taskId: string) {
  const supabase = createServerClient()
  const { error } = await supabase.from('tasks').update({ is_deleted: false }).eq('id', taskId)
  
  if (error) {
    return { error: error.message }
  }

  revalidatePath('/tasks')
  return { success: true }
}

export async function deleteTaskPermanently(taskId: string) {
  const supabase = createServerClient()
  const { error } = await supabase.from('tasks').delete().eq('id', taskId)
  
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
  const supabase = createServerClient();
  
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
    const supabase = createServerClient();
    
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

        const { data: publicUrlData } = supabase.storage
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
    const supabase = createServerClient();

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
  const supabase = createServerClient()
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
  const supabase = createServerClient()
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
  const supabase = createServerClient()
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
    const supabase = createServerClient()
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
    
    const { data: profileData, error: profileError } = await createServerClient()
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
  const supabase = createServerClient()
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
  const supabase = createServerClient()
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
    const supabase = createServerClient();
    const { data, error } = await supabase.from('project_types').insert({ name }).select().single();
    if (error) {
        return { error: error.message };
    }
    revalidatePath('/projects');
    return { data };
}

export async function renameProjectType(id: string, oldName: string, newName: string) {
    const supabase = createServerClient();

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
    const supabase = createServerClient();
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
  const supabase = createServerClient();

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
  const supabase = createServerClient();
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
    const supabase = createServerClient()
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
    const supabase = createServerClient();
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
