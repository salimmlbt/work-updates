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
import StudioLocations from './studio-locations';
import type { Industry, WorkType, WorkTypeStatusConfig, OfficeLocation } from '@/lib/types';
import { GeofencingToggle } from './geofencing-toggle';

export const dynamic = 'force-dynamic';

export default async function AccessibilityPage() {
    const supabase = await createServerClient();
    
    const [
        { data: lunchSetting },
        { data: allowanceSetting },
        { data: graceSetting },
        { data: statusConfigSetting },
        { data: geofencingSetting },
        { data: industriesData, error: industriesError },
        { data: workTypesData, error: workTypesError },
        { data: locationsData, error: locationsError },
    ] = await Promise.all([
        supabase.from('app_settings').select('value').eq('key', 'lunch_start_time').single(),
        supabase.from('app_settings').select('value').eq('key', 'annual_leave_allowance').single(),
        supabase.from('app_settings').select('value').eq('key', 'late_check_in_grace_period').single(),
        supabase.from('app_settings').select('value').eq('key', 'work_type_status_config').single(),
        supabase.from('app_settings').select('value').eq('key', 'global_geofencing_enabled').single(),
        supabase.from('industries').select('*'),
        supabase.from('work_types').select('*'),
        supabase.from('office_locations').select('*'),
    ]);
    
    if (industriesError) console.error('Error fetching industries', industriesError);
    if (workTypesError) console.error('Error fetching work types', workTypesError);
    if (locationsError) console.error('Error fetching locations', locationsError);

    const lunchStartTime = (lunchSetting?.value as string | undefined) || '13:00';
    const annualLeaveAllowance = (allowanceSetting?.value as number | undefined) || 28;
    const lateGracePeriod = (graceSetting?.value as number | undefined) || 0;
    const workTypeStatusConfig = (statusConfigSetting?.value as WorkTypeStatusConfig | undefined) || {};
    const globalGeofencingEnabled = geofencingSetting?.value === true;

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
            value="security"
            className="flex-1 rounded-full h-9 text-[10px] font-black uppercase tracking-widest transition-all duration-300 data-[state=active]:bg-white data-[state=active]:text-zinc-950"
          >
            Security & Location
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
                    <CardTitle className="text-2xl font-black text-white tracking-tight">System Settings</CardTitle>
                    <CardDescription className="text-zinc-500 font-medium">
                        Configure global shift windows, break parameters, and leave allowances for the organization.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <SetTimesForm 
                        currentLunchTime={lunchStartTime} 
                        initialAllowance={annualLeaveAllowance}
                        initialGracePeriod={lateGracePeriod}
                    />
                </CardContent>
            </Card>
        </TabsContent>
        
        <TabsContent value="security" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Tabs defaultValue="geofencing" className="space-y-10">
            <TabsList className="bg-transparent p-0 border-b border-white/5 rounded-none gap-8">
              <TabsTrigger value="geofencing" className="bg-transparent border-0 rounded-none px-0 pb-3 text-zinc-500 font-bold uppercase tracking-widest text-[10px] data-[state=active]:text-sky-400 data-[state=active]:border-b-2 data-[state=active]:border-sky-400 shadow-none">Global Control</TabsTrigger>
              <TabsTrigger value="locations" className="bg-transparent border-0 rounded-none px-0 pb-3 text-zinc-500 font-bold uppercase tracking-widest text-[10px] data-[state=active]:text-sky-400 data-[state=active]:border-b-2 data-[state=active]:border-sky-400 shadow-none">Studio Locations</TabsTrigger>
            </TabsList>
            <TabsContent value="geofencing" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card className="border border-white/10 bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-10">
                <CardHeader className="p-0 mb-10">
                  <CardTitle className="text-2xl font-black text-white tracking-tight">Access Control</CardTitle>
                  <CardDescription className="text-zinc-500 font-medium">
                    Manage global geofencing and proximity-based attendance protocols.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-w-md space-y-8">
                      <GeofencingToggle initialValue={globalGeofencingEnabled} />
                      
                      <div className="p-6 rounded-[2rem] bg-sky-500/5 border border-sky-500/10">
                        <h4 className="text-sky-400 font-black uppercase tracking-widest text-[10px] mb-2">Protocol Note</h4>
                        <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                            When Global Geofencing is enabled, all users (except those with exceptions) must be within their assigned radius to log attendance. User-level coordinates are managed in the Team & Users section.
                        </p>
                      </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="locations" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <StudioLocations initialLocations={locationsData as OfficeLocation[] ?? []} />
            </TabsContent>
          </Tabs>
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
