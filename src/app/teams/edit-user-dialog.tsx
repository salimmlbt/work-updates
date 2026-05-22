
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
import { Loader2, Pencil, User, ChevronDown, Trash2, MapPin, Navigation } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { Role, Team, Profile } from '@/lib/types'
import { updateUser } from './actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ImageCropperDialog } from '@/app/clients/image-cropper-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { cn, getInitials } from '@/lib/utils'

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
  const [isLocating, setIsLocating] = useState(false);
  const [formState, setFormState] = useState({
    name: user.full_name || '',
    roleId: '',
    teamIds: [] as string[],
    password: '',
    confirmPassword: '',
    avatar: null as File | null,
    workStartTime: user.work_start_time || '',
    workEndTime: user.work_end_time || '',
    monthlySalary: user.monthly_salary?.toString() || '',
    deleteAvatar: false,
    latitude: user.latitude?.toString() || '',
    longitude: user.longitude?.toString() || '',
    radius: user.radius?.toString() || '100',
    geofencing_enabled: user.geofencing_enabled || false,
  });
  const [isFormValid, setIsFormValid] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar_url);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  
  useEffect(() => {
    const { name, roleId, password, confirmPassword, workStartTime, workEndTime } = formState;
    const isPasswordValid = (!password && !confirmPassword) || (password.length >= 6 && password === confirmPassword);
    const isValid = name.trim() !== '' &&
                    roleId !== '' &&
                    workStartTime.trim() !== '' &&
                    workEndTime.trim() !== '' &&
                    isPasswordValid;
    setIsFormValid(isValid);
  }, [formState]);
  
  useEffect(() => {
    if (isOpen) {
      const initialTeamIds = Array.isArray(user.teams) 
        ? user.teams.map((t: any) => t.teams?.id || t.id || (typeof t === 'string' ? t : null)).filter(Boolean) as string[]
        : [];
      
      const initialRoleId = user.roles?.id || (user as any).role_id || '';

      setFormState({
          name: user.full_name || '',
          roleId: initialRoleId,
          teamIds: initialTeamIds,
          password: '',
          confirmPassword: '',
          avatar: null,
          workStartTime: user.work_start_time || '',
          workEndTime: user.work_end_time || '',
          monthlySalary: user.monthly_salary?.toString() || '',
          deleteAvatar: false,
          latitude: user.latitude?.toString() || '',
          longitude: user.longitude?.toString() || '',
          radius: user.radius?.toString() || '100',
          geofencing_enabled: user.geofencing_enabled || false,
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

  const handleCaptureLocation = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormState(prev => ({
          ...prev,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
        }));
        setIsLocating(false);
        toast({ title: "Location Captured", description: "Coordinates updated to your current location." });
      },
      (error) => {
        setIsLocating(false);
        toast({ title: "Location Failed", description: error.message, variant: "destructive" });
      },
      { enableHighAccuracy: true }
    );
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
    setFormState(prevState => ({ ...prevState, avatar: croppedImage, deleteAvatar: false }));
    setAvatarPreview(URL.createObjectURL(croppedImage));
    setImageToCrop(null);
  };
  
  const handleDeleteAvatar = () => {
      setFormState(prevState => ({...prevState, avatar: null, deleteAvatar: true}));
      setAvatarPreview(null);
  }

  const handleUpdateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormValid) return;

    const formData = new FormData();
    formData.append('full_name', formState.name);
    formData.append('role_id', formState.roleId);
    formData.append('team_ids', formState.teamIds.join(','));
    formData.append('work_start_time', formState.workStartTime);
    formData.append('work_end_time', formState.workEndTime);
    formData.append('monthly_salary', formState.monthlySalary);
    formData.append('latitude', formState.latitude);
    formData.append('longitude', formState.longitude);
    formData.append('radius', formState.radius);
    formData.append('geofencing_enabled', formState.geofencing_enabled.toString());

    if (formState.password) {
      formData.append('password', formState.password);
    }
    if (formState.avatar) {
      formData.append('avatar', formState.avatar);
    }
    if (formState.deleteAvatar) {
        formData.append('delete_avatar', 'true');
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
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-[2.5rem] bg-zinc-950 border-white/10 shadow-2xl">
            <DialogHeader className="p-8 pb-0">
              <DialogTitle className="text-3xl font-black tracking-tight text-white uppercase">Edit User Statement</DialogTitle>
              <DialogDescription className="text-zinc-500 font-medium">
                Update core credentials and workspace access protocols.
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="flex-1 p-8 pt-6">
                <form id="edit-user-form" onSubmit={handleUpdateUser} className="space-y-10">
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleAvatarChange}
                            />
                            <Avatar
                            className="h-24 w-24 cursor-pointer border-2 border-white/10 shadow-2xl transition-all group-hover:scale-105"
                            onClick={() => fileInputRef.current?.click()}
                            >
                            <AvatarImage src={avatarPreview ?? undefined} />
                            <AvatarFallback className="bg-zinc-800 text-zinc-400 font-bold text-xl">
                                {getInitials(user.full_name)}
                            </AvatarFallback>
                            </Avatar>
                            <div className="absolute bottom-0 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    type="button"
                                    className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-600 text-white shadow-xl"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                                {avatarPreview && (
                                    <button
                                        type="button"
                                        className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-600 text-white shadow-xl"
                                        onClick={handleDeleteAvatar}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-white tracking-tight">{user.full_name}</h3>
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{user.email}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Official Name</Label>
                            <Input name="name" value={formState.name} onChange={handleInputChange} className="h-12 bg-white/5 border-white/10 rounded-xl font-bold" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Access Role</Label>
                            <Select name="roleId" onValueChange={handleSelectChange('roleId')} value={formState.roleId}>
                                <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl font-bold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                    {roles.map(role => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Assigned Teams</Label>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between h-12 bg-white/5 border-white/10 rounded-xl font-bold">
                                        <span className="truncate">{formState.teamIds.length > 0 ? `${formState.teamIds.length} Teams` : "Select Teams"}</span>
                                        <ChevronDown className="h-4 w-4 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-[300px] bg-zinc-900 border-zinc-800 text-white">
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
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Monthly Salary (INR)</Label>
                            <Input name="monthlySalary" type="number" value={formState.monthlySalary} onChange={handleInputChange} className="h-12 bg-white/5 border-white/10 rounded-xl font-bold" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Check In Window</Label>
                            <Input name="workStartTime" type="time" value={formState.workStartTime} onChange={handleInputChange} className="h-12 bg-white/5 border-white/10 rounded-xl font-bold" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Check Out Window</Label>
                            <Input name="workEndTime" type="time" value={formState.workEndTime} onChange={handleInputChange} className="h-12 bg-white/5 border-white/10 rounded-xl font-bold" />
                        </div>
                    </div>

                    {/* Proximity Attendance Section */}
                    <div className="space-y-6 pt-6 border-t border-white/5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-400">
                                    <MapPin className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-white uppercase tracking-tight">Proximity Attendance</h4>
                                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Enforce location-based check-in</p>
                                </div>
                            </div>
                            <Switch 
                                checked={formState.geofencing_enabled} 
                                onCheckedChange={(val) => setFormState(p => ({ ...p, geofencing_enabled: val }))}
                                className="data-[state=checked]:bg-sky-500"
                            />
                        </div>

                        {formState.geofencing_enabled && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500 bg-white/[0.02] p-6 rounded-[2rem] border border-white/5">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">Latitude</Label>
                                        <Input name="latitude" value={formState.latitude} onChange={handleInputChange} placeholder="e.g. 25.1234" className="h-11 bg-zinc-950 border-white/5 text-sky-300 font-mono" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">Longitude</Label>
                                        <Input name="longitude" value={formState.longitude} onChange={handleInputChange} placeholder="e.g. 55.5678" className="h-11 bg-zinc-950 border-white/5 text-sky-300 font-mono" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">Radius (Meters)</Label>
                                        <Input name="radius" type="number" value={formState.radius} onChange={handleInputChange} placeholder="100" className="h-11 bg-zinc-950 border-white/5 text-white font-bold" />
                                    </div>
                                </div>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    className="w-full rounded-xl border-sky-500/20 bg-sky-500/5 text-sky-400 hover:bg-sky-500/10 font-bold h-11"
                                    onClick={handleCaptureLocation}
                                    disabled={isLocating}
                                >
                                    {isLocating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Navigation className="h-4 w-4 mr-2" />}
                                    Capture My Current Coordinates
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Password Override</Label>
                        <Input name="password" type="password" placeholder="Leave blank to keep current" value={formState.password} onChange={handleInputChange} className="h-12 bg-white/5 border-white/10 rounded-xl font-bold" />
                    </div>
                </form>
            </ScrollArea>

            <DialogFooter className="p-8 pt-4 border-t border-white/10 flex gap-4">
              <Button variant="ghost" onClick={() => setIsOpen(false)} className="rounded-2xl h-14 px-8 text-zinc-400 hover:text-white font-bold uppercase tracking-widest text-[10px]">Cancel</Button>
              <Button 
                type="submit" 
                form="edit-user-form"
                disabled={isPending || !isFormValid}
                className="flex-1 rounded-2xl h-14 bg-sky-600 hover:bg-sky-500 text-white font-black uppercase tracking-widest text-xs shadow-2xl shadow-sky-900/40"
              >
                {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Check className="mr-2 h-5 w-5" />}
                Save Changes
              </Button>
            </DialogFooter>
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
