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
import { Loader2, Calendar, Clock, AlertTriangle, ExternalLink } from "lucide-react";

const setSettingsSchema = z.object({
  lunchTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format. Use HH:MM"),
  fridayLunchTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format. Use HH:MM"),
  allowance: z.number().min(0, "Allowance must be at least 0").max(365, "Too many days"),
  gracePeriod: z.number().min(0, "Grace period must be at least 0").max(120, "Max 120 minutes"),
  checkInDelay: z.number().min(0, "Min 0").max(120, "Max 120 minutes"),
  lunchOutDelay: z.number().min(0).max(120, "Max 120 minutes"),
  lunchInDelay: z.number().min(0).max(120, "Max 120 minutes"),
  checkoutRedirectUrl: z.string().url("Please enter a valid URL (starting with http:// or https://)").optional().or(z.literal('')),
});

type SetSettingsFormData = z.infer<typeof setSettingsSchema>;

interface SetTimesFormProps {
    currentLunchTime: string;
    initialAllowance: number;
    initialGracePeriod: number;
    initialCheckInDelay: number;
    initialLunchOutDelay: number;
    initialLunchInDelay: number;
    initialCheckoutRedirectUrl: string;
}

export function SetTimesForm({ 
  currentLunchTime, 
  initialAllowance, 
  initialGracePeriod,
  initialCheckInDelay,
  initialLunchOutDelay,
  initialLunchInDelay,
  initialCheckoutRedirectUrl,
}: SetTimesFormProps) {
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
      checkInDelay: initialCheckInDelay,
      lunchOutDelay: initialLunchOutDelay,
      lunchInDelay: initialLunchInDelay,
      checkoutRedirectUrl: initialCheckoutRedirectUrl,
    },
  });

  const onSubmit = (data: SetSettingsFormData) => {
    startTransition(async () => {
      const lunchConfig = JSON.stringify({
          default: data.lunchTime,
          friday: data.fridayLunchTime,
      });

      const results = await Promise.all([
        updateSetting('lunch_start_time', lunchConfig),
        updateSetting('annual_leave_allowance', data.allowance),
        updateSetting('late_check_in_grace_period', data.gracePeriod),
        updateSetting('check_in_warning_delay', data.checkInDelay),
        updateSetting('lunch_out_warning_delay', data.lunchOutDelay),
        updateSetting('lunch_in_warning_delay', data.lunchInDelay),
        updateSetting('checkout_redirect_url', data.checkoutRedirectUrl),
      ]);

      const error = results.find(r => r.error);

      if (error) {
        toast({
          title: "Error updating settings",
          description: error.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Settings Updated",
          description: "Studio rules and workflow automations have been updated.",
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-12 max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-8">
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

        <div className="space-y-8">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-400 border-b border-sky-500/10 pb-2">Warning Protocols</h3>
          
          <div className="space-y-2">
              <Label htmlFor="checkInDelay" className="text-zinc-400 font-bold">Check-in Warning Delay (Mins)</Label>
              <div className="relative">
                  <AlertTriangle className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-500/50" />
                  <Input
                      id="checkInDelay"
                      type="number"
                      className="h-12 bg-white/5 border-white/10 rounded-xl font-black pl-12 text-rose-400"
                      {...register("checkInDelay", { valueAsNumber: true })}
                  />
              </div>
              <p className="text-[10px] text-zinc-500 font-medium px-1">Banner appears after this many mins from Work Start.</p>
          </div>

          <div className="space-y-2">
              <Label htmlFor="lunchOutDelay" className="text-zinc-400 font-bold">Lunch Out Warning Delay (Mins)</Label>
              <div className="relative">
                  <AlertTriangle className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500/50" />
                  <Input
                      id="lunchOutDelay"
                      type="number"
                      className="h-12 bg-white/5 border-white/10 rounded-xl font-black pl-12 text-amber-400"
                      {...register("lunchOutDelay", { valueAsNumber: true })}
                  />
              </div>
              <p className="text-[10px] text-zinc-500 font-medium px-1">Banner appears after this many mins from Lunch window.</p>
          </div>

          <div className="space-y-2">
              <Label htmlFor="lunchInDelay" className="text-zinc-400 font-bold">Lunch Return Warning Delay (Mins)</Label>
              <div className="relative">
                  <AlertTriangle className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-sky-500/50" />
                  <Input
                      id="lunchInDelay"
                      type="number"
                      className="h-12 bg-white/5 border-white/10 rounded-xl font-black pl-12 text-sky-400"
                      {...register("lunchInDelay", { valueAsNumber: true })}
                  />
              </div>
              <p className="text-[10px] text-zinc-500 font-medium px-1">Banner appears after this many mins from 1-hour break end.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 border-b border-white/5 pb-2">Organization Parameters</h3>
            
            <div className="space-y-2">
                <Label htmlFor="allowance" className="text-zinc-400 font-bold">Base Annual Allowance (Days)</Label>
                <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                        id="allowance"
                        type="number"
                        className="h-12 bg-white/5 border-white/10 rounded-xl font-black pl-12 text-indigo-400"
                        {...register("allowance", { valueAsNumber: true })}
                    />
                </div>
                {errors.allowance && <p className="text-xs text-rose-500 font-bold">{errors.allowance.message}</p>}
            </div>
        </div>

        <div className="space-y-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 border-b border-purple-500/10 pb-2">Checkout Automation</h3>
            
            <div className="space-y-2">
                <Label htmlFor="checkoutRedirectUrl" className="text-zinc-400 font-bold">Post-Checkout Website</Label>
                <div className="relative">
                    <ExternalLink className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-500/50" />
                    <Input
                        id="checkoutRedirectUrl"
                        placeholder="https://workflow.falaq.com"
                        className="h-12 bg-white/5 border-white/10 rounded-xl font-medium pl-12 text-zinc-200"
                        {...register("checkoutRedirectUrl")}
                    />
                </div>
                <p className="text-[10px] text-zinc-500 font-medium px-1">Opened in a new tab immediately after a successful checkout.</p>
                {errors.checkoutRedirectUrl && <p className="text-xs text-rose-500 font-bold">{errors.checkoutRedirectUrl.message}</p>}
            </div>
        </div>
      </div>

      <Button type="submit" disabled={isPending || !isDirty} className="rounded-full h-14 px-10 bg-sky-600 hover:bg-sky-500 text-white font-black uppercase tracking-widest text-xs shadow-2xl shadow-sky-900/40 transition-all active:scale-95">
        {isPending ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <Check className="mr-3 h-5 w-5" />}
        Authorize System Changes
      </Button>
    </form>
  );
}

import { Check } from "lucide-react";
