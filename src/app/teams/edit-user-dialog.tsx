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
import { Loader2, Pencil, User, ChevronDown, Trash2, MapPin, Navigation, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { Role, Team, Profile } from '@/lib/types'
import { updateUser } from './actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ImageCropperDialog } from '@/app/clients/image-cropper-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { cn, getInitials } from '@/lib/utils'
import { LocationPicker } from '@/components/dashboard/location-picker'

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
        toast({ 
          title: "Error updating user", 
          description: typeof error === 'string' ? error : (error as any).message || "Unknown error", 
          variant: "destructive" 
        });
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
          <DialogContent className="sm:max-w-3xl max-h-[95vh] p-0 rounded-[3rem] bg-zinc-950 border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden">
            <DialogHeader className="p-10 pb-4">
              <DialogTitle className="text-3xl font-black tracking-tight text-white uppercase">Edit User Statement</DialogTitle>
              <DialogDescription className="text-zinc-500 font-medium">
                Update core credentials and workspace access protocols.
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="flex-1 px-10 py-4 custom-scrollbar">
                <form id="edit-user-form" onSubmit={handleUpdateUser} className="space-y-12 pb-10">
                    <div className="flex items-center gap-8">
                        <div className="relative group">
                            <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleAvatarChange}
                            />
                            <Avatar
                            className="h-32 w-32 cursor-pointer border-2 border-white/10 shadow-2xl transition-all group-hover:scale-105"
                            onClick={() => fileInputRef.current?.click()}
                            >
                            <AvatarImage src={avatarPreview ?? undefined} />
                            <AvatarFallback className="bg-zinc-900 text-zinc-700 font-black text-xl">
                                {getInitials(user.full_name)}
                            </AvatarFallback>
                            </Avatar>
                            <div className="absolute bottom-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    type="button"
                                    className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-600 text-white shadow-xl"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Pencil className="h-5 w-5" />
                                </button>
                                {avatarPreview && (
                                    <button
                                        type="button"
                                        className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-600 text-white shadow-xl"
                                        onClick={handleDeleteAvatar}
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-2xl font-black text-white tracking-tighter">{user.full_name}</h3>
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em]">{user.email}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Official Name</Label>
                            <Input name="name" value={formState.name} onChange={handleInputChange} className="h-14 bg-white/5 border-white/10 rounded-2xl font-bold px-6 text-lg" />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Access Role</Label>
                            <Select name="roleId" onValueChange={handleSelectChange('roleId')} value={formState.roleId}>
                                <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl font-bold px-6">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                    {roles.map(role => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Assigned Teams</Label>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between h-14 bg-white/5 border-white/10 rounded-2xl font-bold px-6">
                                        <span className="truncate">{formState.teamIds.length > 0 ? `${formState.teamIds.length} Teams Active` : "No Team Assigned"}</span>
                                        <ChevronDown className="h-4 w-4 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-[350px] bg-zinc-900 border-zinc-800 text-white shadow-2xl">
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
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Monthly Salary (INR)</Label>
                            <Input name="monthlySalary" type="number" value={formState.monthlySalary} onChange={handleInputChange} className="h-14 bg-white/5 border-white/10 rounded-2xl font-bold px-6" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Daily Check In</Label>
                            <Input name="workStartTime" type="time" value={formState.workStartTime} onChange={handleInputChange} className="h-14 bg-white/5 border-white/10 rounded-2xl font-bold px-6" />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Daily Check Out</Label>
                            <Input name="workEndTime" type="time" value={formState.workEndTime} onChange={handleInputChange} className="h-14 bg-white/5 border-white/10 rounded-2xl font-bold px-6" />
                        </div>
                    </div>

                    <div className="space-y-8 pt-10 border-t border-white/5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-400 shadow-lg shadow-sky-900/10">
                                    <MapPin className="h-6 w-6" />
                                </div>
                                <div>
                                    <h4 className="text-lg font-black text-white uppercase tracking-tight">Proximity Attendance</h4>
                                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Enforce location-based studio protocols</p>
                                </div>
                            </div>
                            <Switch 
                                checked={formState.geofencing_enabled} 
                                onCheckedChange={(val) => setFormState(p => ({ ...p, geofencing_enabled: val }))}
                                className="scale-125 data-[state=checked]:bg-sky-500"
                            />
                        </div>

                        {formState.geofencing_enabled && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500 bg-white/[0.01] p-8 rounded-[3rem] border border-white/5">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">Latitude</Label>
                                        <Input name="latitude" value={formState.latitude} onChange={handleInputChange} placeholder="e.g. 25.1234" className="h-12 bg-zinc-950 border-white/5 text-sky-300 font-mono" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">Longitude</Label>
                                        <Input name="longitude" value={formState.longitude} onChange={handleInputChange} placeholder="e.g. 55.5678" className="h-12 bg-zinc-950 border-white/5 text-sky-300 font-mono" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">Radius (Meters)</Label>
                                        <Input name="radius" type="number" value={formState.radius} onChange={handleInputChange} placeholder="100" className="h-12 bg-zinc-950 border-white/5 text-white font-bold" />
                                    </div>
                                </div>

                                <LocationPicker 
                                  lat={parseFloat(formState.latitude) || null} 
                                  lng={parseFloat(formState.longitude) || null} 
                                  radius={parseInt(formState.radius) || 100}
                                  onLocationChange={(lat, lng) => setFormState(p => ({ ...p, latitude: lat.toString(), longitude: lng.toString() }))}
                                />

                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    className="w-full rounded-2xl border-sky-500/20 bg-sky-500/5 text-sky-400 hover:bg-sky-500/10 font-bold h-14 transition-all"
                                    onClick={handleCaptureLocation}
                                    disabled={isLocating}
                                >
                                    {isLocating ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <Navigation className="h-5 w-5 mr-3" />}
                                    Sync Coordinates to My Position
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3 pt-6">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Security Credential Update</Label>
                        <Input name="password" type="password" placeholder="Enter new password to override (min 6 chars)" value={formState.password} onChange={handleInputChange} className="h-14 bg-white/5 border-white/10 rounded-2xl font-bold px-6" />
                    </div>
                </form>
            </ScrollArea>

            <DialogFooter className="p-10 pt-6 border-t border-white/10 flex gap-6 bg-zinc-950">
              <Button variant="ghost" onClick={() => setIsOpen(false)} className="rounded-2xl h-16 px-10 text-zinc-400 hover:text-white font-bold uppercase tracking-widest text-xs">Discard Changes</Button>
              <Button 
                type="submit" 
                form="edit-user-form"
                disabled={isPending || !isFormValid}
                className="flex-1 rounded-3xl h-16 bg-sky-600 hover:bg-sky-500 text-white font-black uppercase tracking-widest text-sm shadow-2xl shadow-sky-900/40"
              >
                {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Check className="mr-2 h-5 w-5" />}
                Commit User Changes
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
        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.1);
          }
        `}</style>
      </>
  )
}
