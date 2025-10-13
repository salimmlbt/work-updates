
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
import { Loader2, Pencil, User, ChevronDown } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { Role, Team, Profile } from '@/lib/types'
import { updateUser } from './actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ImageCropperDialog } from '@/app/clients/image-cropper-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

interface EditUserDialogProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  user: Profile
  roles: Role[]
  teams: Team[]
  onUserUpdated: (updatedUser: Profile) => void
}

export function EditUserDialog({ isOpen, setIsOpen, user, roles, teams, onUserUpdated }: EditUserDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState({
    name: user.full_name || '',
    roleId: user.roles?.id || '',
    teamIds: (Array.isArray(user.teams) ? user.teams.map(t => t.teams?.id).filter(Boolean) : []) as string[],
    password: '',
    confirmPassword: '',
    avatar: null as File | null,
  });
  const [isFormValid, setIsFormValid] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar_url);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  
  useEffect(() => {
    const { name, roleId, password, confirmPassword } = formState;
    const isPasswordValid = (!password && !confirmPassword) || (password.length >= 6 && password === confirmPassword);
    const isValid = name.trim() !== '' &&
                    roleId !== '' &&
                    isPasswordValid;
    setIsFormValid(isValid);
  }, [formState]);
  
  useEffect(() => {
    if (isOpen) {
      setFormState({
          name: user.full_name || '',
          roleId: user.roles?.id || '',
          teamIds: (Array.isArray(user.teams) ? user.teams.map(t => t.teams?.id).filter(Boolean) : []) as string[],
          password: '',
          confirmPassword: '',
          avatar: null,
      });
      setAvatarPreview(user.avatar_url);
    }
  }, [user, isOpen]);

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

  const handleUpdateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormValid) return;

    const formData = new FormData();
    formData.append('full_name', formState.name);
    formData.append('role_id', formState.roleId);
    formData.append('team_ids', formState.teamIds.join(','));
    if (formState.password) {
      formData.append('password', formState.password);
    }
    if (formState.avatar) {
      formData.append('avatar', formState.avatar);
    }

    startTransition(async () => {
      const { data, error } = await updateUser(user.id, formData);
      if (error) {
        toast({ title: "Error updating user", description: error.message, variant: "destructive" });
      } else if (data) {
        onUserUpdated(data);
        toast({ title: "User updated", description: "The user's profile has been updated." });
        setIsOpen(false);
      }
    });
  };

  return (
      <>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Edit User</DialogTitle>
              <DialogDescription>
                Update the user's profile information.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateUser}>
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
                    <Input id="email" name="email" type="email" value={user.email || ''} disabled />
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
                    <Label htmlFor="password">New Password (optional)</Label>
                    <Input id="password" name="password" type="password" placeholder="Enter new password" value={formState.password} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="Confirm new password" value={formState.confirmPassword} onChange={handleInputChange} />
                    {formState.password && formState.confirmPassword && formState.password !== formState.confirmPassword && (
                      <p className="text-sm text-destructive">Passwords do not match.</p>
                    )}
                  </div>
                </div>
                <DialogFooter className="justify-end sm:justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isPending || !isFormValid}
                  >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
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
