'use client'

import { useState, useTransition } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { updateSetting } from '@/app/actions'
import { Loader2, ShieldCheck, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

export function GeofencingToggle({ initialValue }: { initialValue: boolean }) {
  const [isEnabled, setIsEnabled] = useState(initialValue);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleToggle = (checked: boolean) => {
    startTransition(async () => {
      const result = await updateSetting('global_geofencing_enabled', checked);
      if (result.error) {
        toast({ title: "Update failed", description: result.error, variant: "destructive" });
      } else {
        setIsEnabled(checked);
        toast({ 
          title: checked ? "Geofencing Active" : "Geofencing Disabled",
          description: `Global proximity attendance is now ${checked ? 'enforced' : 'turned off'}.`
        });
      }
    });
  };

  return (
    <div className={cn(
        "flex items-center justify-between p-8 rounded-[2.5rem] border transition-all duration-500",
        isEnabled ? "bg-emerald-500/5 border-emerald-500/20 shadow-emerald-500/5" : "bg-white/[0.02] border-white/10"
    )}>
      <div className="flex items-center gap-5">
        <div className={cn(
            "h-14 w-14 rounded-2xl flex items-center justify-center transition-all shadow-2xl",
            isEnabled ? "bg-emerald-500 text-white" : "bg-zinc-800 text-zinc-500"
        )}>
          {isEnabled ? <ShieldCheck className="h-7 w-7" /> : <ShieldAlert className="h-7 w-7" />}
        </div>
        <div className="space-y-1">
          <Label htmlFor="global-geofence" className="text-lg font-black text-white uppercase tracking-tight cursor-pointer">
            Global Geofencing
          </Label>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            {isEnabled ? 'System-wide proximity check is ON' : 'Proximity checks are currently OPTIONAL'}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {isPending && <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />}
        <Switch
          id="global-geofence"
          checked={isEnabled}
          onCheckedChange={handleToggle}
          disabled={isPending}
          className="data-[state=checked]:bg-emerald-500"
        />
      </div>
    </div>
  );
}
