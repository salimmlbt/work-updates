
'use server'

import { revalidatePath } from 'next/cache'
import { prioritizeTasksByDeadline, type PrioritizeTasksInput } from '@/ai/flows/prioritize-tasks-by-deadline'
import type { TaskWithAssignee } from '@/lib/types'
import { createServerClient } from '@/lib/supabase/server'

export async function addProject(formData: FormData) {
  const supabase = createServerClient()
  
  const rawFormData = {
    name: formData.get('name') as string,
    client_id: formData.get('client_id') as string | null,
    start_date: formData.get('start_date') as string | null,
    due_date: formData.get('due_date') as string | null,
    status: formData.get('status') as string,
    priority: formData.get('priority') as string,
    members: (formData.get('members') as string).split(',').filter(Boolean),
    type: formData.get('type') as string | null,
  }

  if (!rawFormData.name) {
    return { error: 'Project name is required.' }
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      name: rawFormData.name,
      owner_id: null,
      client_id: rawFormData.client_id === 'no-client' ? null : rawFormData.client_id,
      start_date: rawFormData.start_date ? new Date(rawFormData.start_date).toISOString() : null,
      due_date: rawFormData.due_date ? new Date(rawFormData.due_date).toISOString() : null,
      status: rawFormData.status,
      priority: rawFormData.priority,
      members: rawFormData.members,
      type: rawFormData.type,
    })
    .select()
    .single()

  if (projectError) {
    console.error('Error creating project:', projectError)
    return { error: projectError.message }
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
        members: (formData.get('members') as string).split(',').filter(Boolean),
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
            members: rawFormData.members,
            type: rawFormData.type,
        })
        .eq('id', projectId)
        .select()
        .single()

    if (projectError) {
        console.error('Error updating project:', projectError)
        return { error: projectError.message }
    }

    revalidatePath('/dashboard')
    revalidatePath('/projects')
    return { data: project }
}

export async function deleteProject(projectId: string) {
    const supabase = createServerClient()

    // First, delete associated tasks
    const { error: tasksError } = await supabase.from('tasks').delete().eq('project_id', projectId);
    if (tasksError) {
        return { error: `Failed to delete project tasks: ${tasksError.message}` };
    }

    // Then, delete the project
    const { error: projectError } = await supabase.from('projects').delete().eq('id', projectId);
    if (projectError) {
        return { error: `Failed to delete project: ${projectError.message}` };
    }

    revalidatePath('/dashboard');
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
  
  const { error } = await supabase.from('tasks').insert(taskData)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateTaskStatus(taskId: string, status: 'todo' | 'inprogress' | 'done') {
  const supabase = createServerClient()
  const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId)
  
  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
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
  const placeholderUserId = '00000000-0000-0000-0000-000000000000';

  const { data, error } = await supabase
    .from('teams')
    .insert({ 
      name, 
      default_tasks: defaultTasks,
      owner_id: placeholderUserId 
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
    const supabase = createServerClient()

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email!,
      password: userData.password,
      options: {
        data: {
          full_name: userData.full_name,
          avatar_url: userData.avatar_url,
        }
      }
    })

    if (authError) {
      return { error: authError.message }
    }

    if (!authData.user) {
      return { error: "User could not be created in Auth."}
    }
    
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name: userData.full_name,
        email: userData.email,
        avatar_url: userData.avatar_url,
        role_id: userData.role_id,
        team_id: userData.team_id,
      })
      .select('*, roles(*), teams(*)')
      .single();

    if (profileError) {
        await supabase.auth.admin.deleteUser(authData.user.id);
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
