
'use client'

import { useState, useEffect, useTransition, useMemo } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
  DropdownMenuSeparator,
	DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Plus, MoreVertical, Pencil, Trash2, Archive, UserCog, ChevronDown, Check } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import type { Profile, Role, Team } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CreateTeamDialog } from './create-team-dialog';
import { AddUserDialog } from './add-user-dialog';
import { EditUserDialog } from './edit-user-dialog';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { updateUserRole, updateUserTeams, deleteTeam, updateUserIsArchived } from './actions';
import { useToast } from '@/hooks/use-toast';
import { RenameTeamDialog } from './rename-team-dialog'
import { ScrollArea } from '@/components/ui/scroll-area';

interface TeamsClientProps {
	initialUsers: Profile[];
	initialRoles: Role[];
	initialTeams: Team[];
}

export default function TeamsClient({ initialUsers, initialRoles, initialTeams }: TeamsClientProps) {
	const [selectedTeam, setSelectedTeam] = useState('All teams');
	const [isCreateTeamOpen, setCreateTeamOpen] = useState(false);
	const [isAddUserOpen, setAddUserOpen] = useState(false);
	const [isEditUserOpen, setEditUserOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<Profile | null>(null);
	const [teams, setTeams] = useState(initialTeams);
	const [users, setUsers] = useState(initialUsers);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [isRenameTeamOpen, setRenameTeamOpen] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [userToArchive, setUserToArchive] = useState<Profile | null>(null);
  const [isArchiveAlertOpen, setArchiveAlertOpen] = useState(false);
  const [activeUsersOpen, setActiveUsersOpen] = useState(true);
  const [archivedUsersOpen, setArchivedUsersOpen] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

	const onTeamCreated = (newTeam: Team) => {
    setTeams(prev => [...prev, newTeam]);
  };

  const onTeamUpdated = (updatedTeam: Team) => {
    setTeams(prev => prev.map(t => t.id === updatedTeam.id ? updatedTeam : t));
     if (selectedTeam === teamToEdit?.name) {
        setSelectedTeam(updatedTeam.name);
    }
    setTeamToEdit(null);
  };

  const openRenameDialog = (team: Team) => {
    setTeamToEdit(team);
    setRenameTeamOpen(true);
  };

  const openDeleteDialog = (team: Team) => {
    setTeamToDelete(team);
  };

  const onUserAdded = (newUser: Profile) => {
    setUsers(prev => [...prev, newUser]);
  }

  const onUserUpdated = (updatedUser: Profile) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    setEditUserOpen(false);
    setUserToEdit(null);
  }

  const handleEditUserClick = (user: Profile) => {
    setUserToEdit(user);
    setEditUserOpen(true);
  }

  const handleRoleChange = (userId: string, roleId: string) => {
    startTransition(async () => {
        const { error } = await updateUserRole(userId, roleId);
        if (error) {
            toast({ title: "Error updating role", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Role updated successfully" });
            setUsers(prevUsers => prevUsers.map(u => u.id === userId ? {...u, role_id: roleId, roles: initialRoles.find(r => r.id === roleId) || null} : u));
        }
    });
  }

  const handleTeamChange = (userId: string, teamIds: string[]) => {
      startTransition(async () => {
        const { error } = await updateUserTeams(userId, teamIds);
        if (error) {
            toast({ title: "Error updating teams", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Teams updated successfully" });
            const updatedTeamsForUser = teamIds.map(id => ({ teams: teams.find(t => t.id === id)}));
            setUsers(prevUsers => prevUsers.map(u => u.id === userId ? {...u, teams: updatedTeamsForUser as any } : u));
        }
      });
  }

  const handleDeleteTeam = () => {
    if (!teamToDelete) return;
    startTransition(async () => {
        const { error } = await deleteTeam(teamToDelete.id);
        if (error) {
            toast({ title: "Error deleting team", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Team deleted", description: `Team "${teamToDelete.name}" has been deleted.` });
            setTeams(prev => prev.filter(t => t.id !== teamToDelete.id));
            if (selectedTeam === teamToDelete.name) {
                setSelectedTeam('All teams');
            }
        }
        setTeamToDelete(null);
    });
  }

  const handleUpdateUserArchived = (user: Profile, isArchived: boolean) => {
      startTransition(async () => {
          const result = await updateUserIsArchived(user.id, isArchived);
          if (result.error) {
              toast({
                  title: `Error ${isArchived ? 'archiving' : 'restoring'} user`,
                  description: result.error,
                  variant: 'destructive',
              });
          } else {
              toast({
                  title: `User ${isArchived ? 'Archived' : 'Restored'}`,
                  description: `${user.full_name} has been ${isArchived ? 'archived' : 'restored'}.`,
              });
              setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_archived: isArchived } : u));
          }
      });
      setUserToArchive(null);
      setArchiveAlertOpen(false);
  };

  const usersWithData = useMemo(() => users.map((user) => {
    const isAdmin = user.email === 'admin@falaq.com';
    const userTeams = Array.isArray(user.teams) ? user.teams.map(t => t.teams).filter(Boolean) as Team[] : [];
    
    return {
      ...user,
      teams: userTeams,
      role: isAdmin ? initialRoles.find(r => r.name === 'Falaq Admin') : user.roles,
      is_archived: user.is_archived || false,
      isAdmin
    }
  }).sort((a, b) => {
    if (a.isAdmin && !b.isAdmin) return -1;
    if (!a.isAdmin && b.isAdmin) return 1;
    return (a.full_name || '').localeCompare(b.full_name || '');
  }), [users, initialRoles]);

	const adminUser = usersWithData.find(user => user.isAdmin);
  const otherUsers = usersWithData.filter(user => !user.isAdmin);

  const teamFilteredUsers = selectedTeam === 'All teams'
    ? otherUsers
    : otherUsers.filter(user => user.teams.some(t => t.name === selectedTeam));

  const activeUsers = teamFilteredUsers.filter(u => !u.is_archived);
  const archivedUsers = teamFilteredUsers.filter(u => u.is_archived);

	const teamUserCounts = useMemo(() => teams.reduce((acc, team) => {
		acc[team.id] = usersWithData.filter(u => u.teams.some(t => t.id === team.id)).length;
		return acc;
	}, {} as Record<string, number>), [teams, usersWithData]);

  const UserRow = ({ user }: { user: (typeof usersWithData)[0] }) => {
    const userTeamIds = user.teams.map(t => t.id);

    return (
        <div className="grid grid-cols-5 items-center py-3 px-4 group">
            <div className="col-span-1 flex items-center gap-3">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url ?? undefined} />
                    <AvatarFallback>{getInitials(user.full_name || user.email)}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{currentUser?.id === user.id ? 'Me' : (user.full_name || 'No name')}</span>
            </div>
            <div className="col-span-1 text-muted-foreground">{user.email}</div>
            <div className="col-span-1">
                {user.isAdmin ? (
                    <div className="text-sm px-3 py-2">All teams</div>
                ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="w-full justify-start text-left font-normal h-auto min-h-10" disabled={isPending || user.is_archived}>
                          <div className="flex flex-wrap gap-1">
                            {user.teams.length > 0 
                              ? user.teams.map(t => <Badge key={t.id} variant="secondary">{t.name}</Badge>)
                              : <span className="text-muted-foreground">No team</span>
                            }
                          </div>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                        <ScrollArea className="h-60">
                          {teams.map(team => (
                            <DropdownMenuCheckboxItem
                              key={team.id}
                              checked={userTeamIds.includes(team.id)}
                              onCheckedChange={(checked) => {
                                const newTeamIds = checked 
                                  ? [...userTeamIds, team.id]
                                  : userTeamIds.filter(id => id !== team.id);
                                handleTeamChange(user.id, newTeamIds);
                              }}
                            >
                              {team.name}
                            </DropdownMenuCheckboxItem>
                          ))}
                        </ScrollArea>
                      </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
            <div className="col-span-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start text-left font-normal" disabled={isPending || user.is_archived || user.isAdmin}>
                      {user.role ? user.role.name : <span className="text-muted-foreground">No role</span>}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                     {initialRoles.filter(r => r.name !== 'Falaq Admin').map(role => (
                        <DropdownMenuItem key={role.id} onSelect={() => handleRoleChange(user.id, role.id)} className={cn(user.role?.id === role.id && 'bg-accent')}>
                           {role.name}
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="col-span-1 flex justify-between items-center">
                <Badge variant="outline" className={cn(
                    !user.is_archived ? 'border-green-500 text-green-700 bg-green-50' : 'border-gray-500 text-gray-700 bg-gray-50'
                )}>
                    <span className={cn('h-2 w-2 rounded-full mr-2', !user.is_archived ? 'bg-green-500' : 'bg-gray-500')}></span>
                    {user.is_archived ? 'Archived' : 'Active'}
                </Badge>
                {currentUser?.id !== user.id && !user.isAdmin && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                              {!user.is_archived ? (
                                <>
                                  <DropdownMenuItem onClick={() => handleEditUserClick(user as Profile)}>
                                      <UserCog className="mr-2 h-4 w-4" />
                                      Edit User
                                  </DropdownMenuItem>
                                   {!user.isAdmin && (
                                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => { setUserToArchive(user as Profile); setArchiveAlertOpen(true); }}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Archive
                                    </DropdownMenuItem>
                                  )}
                                </>
                              ) : (
                                <>
                                  <DropdownMenuItem onClick={() => handleUpdateUserArchived(user as Profile, false)}>
                                      <Archive className="mr-2 h-4 w-4" />
                                      Restore User
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-red-600 focus:text-red-600">
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Permanently delete user
                                  </DropdownMenuItem>
                                </>
                              )}
                          </DropdownMenuContent>
                      </DropdownMenu>
                  </div>
                )}
            </div>
        </div>
    );
  };


	return (
		<>
			<div className="flex flex-col md:flex-row gap-8">
				<aside className="w-full md:w-64">
					<h2 className="text-lg font-bold mb-4">Teams</h2>
					<div className="space-y-1">
						<div
							role="button"
							onClick={() => setSelectedTeam('All teams')}
							className={cn(
								buttonVariants({ variant: 'ghost' }),
								'w-full justify-between pr-8',
								selectedTeam === 'All teams'
									? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50'
									: 'hover:bg-accent'
							)}
						>
							<span>All teams</span>
							<span className="text-muted-foreground">{usersWithData.length} users</span>
						</div>
						{teams.map(team => (
							<div key={team.id} className="relative group flex items-center">
								<div
									role="button"
									onClick={() => setSelectedTeam(team.name)}
									className={cn(
										buttonVariants({ variant: 'ghost' }),
										'w-full justify-start text-left h-auto pr-8 group',
										selectedTeam === team.name
											? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50'
											: 'group-hover:bg-accent group-has-[[data-state=open]]:bg-accent'
									)}
								>
									<div className="flex justify-between w-full items-center">
										<span>{team.name}</span>
										<span className="text-muted-foreground">{teamUserCounts[team.id] || 0} users</span>
									</div>
								</div>
								<div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												className="h-7 w-7 !p-0 !bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 data-[state=open]:bg-gray-100 dark:data-[state=open]:bg-gray-800 focus:!bg-transparent focus:!ring-0 focus:!ring-offset-0 !shadow-none text-gray-500 hover:text-blue-500 data-[state=open]:text-blue-500 transition-colors"
											>
												<MoreVertical className="h-4 w-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent>
											<DropdownMenuItem onClick={() => openRenameDialog(team)}>
												<Pencil className="mr-2 h-4 w-4" />
												Rename team
											</DropdownMenuItem>
											<DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => openDeleteDialog(team)}>
												<Trash2 className="mr-2 h-4 w-4" />
												Delete team
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							</div>
						))}
						<Button
              variant="ghost"
              className="mt-2 text-muted-foreground inline-flex p-0 h-auto hover:bg-transparent hover:text-blue-500 focus:ring-0 focus:ring-offset-0 px-0"
              onClick={() => setCreateTeamOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Create team
            </Button>
					</div>
				</aside>

				<main className="flex-1">
                    <div className="mb-8">
                        <button onClick={() => setActiveUsersOpen(!activeUsersOpen)} className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-3">
                            <ChevronDown className={cn("w-5 h-5 transition-transform", !activeUsersOpen && "-rotate-90")} />
                            Active users
                            <span className="text-sm font-normal text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{activeUsers.length + (adminUser && !adminUser.is_archived ? 1 : 0)}</span>
                        </button>

                        {activeUsersOpen && (
                        <div className="overflow-x-auto">
                            <div className="min-w-full inline-block align-middle">
                                <div className="border-t">
                                    <div className="grid grid-cols-5 py-3 px-4 text-left text-sm font-semibold text-muted-foreground">
                                        <div className="col-span-1">Users</div>
                                        <div className="col-span-1">Email</div>
                                        <div className="col-span-1">Team</div>
                                        <div className="col-span-1">Role</div>
                                        <div className="col-span-1">Status</div>
                                    </div>
                                    <div className="divide-y">
                                        {adminUser && !adminUser.is_archived && <UserRow user={adminUser} />}
                                        {activeUsers.map((user) => <UserRow key={user.id} user={user} />)}
                                    </div>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                className="mt-4 text-muted-foreground inline-flex p-0 h-auto hover:bg-transparent hover:text-blue-500 focus:ring-0 focus:ring-offset-0 px-0"
                                onClick={() => setAddUserOpen(true)}
                                >
                                <Plus className="mr-2 h-4 w-4" /> Add User
                            </Button>
                        </div>
                        )}
                    </div>
                    
                    {archivedUsers.length > 0 && (
                     <div className="mb-4">
                        <button onClick={() => setArchivedUsersOpen(!archivedUsersOpen)} className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-3">
                            <ChevronDown className={cn("w-5 h-5 transition-transform", !archivedUsersOpen && "-rotate-90")} />
                            Archived users
                            <span className="text-sm font-normal text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{archivedUsers.length + (adminUser && adminUser.is_archived ? 1: 0)}</span>
                        </button>
                        {archivedUsersOpen && (
                          <div className="overflow-x-auto">
                            <div className="min-w-full inline-block align-middle">
                                <div className="border-t">
                                    <div className="grid grid-cols-5 py-3 px-4 text-left text-sm font-semibold text-muted-foreground">
                                        <div className="col-span-1">Users</div>
                                        <div className="col-span-1">Email</div>
                                        <div className="col-span-1">Team</div>
                                        <div className="col-span-1">Role</div>
                                        <div className="col-span-1">Status</div>
                                    </div>
                                    <div className="divide-y">
                                        {adminUser && adminUser.is_archived && <UserRow user={adminUser} />}
                                        {archivedUsers.map((user) => <UserRow key={user.id} user={user} />)}
                                    </div>
                                </div>
                            </div>
                        </div>
                        )}
                    </div>
                    )}
				</main>
			</div>
			<CreateTeamDialog isOpen={isCreateTeamOpen} setIsOpen={setCreateTeamOpen} onTeamCreated={onTeamCreated} />
			<AddUserDialog 
				isOpen={isAddUserOpen} 
				setIsOpen={setAddUserOpen} 
				roles={(initialRoles || []).filter(r => r.name !== 'Falaq Admin')} 
				teams={teams}
				onUserAdded={onUserAdded}
			/>
      {userToEdit && (
          <EditUserDialog
              isOpen={isEditUserOpen}
              setIsOpen={setEditUserOpen}
              user={userToEdit}
              roles={initialRoles.filter(r => r.name !== 'Falaq Admin')}
              teams={teams}
              onUserUpdated={onUserUpdated}
          />
      )}
      {teamToEdit && (
        <RenameTeamDialog
          isOpen={isRenameTeamOpen}
          setIsOpen={setRenameTeamOpen}
          team={teamToEdit}
          onTeamUpdated={onTeamUpdated}
        />
      )}
      <AlertDialog open={!!teamToDelete} onOpenChange={(open) => !open && setTeamToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the team "{teamToDelete?.name}". Users in this team will be unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTeam}
              className={buttonVariants({ variant: 'destructive' })}
              disabled={isPending}
            >
              {isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isArchiveAlertOpen} onOpenChange={setArchiveAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to archive this user?</AlertDialogTitle>
                <AlertDialogDescription>
                    Archived users will no longer be able to access the application. This can be undone later.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setUserToArchive(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={() => handleUpdateUserArchived(userToArchive!, true)}
                    className={cn(buttonVariants({ variant: "destructive" }))}
                    disabled={isPending}
                >
                   {isPending ? 'Archiving...' : 'Archive'}
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
		</>
	);
}

    
