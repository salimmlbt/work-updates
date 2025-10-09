
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { RoleWithPermissions, PermissionLevel, Profile } from '@/lib/types'
import { revalidatePath } from 'next/cache'

export async function createTeam(name: string, defaultTasks: string[]) {
  const supabase = createServerClient()
  // Using a placeholder since auth is removed.
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

export async function updateTeam(id: string, name: string) {
    const supabase = createServerClient()
    const { data, error } = await supabase
        .from('teams')
        .update({ name })
        .eq('id', id)
        .select()
        .single()

    if (error) {
        return { error: error.message }
    }
    revalidatePath('/teams')
    return { data }
}

export async function deleteTeam(id: string) {
    const supabase = createServerClient()

    // Unassign users from the team first
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ team_id: null })
        .eq('team_id', id)

    if (updateError) {
        return { error: `Failed to unassign users: ${updateError.message}` }
    }

    // Then delete the team
    const { error: deleteError } = await supabase.from('teams').delete().eq('id', id)

    if (deleteError) {
        // Re-assign users if delete fails? Or handle it differently.
        // For now, just return the error.
        return { error: `Failed to delete team: ${deleteError.message}` }
    }

    revalidatePath('/teams')
    return { success: true }
}

export async function createRole(name: string, permissions: Record<string, PermissionLevel>) {
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

export async function updateRole(id: string, name: string, permissions: Record<string, PermissionLevel>) {
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

export async function addUser(formData: FormData) {
    const supabase = createServerClient()
    
    const fullName = formData.get('full_name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const roleId = formData.get('role_id') as string;
    const teamId = formData.get('team_id') as string;
    const avatarFile = formData.get('avatar') as File | null;
    
    let avatarUrl = `https://i.pravatar.cc/150?u=${email}`;

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
        
        avatarUrl = publicUrlData.publicUrl;
    }


    // 1. Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName,
          avatar_url: avatarUrl,
        }
      }
    })

    if (authError) {
      return { error: authError.message }
    }

    if (!authData.user) {
      return { error: "User could not be created in Auth."}
    }
    
    // 2. Create the user profile in the 'profiles' table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name: fullName,
        email: email,
        avatar_url: avatarUrl,
        role_id: roleId,
        team_id: teamId,
        status: 'Active',
        is_archived: false,
      })
      .select('*, roles(*), teams(*)')
      .single();

    if (profileError) {
        // If profile creation fails, we should ideally delete the auth user
        // to avoid orphaned auth users.
        const supabaseAdmin = createSupabaseAdminClient();
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return { error: `Failed to create user profile: ${profileError.message}` };
    }

    revalidatePath('/teams')
    return { data: profileData as Profile }
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

export async function updateUserTeam(userId: string, teamId: string | null) {
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

export async function updateUserIsArchived(userId: string, isArchived: boolean) {
  const supabase = createServerClient();
  const supabaseAdmin = createSupabaseAdminClient();

  // 1. Update the is_archived status in the profiles table
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ is_archived: isArchived })
    .eq('id', userId);

  if (profileError) {
    console.error('Error updating profile:', profileError);
    return { error: `Could not update user status: ${profileError.message}` };
  }

  // 2. Ban or un-ban the user in Supabase Auth
  const oneHundredYearsInHours = '876000h';
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    {
      ban_duration: isArchived ? oneHundredYearsInHours : 'none',
    }
  );

  if (authError) {
    console.error('Error updating user ban status:', authError);
    // Optionally, revert the profile update
    await supabase.from('profiles').update({ is_archived: !isArchived }).eq('id', userId);
    return { error: `Could not update user auth status: ${authError.message}` };
  }

  revalidatePath('/teams', 'layout');
  return { success: true };
}

export async function updateUserStatus(userId: string, status: 'Active' | 'Archived') {
    const supabase = createServerClient();
    const { error } = await supabase.from('profiles').update({ status }).eq('id', userId);
    
    if (error) {
        return { error: error.message };
    }
    
    revalidatePath('/teams');
    return { success: true };
}
