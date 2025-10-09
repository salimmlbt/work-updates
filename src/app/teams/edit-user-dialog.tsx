
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
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { Role, Team, Profile } from '@/lib/types'
import { updateUser } from './actions'

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
    roleId: user.role_id || '',
    teamId: user.team_id || '',
    password: '',
    confirmPassword: '',
  });
  const [isFormValid, setIsFormValid] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    const { name, roleId, teamId, password, confirmPassword } = formState;
    const isPasswordValid = (!password && !confirmPassword) || (password.length >= 6 && password === confirmPassword);
    const isValid = name.trim() !== '' &&
                    roleId !== '' &&
                    teamId !== '' &&
                    isPasswordValid;
    setIsFormValid(isValid);
  }, [formState]);
  
  useEffect(() => {
    setFormState({
        name: user.full_name || '',
        roleId: user.role_id || '',
        teamId: user.team_id || '',
        password: '',
        confirmPassword: '',
    });
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prevState => ({ ...prevState, [name]: value }));
  };

  const handleSelectChange = (name: 'roleId' | 'teamId') => (value: string) => {
    setFormState(prevState => ({ ...prevState, [name]: value }));
  };

  const handleUpdateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormValid) return;

    const formData = new FormData();
    formData.append('full_name', formState.name);
    formData.append('role_id', formState.roleId);
    formData.append('team_id', formState.teamId);
    if (formState.password) {
      formData.append('password', formState.password);
    }

    startTransition(async () => {
      const { data, error } = await updateUser(user.id, formData);
      if (error) {
        toast({ title: "Error updating user", description: error, variant: "destructive" });
      } else if (data) {
        onUserUpdated(data);
        toast({ title: "User updated", description: "The user's profile has been updated." });
      }
    });
  };

  return (
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
                    <Select name="teamId" onValueChange={handleSelectChange('teamId')} value={formState.teamId} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a team" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map(team => (
                          <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
  )
}
