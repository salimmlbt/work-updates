
'use client'

import { useState, useEffect, useTransition } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Plus, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import type { Profile, Role, Team } from '@/lib/types';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { updateUserRole, updateUserTeam, deleteTeam } from './actions';
import { useToast } from '@/hooks/use-toast';
import { RenameTeamDialog } from './rename-team-dialog'

interface TeamsClientProps {
	initialUsers: Profile[];
	initialRoles: Role[];
	initialTeams: Team[];
}

export default function TeamsClient({ initialUsers, initialRoles, initialTeams }: TeamsClientProps) {
	const [selectedTeam, setSelectedTeam] = useState('All teams');
	const [isCreateTeamOpen, setCreateTeamOpen] = useState(false);
	const [isAddUserOpen, setAddUserOpen] = useState(false);
	const [teams, setTeams] = useState(initialTeams);
	const [users, setUsers] = useState(initialUsers);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [isRenameTeamOpen, setRenameTeamOpen] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);

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

  const handleTeamChange = (userId: string, teamId: string | null) => {
      startTransition(async () => {
        const { error } = await updateUserTeam(userId, teamId);
        if (error) {
            toast({ title: "Error updating team", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Team updated successfully" });
            setUsers(prevUsers => prevUsers.map(u => u.id === userId ? {...u, team_id: teamId, teams: teams.find(t => t.id === teamId) || null} : u));
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

	const usersWithData = users.map((user) => {
    const isAdmin = user.email === 'admin@falaq.com';
    return {
      ...user,
      team: user.teams,
      role: isAdmin ? initialRoles.find(r => r.name === 'Falaq Admin') : user.roles,
      status: 'Active',
      isAdmin
    }
  }).sort((a, b) => {
    if (a.isAdmin && !b.isAdmin) return -1;
    if (!a.isAdmin && b.isAdmin) return 1;
    return (a.full_name || '').localeCompare(b.full_name || '');
  });

	const adminUser = usersWithData.find(user => user.isAdmin);
  const otherUsers = usersWithData.filter(user => !user.isAdmin);

  const teamFilteredUsers = selectedTeam === 'All teams'
    ? otherUsers
    : otherUsers.filter(user => user.team?.name === selectedTeam);

  const filteredUsers = adminUser ? [adminUser, ...teamFilteredUsers] : teamFilteredUsers;
	
	const teamUserCounts = teams.reduce((acc, team) => {
		acc[team.id] = usersWithData.filter(u => u.team?.id === team.id).length;
		return acc;
	}, {} as Record<string, number>);


	return (
		<>
			<div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
				<aside className="md:col-span-1">
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

				<main className="md:col-span-3">
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
									{filteredUsers.map((user) => (
										<div key={user.id} className="grid grid-cols-5 items-center py-3 px-4">
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
                          <div className="text-sm px-3">All teams</div>
                        ) : (
                          <Select 
                            value={user.team?.id ?? ''}
                            onValueChange={(teamId) => handleTeamChange(user.id, teamId === 'none' ? null : teamId)}
                            disabled={isPending}
                          >
                            <SelectTrigger className="border-0 bg-transparent shadow-none focus:ring-0">
                              <SelectValue placeholder="No team" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No team</SelectItem>
                              {teams.map(team => (
                                <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
											</div>
											<div className="col-span-1">
                        {user.isAdmin ? (
                          <div className="text-sm px-3">{user.role?.name || 'No role'}</div>
                        ) : (
                          <Select 
                            value={user.role?.id} 
                            onValueChange={(roleId) => handleRoleChange(user.id, roleId)}
                            disabled={isPending}
                          >
                            <SelectTrigger className="border-0 bg-transparent shadow-none focus:ring-0">
                              <SelectValue placeholder="No role" />
                            </SelectTrigger>
                            <SelectContent>
                              {initialRoles.map(role => (
                                  <SelectItem key={role.id} value={role.id} disabled={role.name === 'Falaq Admin'}>{role.name}</SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}
											</div>
											<div className="col-span-1">
												<Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">
													<span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
													{user.status}
												</Badge>
											</div>
										</div>
									))}
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
				</main>
			</div>
			<CreateTeamDialog isOpen={isCreateTeamOpen} setIsOpen={setCreateTeamOpen} onTeamCreated={onTeamCreated} />
			<AddUserDialog 
				isOpen={isAddUserOpen} 
				setIsOpen={setAddUserOpen} 
				roles={initialRoles.filter(r => r.name !== 'Falaq Admin')} 
				teams={teams}
				onUserAdded={onUserAdded}
			/>
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
		</>
	);
}
    

    

    

