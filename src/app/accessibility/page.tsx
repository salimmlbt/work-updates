
import { createServerClient } from '@/lib/supabase/server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SetTimesForm } from './set-times-form';
import IndustryTypes from './industry-types';
import WorkTypes from './work-types';
import type { Industry, WorkType, WorkTypeStatusConfig } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AccessibilityPage() {
    const supabase = await createServerClient();
    
    const [
        { data: lunchSetting },
        { data: statusConfigSetting },
        { data: industriesData, error: industriesError },
        { data: workTypesData, error: workTypesError },
    ] = await Promise.all([
        supabase.from('app_settings').select('value').eq('key', 'lunch_start_time').single(),
        supabase.from('app_settings').select('value').eq('key', 'work_type_status_config').single(),
        supabase.from('industries').select('*'),
        supabase.from('work_types').select('*'),
    ]);
    
    if (industriesError) console.error('Error fetching industries', industriesError);
    if (workTypesError) console.error('Error fetching work types', workTypesError);

    const lunchStartTime = (lunchSetting?.value as string | undefined) || '13:00';
    const workTypeStatusConfig = (statusConfigSetting?.value as WorkTypeStatusConfig | undefined) || {};

  return (
    <div className="p-4 md:p-8 lg:p-10 min-h-screen bg-[#0f0f0f] text-zinc-100">
      <header className="mb-12 border-b border-white/10 pb-8">
        <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Accessibility Center</h1>
        <p className="text-sm text-zinc-500 font-bold uppercase tracking-[0.25em] mt-1">Configure workspace rules and dynamic studio parameters</p>
      </header>

      <Tabs defaultValue="set-times" className="space-y-10">
        <TabsList className="bg-white/5 border border-white/10 rounded-full p-1 h-12 w-full max-w-2xl flex items-center justify-between">
          <TabsTrigger
            value="set-times"
            className="flex-1 rounded-full h-9 text-[10px] font-black uppercase tracking-widest transition-all duration-300 data-[state=active]:bg-white data-[state=active]:text-zinc-950"
          >
            System Times
          </TabsTrigger>
          <TabsTrigger
            value="cache-timer"
            className="flex-1 rounded-full h-9 text-[10px] font-black uppercase tracking-widest transition-all duration-300 data-[state=active]:bg-white data-[state=active]:text-zinc-950"
          >
            Optimization
          </TabsTrigger>
          <TabsTrigger
            value="types"
            className="flex-1 rounded-full h-9 text-[10px] font-black uppercase tracking-widest transition-all duration-300 data-[state=active]:bg-white data-[state=active]:text-zinc-950"
          >
            Data Schemas
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="set-times" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border border-white/10 bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-10">
                <CardHeader className="p-0 mb-10">
                    <CardTitle className="text-2xl font-black text-white tracking-tight">Clock Settings</CardTitle>
                    <CardDescription className="text-zinc-500 font-medium">
                        Configure global shift windows and break parameters for the entire organization.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <SetTimesForm currentLunchTime={lunchStartTime} />
                </CardContent>
            </Card>
        </TabsContent>
        
        <TabsContent value="cache-timer" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border border-white/10 bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-10">
            <CardHeader className="p-0 mb-10">
              <CardTitle className="text-2xl font-black text-white tracking-tight">System Cache</CardTitle>
              <CardDescription className="text-zinc-500 font-medium">
                Manage data persistence and live-sync intervals for the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
               <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[2rem] bg-white/[0.01]">
                <p className="text-zinc-600 font-black uppercase tracking-widest text-[10px]">Cache management protocols under construction</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="types" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Tabs defaultValue="industry-type" className="space-y-8">
            <TabsList className="bg-transparent p-0 border-b border-white/5 rounded-none gap-8">
              <TabsTrigger value="industry-type" className="bg-transparent border-0 rounded-none px-0 pb-3 text-zinc-500 font-bold uppercase tracking-widest text-[10px] data-[state=active]:text-sky-400 data-[state=active]:border-b-2 data-[state=active]:border-sky-400 shadow-none">Client Industries</TabsTrigger>
              <TabsTrigger value="work-type" className="bg-transparent border-0 rounded-none px-0 pb-3 text-zinc-500 font-bold uppercase tracking-widest text-[10px] data-[state=active]:text-sky-400 data-[state=active]:border-b-2 data-[state=active]:border-sky-400 shadow-none">Task Archetypes</TabsTrigger>
            </TabsList>
            <TabsContent value="industry-type" className="mt-0">
              <IndustryTypes initialIndustries={industriesData as Industry[] ?? []} />
            </TabsContent>
            <TabsContent value="work-type" className="mt-0">
              <WorkTypes initialWorkTypes={workTypesData as WorkType[] ?? []} initialStatusConfig={workTypeStatusConfig} />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
