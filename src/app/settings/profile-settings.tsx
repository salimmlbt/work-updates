
'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useEffect, useTransition, useRef, useState } from 'react'
import { Loader2, Pencil, User } from 'lucide-react'
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
    <Card className="border-0">
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
          <CardDescription>Update your personal information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="flex items-center gap-4">
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
            <div>
              <p className="font-bold text-lg">{profile?.full_name}</p>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
          </div>

          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-x-6 gap-y-8">
              <div className="space-y-2">
                <Label htmlFor="full-name">Full name</Label>
                <Input id="full-name" {...register('full_name')} />
                {errors.full_name && <p className="text-sm text-destructive">{errors.full_name.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
              <div className="space-y-2">
                <Label htmlFor="linkedin_username">LinkedIn</Label>
                <div className="flex items-center">
                  <span className="inline-flex h-10 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                    linkedin.com/in/
                  </span>
                  <Input
                    id="linkedin_username"
                    type="text"
                    placeholder="username"
                    className="rounded-l-none"
                    {...register('linkedin_username')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram_username">Instagram</Label>
                <div className="flex items-center">
                  <span className="inline-flex h-10 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                    instagram.com/
                  </span>
                  <Input
                    id="instagram_username"
                    type="text"
                    placeholder="username"
                    className="rounded-l-none"
                    {...register('instagram_username')}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
              <div className="space-y-2">
                <Label htmlFor="contact">Contact</Label>
                <Controller
                  name="contact"
                  control={control}
                  render={({ field }) => (
                    <PhoneInput
                      {...field}
                      defaultCountry="in"
                      inputClassName="!h-10 !w-full !rounded-md !border !border-input !bg-background !px-3 !py-2 !text-base !ring-offset-background file:!border-0 file:!bg-transparent file:!text-sm file:!font-medium placeholder:!text-muted-foreground focus-visible:!outline-none focus-visible:!ring-2 focus-visible:!ring-ring focus-visible:!ring-offset-2 disabled:!cursor-not-allowed disabled:!opacity-50 md:!text-sm"
                      countrySelectorStyleProps={{
                        buttonClassName: "!h-10 !rounded-l-md !border-input !bg-muted"
                      }}
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Birthday</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Input id="day" placeholder="Day" {...register('birthday_day')} />
                  <Controller
                    name="birthday_month"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger id="month">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
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

          <Separator />
          <Button type="submit" disabled={isPending || !isDirty}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
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

    