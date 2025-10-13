
'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import { Loader2, Pencil, User, ChevronDown, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { Role, Team, Profile } from '@/lib/types'
import { addUser } from './actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ImageCropperDialog } from '@/app/clients/image-cropper-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

interface AddUserDialogProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  roles: Role[]
  teams: Team[]
  onUserAdded: (newUser: Profile) => void
}

const initialFormState = {
    name: '',
    email: '',
    roleId: '',
    teamIds: [] as string[],
    password: '',
    confirmPassword: '',
    avatar: null as File | null,
};

export function AddUserDialog({ isOpen, setIsOpen, roles, teams, onUserAdded }: AddUserDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState(initialFormState);
  const [isFormValid, setIsFormValid] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  
  useEffect(() => {
    const { name, email, roleId, password, confirmPassword } = formState;
    const isValid = name.trim() !== '' &&
                    email.trim() !== '' &&
                    roleId !== '' &&
                    password.trim() !== '' &&
                    password.length >= 6 &&
                    password === confirmPassword;
    setIsFormValid(isValid);
  }, [formState]);
  
  const handleDialogChange = (open: boolean) => {
    if (!open) {
        setFormState(initialFormState);
        setAvatarPreview(null);
    }
    setIsOpen(open);
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prevState => ({ ...prevState, [name]: value }));
  };

  const handleSelectChange = (name: 'roleId') => (value: string) => {
    setFormState(prevState => ({ ...prevState, [name]: value }));
  };
  
  const handleTeamSelect = (teamId: string) => {
    setFormState(prev => {
      const newTeamIds = prev.teamIds.includes(teamId)
        ? prev.teamIds.filter(id => id !== teamId)
        : [...prev.teamIds, teamId];
      return { ...prev, teamIds: newTeamIds };
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageToCrop(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const onCropComplete = (croppedImage: File) => {
    setFormState(prevState => ({ ...prevState, avatar: croppedImage }));
    setAvatarPreview(URL.createObjectURL(croppedImage));
    setImageToCrop(null);
  };

  const handleAddUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormValid) return;

    const fullEmail = `${formState.email}@falaq.com`;
    
    const formData = new FormData();
    formData.append('full_name', formState.name);
    formData.append('email', fullEmail);
    formData.append('password', formState.password);
    formData.append('role_id', formState.roleId);
    formData.append('team_ids', formState.teamIds.join(','));
    if (formState.avatar) {
      formData.append('avatar', formState.avatar);
    }

    startTransition(async () => {
      const { data, error } = await addUser(formData);
      if (error) {
        toast({ title: "Error adding user", description: error, variant: "destructive" });
      } else if (data) {
        onUserAdded(data as Profile);
        toast({ title: "User invited", description: `An invitation has been sent to ${fullEmail}.` });
        handleDialogChange(false);
      }
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Add User</DialogTitle>
            <DialogDescription>
              Invite a new user to your workspace.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser}>
              <div className="space-y-4 py-4">
                 <div className="flex justify-center">
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleAvatarChange}
                      />
                      <Avatar
                        className="h-24 w-24 cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <AvatarImage src={avatarPreview ?? undefined} />
                        <AvatarFallback>
                          <User className="h-12 w-12 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      <button
                        type="button"
                        className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" name="name" placeholder="Enter full name" value={formState.name} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="flex items-center">
                    <Input id="email" name="email" type="text" placeholder="Enter email username" value={formState.email} onChange={handleInputChange} className="rounded-r-none" required />
                    <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-l-0 border-gray-300 rounded-r-md dark:bg-gray-600 dark:text-gray-400 dark:border-gray-600 h-10">
                      @falaq.com
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select name="roleId" onValueChange={handleSelectChange('roleId')} value={formState.roleId} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map(role => (
                          <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="team">Team</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between font-normal">
                          <span className="truncate">
                            {formState.teamIds.length > 0 ? `${formState.teamIds.length} team(s) selected` : "Select teams"}
                          </span>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                        <ScrollArea className="h-60">
                          {teams.map(team => (
                            <DropdownMenuCheckboxItem
                              key={team.id}
                              checked={formState.teamIds.includes(team.id)}
                              onCheckedChange={() => handleTeamSelect(team.id)}
                              onSelect={(e) => e.preventDefault()}
                            >
                              {team.name}
                            </DropdownMenuCheckboxItem>
                          ))}
                        </ScrollArea>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" placeholder="Enter password" value={formState.password} onChange={handleInputChange} required />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="Confirm password" value={formState.confirmPassword} onChange={handleInputChange} required />
                </div>
              </div>
              <DialogFooter className="justify-end sm:justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => handleDialogChange(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isPending || !isFormValid}
                >
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add User
                </Button>
              </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
       <ImageCropperDialog
        isOpen={!!imageToCrop}
        image={imageToCrop}
        onClose={() => setImageToCrop(null)}
        onCropComplete={onCropComplete}
      />
    </>
  )
}
