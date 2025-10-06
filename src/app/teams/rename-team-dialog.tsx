
'use client'

import { useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { Team } from '@/lib/types'
import { updateTeam } from './actions'

interface RenameTeamDialogProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  team: Team
  onTeamUpdated: (updatedTeam: Team) => void;
}

export function RenameTeamDialog({ isOpen, setIsOpen, team, onTeamUpdated }: RenameTeamDialogProps) {
  const [teamName, setTeamName] = useState(team.name)
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setTeamName(team.name);
  }, [team]);

  const handleClose = () => {
    setIsOpen(false);
  }

  const handleRenameTeam = () => {
    if (!teamName.trim() || teamName.trim() === team.name) {
        handleClose();
        return;
    }
    startTransition(async () => {
      const { data, error } = await updateTeam(team.id, teamName.trim());
      if (error) {
        toast({ title: "Error renaming team", description: error, variant: "destructive" });
      } else if (data) {
        toast({ title: "Team renamed", description: `Team has been renamed to "${data.name}".` });
        onTeamUpdated(data as Team)
        handleClose();
      }
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Rename team</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="team-name">Team Name</Label>
            <Input 
              id="team-name"
              placeholder="Enter team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="justify-end sm:justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleRenameTeam}
            disabled={!teamName.trim() || teamName.trim() === team.name || isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
