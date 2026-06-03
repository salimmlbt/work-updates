'use client'

import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { updateSetting } from "@/app/actions";
import { Loader2, Calendar, Clock } from "lucide-react";

const setSettingsSchema = z.object({
  lunchTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format. Use HH:MM"),
  fridayLunchTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format. Use HH:MM"),
  allowance: z.number().min(0, "Allowance must be at least 0").max(365, "Too many days"),
  gracePeriod: z.number().min(0, "Grace period must be at least 0").max(120, "Max 120 minutes"),
});

type SetSettingsFormData = z.infer<typeof setSettingsSchema>;

interface SetTimesFormProps {
    currentLunchTime: string;
    initialAllowance: number;
    initialGracePeriod: number;
}

export function SetTimesForm({ currentLunchTime, initialAllowance, initialGracePeriod }: SetTimesFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
  // Parse initial config safely
  let initialDefault = '13:00';
  let initialFriday = '13:00';
  
  if (currentLunchTime && typeof currentLunchTime === 'string' && currentLunchTime.trim().length > 0) {
    try {
      if (currentLunchTime.trim().startsWith('{')) {
        const config = JSON.parse(currentLunchTime);
        initialDefault = config.default || '13:00';
        initialFriday = config.friday || '13:00';
      } else {
        initialDefault = currentLunchTime;
        initialFriday = currentLunchTime;
      }
    } catch (e) {
      console.warn("Could not parse lunch time setting, using defaults:", e);
      initialDefault = '13:00';
      initialFriday = '13:00';
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<SetSettingsFormData>({
    resolver: zodResolver(setSettingsSchema),
    defaultValues: {
      lunchTime: initialDefault,
      fridayLunchTime: initialFriday,
      allowance: initialAllowance,
      gracePeriod: initialGracePeriod,
    },
  });

  const onSubmit = (data: SetSettingsFormData) => {
    startTransition(async () => {
      const lunchConfig = JSON.stringify({
          default: data.lunchTime,
          friday: data.fridayLunchTime,
      });

      const [lunchRes, allowanceRes, graceRes] = await Promise.all([
        updateSetting('lunch_start_time', lunchConfig),
        updateSetting('annual_leave_allowance', data.allowance),
        updateSetting('late_check_in_grace_period', data.gracePeriod),
      ]);

      if (lunchRes.error || allowanceRes.error || graceRes.error) {
        toast({
          title: "Error updating settings",
          description: lunchRes.error || allowanceRes.error || graceRes.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Settings Updated",
          description: "Studio rules have been updated successfully.",
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-10 max-w-sm">
      <div className="space-y-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 border-b border-white/5 pb-2">Shift Parameters</h3>
        
        <div className="space-y-2">
            <Label htmlFor="lunchTime" className="text-zinc-400 font-bold">Regular Lunch Out (Mon-Thu, Sat-Sun)</Label>
            <Input
            id="lunchTime"
            type="time"
            className="h-12 bg-white/5 border-white/10 rounded-xl font-bold px-4"
            {...register("lunchTime")}
            />
            {errors.lunchTime && <p className="text-xs text-rose-500 font-bold">{errors.lunchTime.message}</p>}
        </div>

        <div className="space-y-2">
            <Label htmlFor="fridayLunchTime" className="text-zinc-400 font-bold">Friday Lunch Out</Label>
            <Input
            id="fridayLunchTime"
            type="time"
            className="h-12 bg-white/5 border-white/10 rounded-xl font-bold px-4"
            {...register("fridayLunchTime")}
            />
            {errors.fridayLunchTime && <p className="text-xs text-rose-500 font-bold">{errors.fridayLunchTime.message}</p>}
        </div>

        <div className="space-y-2">
            <Label htmlFor="gracePeriod" className="text-zinc-400 font-bold">Late Reason Grace Period (Mins)</Label>
            <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                    id="gracePeriod"
                    type="number"
                    className="h-12 bg-white/5 border-white/10 rounded-xl font-black pl-12 text-amber-400"
                    {...register("gracePeriod", { valueAsNumber: true })}
                />
            </div>
            <p className="text-[10px] text-zinc-500 font-medium px-1">Minutes allowed after "Work Start Time" before a reason is required.</p>
            {errors.gracePeriod && <p className="text-xs text-rose-500 font-bold">{errors.gracePeriod.message}</p>}
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 border-b border-white/5 pb-2">Leave Parameters</h3>
        
        <div className="space-y-2">
            <Label htmlFor="allowance" className="text-zinc-400 font-bold">Base Annual Allowance (Days)</Label>
            <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                    id="allowance"
                    type="number"
                    className="h-12 bg-white/5 border-white/10 rounded-xl font-black pl-12 text-sky-400"
                    {...register("allowance", { valueAsNumber: true })}
                />
            </div>
            {errors.allowance && <p className="text-xs text-rose-500 font-bold">{errors.allowance.message}</p>}
        </div>
      </div>

      <Button type="submit" disabled={isPending || !isDirty} className="rounded-full h-12 px-8 bg-sky-600 hover:bg-sky-500 font-bold shadow-2xl">
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save System Changes
      </Button>
    </form>
  );
}
