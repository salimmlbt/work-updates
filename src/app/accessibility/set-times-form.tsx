
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
import { Loader2 } from "lucide-react";

const setTimesSchema = z.object({
  lunchTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format. Use HH:MM"),
  fridayLunchTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format. Use HH:MM"),
});

type SetTimesFormData = z.infer<typeof setTimesSchema>;

interface SetTimesFormProps {
    currentLunchTime: string;
}

export function SetTimesForm({ currentLunchTime }: SetTimesFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
  // Parse initial config
  let initialDefault = '13:00';
  let initialFriday = '13:00';
  
  try {
    const config = JSON.parse(currentLunchTime);
    initialDefault = config.default || '13:00';
    initialFriday = config.friday || '13:00';
  } catch (e) {
    initialDefault = currentLunchTime;
    initialFriday = currentLunchTime;
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<SetTimesFormData>({
    resolver: zodResolver(setTimesSchema),
    defaultValues: {
      lunchTime: initialDefault,
      fridayLunchTime: initialFriday,
    },
  });

  const onSubmit = (data: SetTimesFormData) => {
    const config = JSON.stringify({
        default: data.lunchTime,
        friday: data.fridayLunchTime,
    });

    startTransition(async () => {
      const result = await updateSetting('lunch_start_time', config);
      if (result.error) {
        toast({
          title: "Error updating setting",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Setting Updated",
          description: "Lunch start times have been updated successfully.",
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-sm">
      <div className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="lunchTime">Regular Lunch Out (Mon-Thu, Sat-Sun)</Label>
            <Input
            id="lunchTime"
            type="time"
            {...register("lunchTime")}
            />
            {errors.lunchTime && <p className="text-sm text-destructive">{errors.lunchTime.message}</p>}
        </div>

        <div className="space-y-2">
            <Label htmlFor="fridayLunchTime">Friday Lunch Out</Label>
            <Input
            id="fridayLunchTime"
            type="time"
            {...register("fridayLunchTime")}
            />
            {errors.fridayLunchTime && <p className="text-sm text-destructive">{errors.fridayLunchTime.message}</p>}
        </div>

        <p className="text-sm text-muted-foreground">
          Set the time when the "Lunch Out" button should appear for users based on the day.
        </p>
      </div>
      <Button type="submit" disabled={isPending || !isDirty}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Changes
      </Button>
    </form>
  );
}
