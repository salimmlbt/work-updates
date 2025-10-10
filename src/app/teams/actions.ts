
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { RoleWithPermissions, PermissionLevel, Profile } from '@/lib/types'
import { revalidatePath } from 'next/cache'

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
        .from('profile_teams')
        .delete()
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
    const supabaseAdmin = createSupabaseAdminClient()
    
    const fullName = formData.get('full_name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const roleId = formData.get('role_id') as string;
    const teamIds = (formData.get('team_ids') as string).split(',').filter(Boolean);
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

        if (!publicUrlData) {
            return { error: 'Could not get public URL for avatar.' };
        }
        
        avatarUrl = publicUrlData.publicUrl;
    }


    // 1. Create the user in Supabase Auth, passing profile data to be handled by a trigger
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
    
    // 2. Update the newly created profile with the role_id
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role_id: roleId })
      .eq('id', authData.user.id);

    if (profileError) {
        // If updating the profile fails, we should delete the auth user to avoid orphaned accounts.
        if (supabaseAdmin) {
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        }
        return { error: `Failed to assign role to user: ${profileError.message}` };
    }

    // 3. Link user to teams
    if (teamIds.length > 0) {
      const teamLinks = teamIds.map(team_id => ({ profile_id: authData.user!.id, team_id }));
      const { error: teamLinkError } = await supabase.from('profile_teams').insert(teamLinks);
      if (teamLinkError) {
        // Rollback profile and auth user creation
         if (supabaseAdmin) {
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        }
        return { error: `Failed to link user to teams: ${teamLinkError.message}` };
      }
    }
    
    // 4. Fetch the complete profile data to return to the client
    const { data: finalProfileData, error: finalFetchError } = await supabase.from('profiles').select('*, roles(*), teams:profile_teams(teams(*))').eq('id', authData.user.id).single();

    if (finalFetchError) {
        return { error: `Failed to fetch newly created user profile: ${finalFetchError.message}` };
    }


    revalidatePath('/teams')
    return { data: finalProfileData as Profile }
}

export async function updateUser(userId: string, formData: FormData) {
    const supabase = createServerClient();
    const supabaseAdmin = createSupabaseAdminClient();

    const fullName = formData.get('full_name') as string;
    const roleId = formData.get('role_id') as string;
    const teamIds = (formData.get('team_ids')as string).split(',').filter(Boolean);
    const newPassword = formData.get('password') as string | null;
    const avatarFile = formData.get('avatar') as File | null;
    
    const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', userId)
        .single();
    
    if (fetchError) {
        return { error: `Could not fetch user data: ${fetchError.message}` };
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

    // Update profile in 'profiles' table
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update({
            full_name: fullName,
            role_id: roleId,
            avatar_url: avatarUrl,
        })
        .eq('id', userId)
        .select('full_name, avatar_url, roles(*)')
        .single();

    if (profileError) {
        return { error: `Failed to update user profile: ${profileError.message}` };
    }
    
    // Update team memberships
    const { error: deleteTeamsError } = await supabase.from('profile_teams').delete().eq('profile_id', userId);
    if (deleteTeamsError) {
      return { error: `Failed to update teams: ${deleteTeamsError.message}` };
    }
    if (teamIds.length > 0) {
      const teamLinks = teamIds.map(team_id => ({ profile_id: userId, team_id }));
      const { error: teamLinkError } = await supabase.from('profile_teams').insert(teamLinks);
      if (teamLinkError) {
        return { error: `Failed to update teams: ${teamLinkError.message}` };
      }
    }


    const authUpdateData: { password?: string; data?: any } = {};
    if (newPassword) {
        authUpdateData.password = newPassword;
    }

    if (profileData && (avatarUrl !== currentProfile.avatar_url || fullName !== profileData.full_name)) {
        authUpdateData.data = {
            ...profileData,
            full_name: fullName,
            avatar_url: avatarUrl,
        };
    }

    if (supabaseAdmin && Object.keys(authUpdateData).length > 0) {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            authUpdateData
        );

        if (authError) {
            return { error: `Failed to update auth data: ${authError.message}` };
        }
    } else if (Object.keys(authUpdateData).length > 0 && !supabaseAdmin) {
        return { error: "Cannot update password or auth metadata. Admin client is not available." };
    }
    
    const { data: finalProfileData } = await supabase.from('profiles').select('*, roles(*), teams:profile_teams(teams(*))').eq('id', userId).single();

    revalidatePath('/teams');
    return { data: finalProfileData as Profile };
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

export async function updateUserTeams(userId: string, teamIds: string[]) {
  const supabase = createServerClient()
  
  // First, remove all existing team associations for the user
  const { error: deleteError } = await supabase
    .from('profile_teams')
    .delete()
    .eq('profile_id', userId);

  if (deleteError) {
    return { error: `Failed to remove old teams: ${deleteError.message}` };
  }

  // Then, add the new team associations
  if (teamIds.length > 0) {
    const newLinks = teamIds.map(team_id => ({ profile_id: userId, team_id }));
    const { error: insertError } = await supabase.from('profile_teams').insert(newLinks);

    if (insertError) {
      return { error: `Failed to add new teams: ${insertError.message}` };
    }
  }

  revalidatePath('/teams');
  return { success: true };
}

export async function updateUserIsArchived(userId: string, isArchived: boolean) {
  const supabase = createServerClient();
  const supabaseAdmin = createSupabaseAdminClient();

  if (!supabaseAdmin) {
    return { error: "Admin client not initialized. Service key may be missing." };
  }

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
    // Revert the profile update
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
