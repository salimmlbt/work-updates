
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import type { Profile } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function ProfileSettings({ profile }: { profile: Profile | null }) {
  const firstName = profile?.full_name?.split(' ')[0] || '';

  return (
    <Card>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="first-name">First name</Label>
            <Input id="first-name" defaultValue={firstName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact">Contact</Label>
            <Input id="contact" placeholder="Enter contact number" defaultValue={profile?.contact ?? ''} />
          </div>
        </div>
        
        <div className="space-y-2">
            <Label htmlFor="instagram">Instagram</Label>
            <Input id="instagram" placeholder="Enter Instagram profile URL" defaultValue={profile?.instagram ?? ''} />
        </div>

        <div className="space-y-2">
            <Label>Birthday</Label>
            <div className="grid grid-cols-3 gap-4">
                <Input id="day" placeholder="Day" />
                 <Select>
                    <SelectTrigger id="month">
                        <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                        {/* Add months here */}
                    </SelectContent>
                </Select>
                 <Input id="year" placeholder="Year" />
            </div>
        </div>

        <Separator />
        <Button>Save Changes</Button>
      </CardContent>
    </Card>
  );
}
