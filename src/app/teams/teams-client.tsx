
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
import { Plus, MoreVertical, Pencil, Trash2, Archive, UserCog, ChevronDown, Check, Users, Search, Filter } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import type { Profile, Role, Team, WorkType } from '@/lib/types';
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
import { updateUserRole, updateUserTeams, deleteTeam, updateUserIsArchived, deleteUserPermanently } from './actions';
import { useToast } from '@/hooks/use-toast';
import { EditTeamDialog } from './edit-team-dialog'
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parse } from 'date-fns';
import { Input } from '@/components/ui/input';

interface TeamsClientProps {
	initialUsers: Profile[];
	initialRoles: Role[];
	initialTeams: Team[];
    workTypes: WorkType[];
}

export default function TeamsClient({ initialUsers, initialRoles, initialTeams, workTypes }: TeamsClientProps) {
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
  const [isEditTeamOpen, setIsEditTeamOpen] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [userToArchive, setUserToArchive] = useState<Profile | null>(null);
  const [isArchiveAlertOpen, setArchiveAlertOpen] = useState(false);
  const [activeUsersOpen, setActiveUsersOpen] = useState(true);
  const [archivedUsersOpen, setArchivedUsersOpen] = useState(true);
  const [userToDeletePermanently, setUserToDeletePermanently] = useState<Profile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  const openEditDialog = (team: Team) => {
    setTeamToEdit(team);
    setIsEditTeamOpen(true);
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
  
  const handleDeletePermanently = () => {
    if (!userToDeletePermanently) return;
    startTransition(async () => {
      const result = await deleteUserPermanently(userToDeletePermanently.id);
      if (result.error) {
        toast({ title: "Error deleting user", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "User permanently deleted" });
        setUsers(prev => prev.filter(p => p.id !== userToDeletePermanently.id));
      }
      setUserToDeletePermanently(null);
    });
  }
  
  const formatTime = (time: string | null) => {
    if (!time) return '';
    try {
      const date = parse(time, 'HH:mm:ss', new Date());
      return format(date, 'p');
    } catch {
      try {
        const date = parse(time, 'HH:mm', new Date());
        return format(date, 'p');
      } catch (e) {
        console.error("Could not parse time:", time, e);
        return time;
      }
    }
  };

  const usersWithData = useMemo(() => users.map((user) => {
    const isAdmin = user.email === 'admin@falaq.com';
    return {
      ...user,
      isAdmin,
      is_archived: user.is_archived || false,
    }
  }).sort((a, b) => {
    if (a.isAdmin && !b.isAdmin) return -1;
    if (!a.isAdmin && b.isAdmin) return 1;
    return (a.full_name || '').localeCompare(b.full_name || '');
  }), [users]);

	const adminUser = usersWithData.find(user => user.isAdmin);
  const otherUsers = usersWithData.filter(user => !user.isAdmin);

  const teamFilteredUsers = selectedTeam === 'All teams'
    ? otherUsers
    : otherUsers.filter(user => (user.teams || []).some(t => t.teams?.name === selectedTeam));

  const searchedUsers = teamFilteredUsers.filter(u => 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeUsers = searchedUsers.filter(u => !u.is_archived);
  const archivedUsers = searchedUsers.filter(u => u.is_archived);

	const teamUserCounts = useMemo(() => teams.reduce((acc, team) => {
		acc[team.id] = usersWithData.filter(u => (u.teams || []).some(t => t.teams?.id === team.id)).length;
		return acc;
	}, {} as Record<string, number>), [teams, usersWithData]);

  const UserRow = ({ user }: { user: (typeof usersWithData)[0] }) => {
    const userTeamIds = (user.teams || []).map(t => t.teams?.id).filter(Boolean) as string[];

    return (
        <div className="grid grid-cols-6 items-center py-4 px-6 group border-b border-white/5 hover:bg-white/[0.04] transition-all duration-300">
            <div className="col-span-1 flex items-center gap-4">
                <Avatar className="h-10 w-10 border border-white/10 group-hover:scale-105 transition-transform">
                    <AvatarImage src={user.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-zinc-800 text-zinc-400 font-bold">{getInitials(user.full_name || user.email)}</AvatarFallback>
                </Avatar>
                <span className="font-bold text-white tracking-tight">{currentUser?.id === user.id ? 'Me' : (user.full_name || 'No name')}</span>
            </div>
            <div className="col-span-1 text-sm font-medium text-zinc-500">{user.email}</div>
            <div className="col-span-1">
                {user.isAdmin ? (
                    <Badge variant="secondary" className="bg-sky-500/10 text-sky-400 border-sky-500/20 font-black uppercase tracking-widest text-[9px]">All Access</Badge>
                ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="w-full justify-start text-left font-normal h-auto min-h-10 hover:bg-white/5" disabled={isPending || user.is_archived}>
                          <div className="flex flex-wrap gap-1">
                            {user.teams && user.teams.length > 0 
                              ? user.teams.map(t => t.teams && <Badge key={t.teams.id} variant="secondary" className="bg-zinc-800 text-zinc-300 border-zinc-700 text-[10px]">{t.teams.name}</Badge>)
                              : <span className="text-zinc-600 text-xs italic">No team assigned</span>
                            }
                          </div>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] bg-zinc-900 border-zinc-800 text-zinc-100 shadow-2xl">
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
                    <Button variant="ghost" className="w-full justify-start text-left font-bold text-zinc-300 hover:bg-white/5" disabled={isPending || user.is_archived || user.isAdmin}>
                      {user.roles ? user.roles.name : <span className="text-zinc-600 italic">No role</span>}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-zinc-100 shadow-2xl">
                     {initialRoles.filter(r => r.name !== 'Falaq Admin').map(role => (
                        <DropdownMenuItem key={role.id} onSelect={() => handleRoleChange(user.id, role.id)} className={cn(user.roles?.id === role.id && 'bg-sky-500/20 text-sky-400')}>
                           {role.name}
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="col-span-1 text-xs font-bold text-zinc-500 uppercase tracking-tighter">
              {user.work_start_time && user.work_end_time 
                ? `${formatTime(user.work_start_time)} - ${formatTime(user.work_end_time)}`
                : '—'}
            </div>
            <div className="col-span-1 flex justify-between items-center pr-4">
                <Badge variant="outline" className={cn(
                    'font-black uppercase tracking-widest text-[9px] px-3 h-6',
                    !user.is_archived ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/10' : 'border-zinc-800 text-zinc-500 bg-zinc-900/50'
                )}>
                    <span className={cn('h-1.5 w-1.5 rounded-full mr-2 shadow-[0_0_8px_currentColor]', !user.is_archived ? 'bg-emerald-500' : 'bg-zinc-500')}></span>
                    {user.is_archived ? 'Archived' : 'Active'}
                </Badge>
                {currentUser?.id !== user.id && !user.isAdmin && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white">
                                  <MoreVertical className="h-4 w-4" />
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-zinc-100 shadow-2xl">
                              {!user.is_archived ? (
                                <>
                                  <DropdownMenuItem onClick={() => handleEditUserClick(user as Profile)}>
                                      <UserCog className="mr-2 h-4 w-4" />
                                      Edit User
                                  </DropdownMenuItem>
                                   {!user.isAdmin && (
                                    <DropdownMenuItem className="text-red-400 focus:text-red-400 focus:bg-red-950/30" onClick={() => { setUserToArchive(user as Profile); setArchiveAlertOpen(true); }}>
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
                                  <DropdownMenuSeparator className="bg-white/5" />
                                  <DropdownMenuItem className="text-red-400 focus:text-red-400 focus:bg-red-950/30" onClick={() => setUserToDeletePermanently(user as Profile)}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Permanently delete
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
		<div className="bg-[#0f0f0f] text-zinc-100">
			<div className="flex flex-col md:flex-row gap-10">
				<aside className="w-full md:w-64">
					<h2 className="text-2xl font-black mb-8 px-2 text-white tracking-tighter uppercase">Teams</h2>
					<div className="space-y-2">
						<div
							role="button"
							onClick={() => setSelectedTeam('All teams')}
							className={cn(
								'w-full flex items-center justify-between px-4 h-12 rounded-2xl transition-all duration-500 border',
								selectedTeam === 'All teams'
									? 'bg-gradient-to-r from-sky-500/20 to-blue-500/10 border-sky-500/20 text-white font-bold shadow-[0_0_25px_rgba(56,189,248,0.15)]'
									: 'border-transparent text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
							)}
						>
							<div className="flex items-center gap-3">
                                <Users className={cn("h-5 w-5", selectedTeam === 'All teams' ? "text-sky-400" : "text-zinc-600")} />
                                <span className="text-sm tracking-tight">All Studio Members</span>
                            </div>
							<span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{usersWithData.length}</span>
						</div>
						{teams.map(team => (
							<div key={team.id} className="relative group flex items-center">
								<div
									role="button"
									onClick={() => setSelectedTeam(team.name)}
									className={cn(
										'w-full flex items-center justify-between px-4 h-12 rounded-2xl transition-all duration-500 border',
										selectedTeam === team.name
											? 'bg-gradient-to-r from-sky-500/20 to-blue-500/10 border-sky-500/20 text-white font-bold shadow-[0_0_25px_rgba(56,189,248,0.15)]'
											: 'border-transparent text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
									)}
								>
									<div className="flex items-center gap-3">
										<div className="w-2 h-2 rounded-full bg-zinc-700 group-hover:bg-sky-500 transition-colors" />
										<span className="text-sm tracking-tight">{team.name}</span>
									</div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{teamUserCounts[team.id] || 0}</span>
								</div>
								<div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 text-zinc-500 hover:text-sky-400"
											>
												<MoreVertical className="h-4 w-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-zinc-100 shadow-2xl">
											<DropdownMenuItem onClick={() => openEditDialog(team)}>
												<Pencil className="mr-2 h-4 w-4" />
												Edit team
											</DropdownMenuItem>
											<DropdownMenuItem className="text-red-400 focus:text-red-400 focus:bg-red-950/30" onClick={() => openDeleteDialog(team)}>
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
                            className="mt-4 text-zinc-600 inline-flex p-2 h-auto hover:bg-transparent hover:text-sky-400 transition-colors font-bold uppercase text-[10px] tracking-[0.2em]"
                            onClick={() => setCreateTeamOpen(true)}
                        >
                            <Plus className="mr-2 h-4 w-4" /> Create new team
                        </Button>
					</div>
				</aside>

				<main className="flex-1 space-y-10">
                    {/* Header Action Bar */}
                    <div className="flex items-center justify-between gap-4 mb-6">
                         <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                            <Input
                                placeholder="Search studio members..."
                                className="h-11 bg-white/5 border-white/10 text-white focus-visible:ring-sky-500/50 rounded-2xl pl-12"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button 
                            onClick={() => setAddUserOpen(true)} 
                            className="rounded-full h-11 px-8 bg-sky-600 hover:bg-sky-500 text-white shadow-[0_0_20px_rgba(56,189,248,0.3)] font-bold"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Invite User
                        </Button>
                    </div>

                    <div className="border border-white/10 rounded-[2.5rem] overflow-hidden bg-white/[0.02] backdrop-blur-xl shadow-2xl shadow-black/50">
                        <button onClick={() => setActiveUsersOpen(!activeUsersOpen)} className="w-full flex items-center justify-between p-6 bg-white/[0.03] border-b border-white/5 hover:bg-white/[0.05] transition-colors group">
                            <div className="flex items-center gap-3">
                                <ChevronDown className={cn("w-5 h-5 text-zinc-500 transition-transform duration-500", !activeUsersOpen && "-rotate-90")} />
                                <span className="text-xl font-black text-white tracking-tighter uppercase">Active Team Members</span>
                                <Badge variant="secondary" className="bg-white/10 text-zinc-400 border-0 ml-2">{activeUsers.length + (adminUser && !adminUser.is_archived ? 1 : 0)}</Badge>
                            </div>
                        </button>

                        {activeUsersOpen && (
                            <div className="overflow-x-auto">
                                <div className="min-w-full inline-block align-middle">
                                    <div className="grid grid-cols-6 py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-white/10 bg-white/5">
                                        <div className="col-span-1">Member</div>
                                        <div className="col-span-1">Email Address</div>
                                        <div className="col-span-1">Assigned Teams</div>
                                        <div className="col-span-1">Access Role</div>
                                        <div className="col-span-1">Shift Hours</div>
                                        <div className="col-span-1">Live Status</div>
                                    </div>
                                    <div className="divide-y divide-white/5">
                                        {adminUser && !adminUser.is_archived && <UserRow user={adminUser} />}
                                        {activeUsers.map((user) => <UserRow key={user.id} user={user} />)}
                                        
                                        {activeUsers.length === 0 && (!adminUser || adminUser.is_archived) && (
                                            <div className="py-20 text-center">
                                                <p className="text-zinc-600 italic text-sm">No active members found.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {archivedUsers.length > 0 && (
                     <div className="border border-white/10 rounded-[2.5rem] overflow-hidden bg-white/[0.01] backdrop-blur-xl opacity-60 grayscale-[0.5] hover:opacity-100 hover:grayscale-0 transition-all duration-500">
                        <button onClick={() => setArchivedUsersOpen(!archivedUsersOpen)} className="w-full flex items-center justify-between p-6 bg-white/[0.03] border-b border-white/5 hover:bg-white/[0.05] transition-colors">
                            <div className="flex items-center gap-3">
                                <ChevronDown className={cn("w-5 h-5 text-zinc-500 transition-transform duration-500", !archivedUsersOpen && "-rotate-90")} />
                                <span className="text-xl font-black text-zinc-400 tracking-tighter uppercase">Archived Statement</span>
                                <Badge variant="secondary" className="bg-white/10 text-zinc-500 border-0 ml-2">{archivedUsers.length + (adminUser && adminUser.is_archived ? 1: 0)}</Badge>
                            </div>
                        </button>
                        {archivedUsersOpen && (
                          <div className="overflow-x-auto">
                            <div className="min-w-full inline-block align-middle">
                                <div className="divide-y divide-white/5">
                                    {adminUser && adminUser.is_archived && <UserRow user={adminUser} />}
                                    {archivedUsers.map((user) => <UserRow key={user.id} user={user} />)}
                                </div>
                            </div>
                        </div>
                        )}
                    </div>
                    )}
				</main>
			</div>
			<CreateTeamDialog isOpen={isCreateTeamOpen} setIsOpen={setCreateTeamOpen} onTeamCreated={onTeamCreated} workTypes={workTypes} />
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
        <EditTeamDialog
          isOpen={isEditTeamOpen}
          setIsOpen={setIsEditTeamOpen}
          team={teamToEdit}
          onTeamUpdated={onTeamUpdated}
          workTypes={workTypes}
        />
      )}
      <AlertDialog open={!!teamToDelete} onOpenChange={(open) => !open && setTeamToDelete(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 shadow-2xl rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tight">Delete team statement?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 font-medium">
              This will permanently delete the team "{teamToDelete?.name}". All users currently in this team will be unassigned automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="rounded-xl bg-zinc-800 border-zinc-700 text-zinc-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTeam}
              className={cn(buttonVariants({ variant: 'destructive' }), "rounded-xl")}
              disabled={isPending}
            >
              {isPending ? 'Processing...' : 'Confirm Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isArchiveAlertOpen} onOpenChange={setArchiveAlertOpen}>
            <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 shadow-2xl rounded-3xl">
                <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl font-black tracking-tight text-rose-400">Archive studio member?</AlertDialogTitle>
                <AlertDialogDescription className="text-zinc-400 font-medium">
                    Archived users will lose all access to the FALAQ workspace immediately. Their historical data will be preserved and you can restore them later if needed.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3">
                <AlertDialogCancel className="rounded-xl bg-zinc-800 border-zinc-700 text-zinc-300" onClick={() => setUserToArchive(null)}>Wait, Cancel</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={() => handleUpdateUserArchived(userToArchive!, true)}
                    className={cn(buttonVariants({ variant: "destructive" }), "rounded-xl")}
                    disabled={isPending}
                >
                   {isPending ? 'Archiving...' : 'Confirm Archive'}
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={!!userToDeletePermanently} onOpenChange={(open) => !open && setUserToDeletePermanently(null)}>
            <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 shadow-2xl rounded-3xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-black tracking-tight text-rose-500">Purge member data?</AlertDialogTitle>
                    <AlertDialogDescription className="text-zinc-400 font-medium">
                        CRITICAL: This will permanently delete the user "{userToDeletePermanently?.full_name}" and all their associated records from the studio infrastructure. This cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3">
                    <AlertDialogCancel className="rounded-xl bg-zinc-800 border-zinc-700 text-zinc-300">Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleDeletePermanently}
                        className={cn(buttonVariants({ variant: "destructive" }), "rounded-xl")}
                        disabled={isPending}
                    >
                       {isPending ? 'Purging...' : 'Permanently Delete'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
		</div>
	);
}
