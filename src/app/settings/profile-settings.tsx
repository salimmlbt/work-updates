'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useTransition } from 'react'
import { Loader2 } from 'lucide-react'
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

const months = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

const profileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  contact: z.string().optional(),
  instagram_username: z.string().optional(),
  birthday_day: z.string().optional(),
  birthday_month: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfileSettings({ profile }: { profile: Profile | null }) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name ?? '',
      contact: profile?.contact ?? '',
      instagram_username: profile?.instagram ? new URL(profile.instagram).pathname.slice(1) : '',
      birthday_day: profile?.birthday ? new Date(profile.birthday).getDate().toString() : '',
      birthday_month: profile?.birthday ? months[new Date(profile.birthday).getMonth()] : '',
    }
  })

  const onSubmit = (data: ProfileFormData) => {
    if (!profile) return;
    
    startTransition(async () => {
      const formData = new FormData();
      formData.append('full_name', data.full_name);
      if (data.contact) formData.append('contact', data.contact);
      if (data.instagram_username) formData.append('instagram_username', data.instagram_username);
      if (data.birthday_day) formData.append('birthday_day', data.birthday_day);
      if (data.birthday_month) formData.append('birthday_month', data.birthday_month);

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
      }
    });
  }

  return (
    <Card className="border-0">
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
          <CardDescription>Update your personal information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback>{getInitials(profile?.full_name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold text-lg">{profile?.full_name}</p>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
            <div className="space-y-8">
               <div className="space-y-2">
                  <Label htmlFor="full-name">Full name</Label>
                  <Input id="full-name" {...register('full_name')} />
                   {errors.full_name && <p className="text-sm text-destructive">{errors.full_name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact">Contact</Label>
                  <Input id="contact" placeholder="Enter contact number" {...register('contact')} />
                </div>
            </div>
            <div className="space-y-8">
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

          <Separator />
          <Button type="submit" disabled={isPending || !isDirty}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
