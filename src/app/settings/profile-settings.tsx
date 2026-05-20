
'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useEffect, useTransition, useRef, useState } from 'react'
import { Loader2, Pencil, User, Check, Smartphone, Link as LinkIcon, Calendar } from 'lucide-react'
import 'react-international-phone/style.css';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import type { Profile } from '@/lib/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { updateProfile } from '@/app/actions'
import { PhoneInput } from 'react-international-phone'
import { ImageCropperDialog } from '@/app/clients/image-cropper-dialog'

const months = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

const profileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  contact: z.string().optional(),
  instagram_username: z.string().optional(),
  linkedin_username: z.string().optional(),
  birthday_day: z.string().optional(),
  birthday_month: z.string().optional(),
  avatar: z.any().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfileSettings({ profile }: { profile: Profile | null }) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name ?? '',
      contact: profile?.contact ?? '',
      instagram_username: profile?.instagram ? new URL(profile.instagram).pathname.slice(1) : '',
      linkedin_username: profile?.linkedin ? profile.linkedin.split('/in/')[1]?.replace(/\/$/, '') : '',
      birthday_day: profile?.birthday ? new Date(profile.birthday).getUTCDate().toString() : '',
      birthday_month: profile?.birthday ? months[new Date(profile.birthday).getUTCMonth()] : '',
      avatar: profile?.avatar_url
    }
  })

  useEffect(() => {
    if (profile) {
      reset({
        full_name: profile.full_name ?? '',
        contact: profile.contact ?? '',
        instagram_username: profile?.instagram ? new URL(profile.instagram).pathname.slice(1) : '',
        linkedin_username: profile?.linkedin ? profile.linkedin.split('/in/')[1]?.replace(/\/$/, '') : '',
        birthday_day: profile.birthday ? new Date(profile.birthday).getUTCDate().toString() : '',
        birthday_month: profile.birthday ? months[new Date(profile.birthday).getUTCMonth()] : '',
        avatar: profile.avatar_url
      })
      setAvatarPreview(profile.avatar_url)
    }
  }, [profile, reset])
  
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
    setValue('avatar', croppedImage, { shouldDirty: true });
    setAvatarPreview(URL.createObjectURL(croppedImage));
    setImageToCrop(null);
  };


  const onSubmit = (data: ProfileFormData) => {
    if (!profile) return;
    
    startTransition(async () => {
      const formData = new FormData();
      formData.append('full_name', data.full_name);
      if (data.contact) formData.append('contact', data.contact);
      if (data.instagram_username) formData.append('instagram_username', data.instagram_username);
      if (data.linkedin_username) formData.append('linkedin_username', data.linkedin_username);
      if (data.birthday_day) formData.append('birthday_day', data.birthday_day);
      if (data.birthday_month) formData.append('birthday_month', data.birthday_month);
      if (data.avatar instanceof File) {
        formData.append('avatar', data.avatar)
      }

      const result = await updateProfile(profile.id, formData);

      if (result.error) {
        toast({
          title: "Error updating profile",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Profile Updated",
          description: "Your profile has been successfully updated."
        })
        if (result.data?.avatar_url) {
            setAvatarPreview(result.data.avatar_url);
        }
        reset(data); // to reset dirty state
      }
    });
  }

  return (
    <>
    <Card className="border border-white/10 bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden">
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardHeader className="p-10 pb-4 bg-white/[0.02]">
          <CardTitle className="text-3xl font-black text-white tracking-tighter">My Account</CardTitle>
          <CardDescription className="text-zinc-500 font-medium">Update your professional studio profile and credentials.</CardDescription>
        </CardHeader>
        <CardContent className="p-10 space-y-12">
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
                    className="h-28 w-28 cursor-pointer border-2 border-white/10 shadow-2xl transition-all group-hover:scale-105"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <AvatarImage src={avatarPreview ?? undefined} />
                    <AvatarFallback className="bg-zinc-800 text-zinc-400 font-bold text-xl">
                        {getInitials(profile?.full_name)}
                    </AvatarFallback>
                </Avatar>
                <button
                    type="button"
                    className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-sky-600 text-white shadow-xl opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Pencil className="h-4 w-4" />
                </button>
            </div>
            <div>
              <p className="font-black text-2xl text-white tracking-tight">{profile?.full_name}</p>
              <p className="text-sm text-zinc-500 font-bold uppercase tracking-tight">{profile?.email}</p>
            </div>
          </div>

          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-3">
                <Label htmlFor="full-name" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Official Name</Label>
                <Input id="full-name" {...register('full_name')} className="h-12 bg-white/5 border-white/10 text-white focus-visible:ring-sky-500/50 rounded-xl" />
                {errors.full_name && <p className="text-xs font-bold text-rose-500">{errors.full_name.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="linkedin_username" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">LinkedIn Profile</Label>
                <div className="flex items-center group">
                  <span className="inline-flex h-12 items-center rounded-l-xl border border-r-0 border-white/10 bg-white/5 px-4 text-xs font-bold text-zinc-500 transition-colors group-focus-within:text-sky-400">
                    <LinkIcon className="h-3 w-3 mr-2" />
                    /in/
                  </span>
                  <Input
                    id="linkedin_username"
                    type="text"
                    placeholder="username"
                    className="h-12 rounded-l-none bg-white/[0.02] border-white/10 text-white focus-visible:ring-sky-500/50 rounded-r-xl"
                    {...register('linkedin_username')}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <Label htmlFor="instagram_username" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Instagram Account</Label>
                <div className="flex items-center group">
                  <span className="inline-flex h-12 items-center rounded-l-xl border border-r-0 border-white/10 bg-white/5 px-4 text-xs font-bold text-zinc-500 transition-colors group-focus-within:text-pink-400">
                    <LinkIcon className="h-3 w-3 mr-2" />
                    @
                  </span>
                  <Input
                    id="instagram_username"
                    type="text"
                    placeholder="username"
                    className="h-12 rounded-l-none bg-white/[0.02] border-white/10 text-white focus-visible:ring-sky-500/50 rounded-r-xl"
                    {...register('instagram_username')}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="contact" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Contact Number</Label>
                <Controller
                  name="contact"
                  control={control}
                  render={({ field }) => (
                    <PhoneInput
                      {...field}
                      defaultCountry="in"
                      inputClassName="!h-12 !w-full !rounded-xl !border-white/10 !bg-white/[0.02] !text-white !font-bold !pl-4 focus-within:!ring-2 focus-within:!ring-sky-500/50"
                      countrySelectorStyleProps={{
                        buttonClassName: "!h-12 !rounded-l-xl !border-white/10 !bg-white/5 !px-3"
                      }}
                    />
                  )}
                />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Birthday</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Input id="day" placeholder="Day" {...register('birthday_day')} className="h-12 bg-white/5 border-white/10 text-white rounded-xl font-bold" />
                  <Controller
                    name="birthday_month"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <SelectTrigger id="month" className="h-12 bg-white/5 border-white/10 text-white rounded-xl font-bold">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-white shadow-2xl">
                          {months.map((month) => (
                            <SelectItem key={month} value={month}>{month}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5 flex items-center justify-between">
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Last updated: Today</p>
              <Button type="submit" disabled={isPending || !isDirty} className="rounded-full h-12 px-8 bg-sky-600 hover:bg-sky-500 text-white font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-sky-900/40">
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Save Statement
              </Button>
          </div>
        </CardContent>
      </form>
    </Card>
      <ImageCropperDialog
        isOpen={!!imageToCrop}
        image={imageToCrop}
        onClose={() => setImageToCrop(null)}
        onCropComplete={onCropComplete}
      />
    </>
  );
}
