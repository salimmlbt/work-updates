
'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button, buttonVariants } from '@/components/ui/button'
import { Plus, ChevronDown, MoreVertical, Pencil, Copy, Trash2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useTransition, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Role, RoleWithPermissions, PermissionLevel } from '@/lib/types'
import { createRole, updateRole, deleteRole } from './actions'
import { useToast } from '@/hooks/use-toast'

interface RolesClientProps {
  initialRoles: Role[]
  permissionsList: { id: string; label: string }[]
}

export default function RolesClient({ initialRoles, permissionsList }: RolesClientProps) {
    const [roles, setRoles] = useState<RoleWithPermissions[]>(
      initialRoles.map(r => ({ ...r, permissions: r.permissions as Record<string, PermissionLevel> }))
    );
    const [selectedRole, setSelectedRole] = useState(roles.find(r => r.name === 'Falaq Admin')?.name || roles[0]?.name || '')
    
    const [isCreateRoleOpen, setCreateRoleOpen] = useState(false)
    const [isRenameRoleOpen, setRenameRoleOpen] = useState(false);
    const [roleToEdit, setRoleToEdit] = useState<RoleWithPermissions | null>(null);
    const [newRoleName, setNewRoleName] = useState('')
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [modifiedPermissions, setModifiedPermissions] = useState<Record<string, PermissionLevel> | null>(null);

    const sortedRoles = [...roles].sort((a, b) => {
        if (a.name === 'Falaq Admin') return -1;
        if (b.name === 'Falaq Admin') return 1;
        return a.name.localeCompare(b.name);
    });

    const currentRole = roles.find(r => r.name === selectedRole);

    useEffect(() => {
        setModifiedPermissions(null);
    }, [selectedRole]);
    
    const currentPermissions = currentRole?.name === 'Falaq Admin'
        ? permissionsList.reduce((acc, p) => ({ ...acc, [p.id]: "Editor" as PermissionLevel }), {})
        : currentRole?.permissions || permissionsList.reduce((acc, p) => ({ ...acc, [p.id]: "Editor" as PermissionLevel }), {});

    const displayPermissions = modifiedPermissions || currentPermissions;
    
    const permissionLevels: PermissionLevel[] = ["Restricted", "Viewer", "Editor"];

    const handlePermissionChange = (permissionId: string, level: PermissionLevel) => {
        if (selectedRole === 'Falaq Admin' || !currentRole) return;
        const newPermissions = { ...displayPermissions, [permissionId]: level };
        setModifiedPermissions(newPermissions);
    }
    
    const handleSaveChanges = () => {
        if (!currentRole || !modifiedPermissions || currentRole.name === 'Falaq Admin') return;

        startTransition(async () => {
            const { error } = await updateRole(currentRole.id, currentRole.name, modifiedPermissions);
            if (error) {
                toast({ title: "Error updating permissions", description: error, variant: "destructive" });
            } else {
                 setRoles(prev => prev.map(role => 
                    role.id === currentRole.id
                        ? { ...role, permissions: modifiedPermissions }
                        : role
                ));
                setModifiedPermissions(null);
                toast({ title: "Permissions saved", description: "Changes have been saved successfully." });
            }
        });
    }

    const handleCancelChanges = () => {
        setModifiedPermissions(null);
    }

    const handleCreateRole = () => {
        if (newRoleName.trim() && !roles.find(r => r.name === newRoleName.trim())) {
            const newPermissions = permissionsList.reduce((acc, p) => ({...acc, [p.id]: "Restricted" as PermissionLevel}), {})
            
            startTransition(async () => {
                const { data, error } = await createRole(newRoleName.trim(), newPermissions);
                if (error) {
                    toast({ title: "Error creating role", description: error, variant: "destructive" });
                } else if (data) {
                    const newRole = { ...data, permissions: data.permissions as Record<string, PermissionLevel>}
                    setRoles(prev => [...prev, newRole])
                    setNewRoleName('')
                    setCreateRoleOpen(false)
                    toast({ title: "Role created", description: `Role "${newRole.name}" has been created.` });
                }
            });
        }
    }

    const handleRenameRole = () => {
        if (newRoleName.trim() && roleToEdit && newRoleName.trim() !== roleToEdit.name) {
            if (roles.find(r => r.name === newRoleName.trim())) {
                toast({ title: "Error", description: "A role with this name already exists.", variant: "destructive" });
                return;
            }
            startTransition(async () => {
                const { data, error } = await updateRole(roleToEdit.id, newRoleName.trim(), roleToEdit.permissions);
                if (error) {
                    toast({ title: "Error renaming role", description: error, variant: "destructive" });
                } else if (data) {
                    setRoles(prev => prev.map(r => 
                        r.id === roleToEdit.id ? { ...r, name: newRoleName.trim() } : r
                    ));
                     if (selectedRole === roleToEdit.name) {
                        setSelectedRole(newRoleName.trim());
                    }
                    setNewRoleName('');
                    setRenameRoleOpen(false);
                    setRoleToEdit(null);
                    toast({ title: "Role renamed" });
                }
            });
        }
    };

    const handleDuplicateRole = (roleToDuplicate: RoleWithPermissions) => {
        const newName = `${roleToDuplicate.name} (copy)`;
        startTransition(async () => {
            const { data, error } = await createRole(newName, roleToDuplicate.permissions);
            if (error) {
                toast({ title: "Error duplicating role", description: error, variant: "destructive" });
            } else if (data) {
                const newRole = { ...data, permissions: data.permissions as Record<string, PermissionLevel>}
                setRoles(prev => [...prev, newRole]);
                toast({ title: "Role duplicated" });
            }
        });
    };

    const handleDeleteRole = (roleToDelete: RoleWithPermissions) => {
        startTransition(async () => {
            const { error } = await deleteRole(roleToDelete.id);
            if (error) {
                toast({ title: "Error deleting role", description: error, variant: "destructive" });
            } else {
                setRoles(prev => prev.filter(r => r.id !== roleToDelete.id));
                if (selectedRole === roleToDelete.name) {
                    setSelectedRole(roles.find(r => r.name === 'Falaq Admin')?.name || roles[0]?.name || '');
                }
                toast({ title: "Role deleted" });
            }
        });
    };

    const openRenameDialog = (role: RoleWithPermissions) => {
        setRoleToEdit(role);
        setNewRoleName(role.name);
        setRenameRoleOpen(true);
    };

    return (
    <>
        <div className="flex flex-col md:flex-row gap-8">
            <aside className="w-full md:w-64">
                <div className="space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Role</h3>
                        <nav className="space-y-2">
                            {sortedRoles.map(role => (
                                <div key={role.id} className="relative group flex items-center">
                                    <div
                                        role="button"
                                        onClick={() => setSelectedRole(role.name)}
                                        className={cn(
                                            buttonVariants({ variant: 'ghost' }),
                                            'w-full justify-start pr-8',
                                            selectedRole === role.name
                                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                                                : 'group-hover:bg-accent'
                                        )}
                                    >
                                        {role.name}
                                    </div>
                                    
                                    {role.name !== 'Falaq Admin' && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 !p-0 !bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 data-[state=open]:bg-gray-100 dark:data-[state=open]:bg-gray-800 focus:!bg-transparent focus:!ring-0 focus:!ring-offset-0 !shadow-none text-gray-500 hover:text-blue-500 data-[state=open]:text-blue-500 transition-colors">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => openRenameDialog(role)}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Rename role
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDuplicateRole(role)}>
                                                    <Copy className="mr-2 h-4 w-4" />
                                                    Duplicate role
                                                </DropdownMenuItem>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <div className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-red-600 hover:text-red-500 focus:text-red-500">
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete role
                                                        </div>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action cannot be undone. This will permanently delete the "{role.name}" role.
                                                        </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteRole(role)} className={cn(buttonVariants({ variant: "destructive" }))}>Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    )}
                                </div>
                            ))}
                           <Button
                                variant="ghost"
                                className="text-muted-foreground inline-flex p-0 h-auto hover:bg-transparent hover:text-blue-500 focus:ring-0 focus:ring-offset-0 px-0"
                                onClick={() => setCreateRoleOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" /> Create role
                            </Button>
                        </nav>
                    </div>
                </div>
            </aside>
            <main className="flex-1">
                <div className="space-y-6">
                    <div>
                        <Button variant="ghost" className="text-lg font-semibold p-0 mb-4 hover:bg-transparent">
                            <ChevronDown className="mr-2 h-5 w-5" />
                            Permissions for {selectedRole}
                        </Button>
                        <div className="space-y-4">
                            {permissionsList.map((permission) => (
                                <div key={permission.id} className="flex items-center justify-between gap-4 border-b pb-4">
                                    <div className="w-80">
                                        <p className="font-medium">{permission.label}</p>
                                    </div>
                                    <div className="flex gap-2">
                                         {permissionLevels.map((level) => (
                                            <Button
                                                key={level}
                                                variant={displayPermissions[permission.id] === level ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => handlePermissionChange(permission.id, level)}
                                                disabled={selectedRole === 'Falaq Admin'}
                                                className={cn(
                                                    "w-24",
                                                    displayPermissions[permission.id] === level
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-transparent text-foreground'
                                                )}
                                            >
                                                {level}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {modifiedPermissions && selectedRole !== 'Falaq Admin' && (
                            <div className="mt-6 flex justify-end gap-2">
                                <Button variant="ghost" onClick={handleCancelChanges} disabled={isPending}>Cancel</Button>
                                <Button onClick={handleSaveChanges} disabled={isPending}>
                                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Changes
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
        <Dialog open={isCreateRoleOpen} onOpenChange={setCreateRoleOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Create role</DialogTitle>
                    <DialogDescription>Enter a name for the new role.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="create-role-name" className="sr-only">Role name</Label>
                    <Input 
                        id="create-role-name" 
                        placeholder="Role name" 
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="ghost">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleCreateRole} disabled={isPending || !newRoleName.trim()}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create role
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        <Dialog open={isRenameRoleOpen} onOpenChange={setRenameRoleOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Rename role</DialogTitle>
                    <DialogDescription>Enter a new name for the role.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="rename-role-name" className="sr-only">Role name</Label>
                    <Input 
                        id="rename-role-name" 
                        placeholder="Role name" 
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="ghost">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleRenameRole} disabled={isPending || !newRoleName.trim() || newRoleName.trim() === roleToEdit?.name}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
  )
}
    
    
