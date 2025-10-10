
'use client'

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { getInitials } from '@/lib/utils';
import type { Profile } from '@/lib/types';
import { Search, Plus } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

interface AddPeopleDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  profiles: Profile[];
  currentUser: User | null;
  selectedPeople: string[];
  onSave: (selectedPeople: string[]) => void;
  excludeIds?: string[];
  title: string;
}

export function AddPeopleDialog({ isOpen, setIsOpen, profiles, currentUser, selectedPeople, onSave, excludeIds = [], title }: AddPeopleDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSelected, setTempSelected] = useState<string[]>(selectedPeople);

  useEffect(() => {
    setTempSelected(selectedPeople);
  }, [isOpen, selectedPeople]);

  const availableProfiles = useMemo(() => {
    return profiles.filter(p => p.email !== 'admin@falaq.com' && !excludeIds.includes(p.id));
  }, [profiles, excludeIds]);

  const filteredProfiles = useMemo(() => {
    return availableProfiles.filter(p =>
      p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [availableProfiles, searchQuery]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredProfiles.map(p => p.id);
      setTempSelected(Array.from(new Set([...tempSelected, ...allIds])));
    } else {
      const filteredIds = filteredProfiles.map(p => p.id);
      setTempSelected(tempSelected.filter(id => !filteredIds.includes(id)));
    }
  };

  const handleSelect = (checked: boolean, profileId: string) => {
    if (checked) {
      setTempSelected(prev => [...prev, profileId]);
    } else {
      setTempSelected(prev => prev.filter(id => id !== profileId));
    }
  };
  
  const allFilteredSelected = filteredProfiles.length > 0 && filteredProfiles.every(p => tempSelected.includes(p.id));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="p-6">
          <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
          <DialogDescription>
            Search for people to add to your project.
          </DialogDescription>
          <div className="relative pt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by name or email"
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </DialogHeader>
        
        <div className="px-6 py-4 border-y">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-muted-foreground">People</h3>
                <div className="flex items-center gap-2">
                    <label htmlFor="select-all" className="text-sm">Select all</label>
                    <Checkbox id="select-all" 
                        onCheckedChange={handleSelectAll}
                        checked={allFilteredSelected}
                    />
                </div>
            </div>
        </div>

        <ScrollArea className="h-80">
          <div className="p-6">
            {filteredProfiles.length > 0 ? (
                <div className="space-y-4">
                {filteredProfiles.map(profile => (
                    <div key={profile.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={profile.avatar_url ?? undefined} />
                                <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium">{profile.full_name} {currentUser?.id === profile.id && '(Me)'}</p>
                                <p className="text-sm text-muted-foreground">{profile.email}</p>
                            </div>
                        </div>
                        <Checkbox 
                            checked={tempSelected.includes(profile.id)}
                            onCheckedChange={(checked) => handleSelect(!!checked, profile.id)}
                        />
                    </div>
                ))}
                </div>
            ) : (
                <div className="text-center text-sm text-muted-foreground py-10">
                    <p>There are no other active users in your organization.</p>
                    <p>Invite them to the organization and wait until they accept the invitation to add them to projects.</p>
                    <Button variant="link" className="mt-2"><Plus className="mr-2 h-4 w-4" /> Invite people to organization</Button>
                </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="p-6 bg-muted/50 flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{tempSelected.length} user{tempSelected.length !== 1 ? 's' : ''} selected</p>
            <div>
                <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button onClick={() => onSave(tempSelected)}>Save</Button>
            </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
