
import { createServerClient } from '@/lib/supabase/server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ProfileSettings } from './profile-settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    profile = data;
  }

  return (
    <div className="p-4 md:p-8 lg:p-10 min-h-screen bg-[#0f0f0f] text-zinc-100">
      <header className="mb-12 border-b border-white/10 pb-8">
        <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Studio Settings</h1>
        <p className="text-sm text-zinc-500 font-bold uppercase tracking-[0.25em] mt-1">Configure your personal workspace and preferences</p>
      </header>

      <Tabs defaultValue="profile" className="space-y-10">
        <TabsList className="bg-white/5 border border-white/10 rounded-full p-1 h-12 w-full max-w-3xl flex items-center justify-between">
          <TabsTrigger
            value="profile"
            className="flex-1 rounded-full h-9 text-[10px] font-black uppercase tracking-widest transition-all duration-300 data-[state=active]:bg-white data-[state=active]:text-zinc-950"
          >
            My Profile
          </TabsTrigger>
          <TabsTrigger
            value="appearance"
            className="flex-1 rounded-full h-9 text-[10px] font-black uppercase tracking-widest transition-all duration-300 data-[state=active]:bg-white data-[state=active]:text-zinc-950"
          >
            Appearance
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex-1 rounded-full h-9 text-[10px] font-black uppercase tracking-widest transition-all duration-300 data-[state=active]:bg-white data-[state=active]:text-zinc-950"
          >
            Notifications
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="flex-1 rounded-full h-9 text-[10px] font-black uppercase tracking-widest transition-all duration-300 data-[state=active]:bg-white data-[state=active]:text-zinc-950"
          >
            Security & Privacy
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <ProfileSettings profile={profile} />
          </div>
        </TabsContent>
        
        <TabsContent value="appearance" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border border-white/10 bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-10">
            <CardHeader className="p-0 mb-8">
              <CardTitle className="text-2xl font-black text-white tracking-tight">Interface Appearance</CardTitle>
              <CardDescription className="text-zinc-500 font-medium">
                Customize how the FALAQ workspace looks and feels on your devices.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[2rem] bg-white/[0.01]">
                <p className="text-zinc-600 font-black uppercase tracking-widest text-[10px]">Appearance presets under construction</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border border-white/10 bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-10">
            <CardHeader className="p-0 mb-8">
              <CardTitle className="text-2xl font-black text-white tracking-tight">Global Notifications</CardTitle>
              <CardDescription className="text-zinc-500 font-medium">
                Manage your notification preferences for tasks, projects and studio updates.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
               <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[2rem] bg-white/[0.01]">
                <p className="text-zinc-600 font-black uppercase tracking-widest text-[10px]">Notification channel settings under construction</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border border-white/10 bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-10">
            <CardHeader className="p-0 mb-8">
              <CardTitle className="text-2xl font-black text-white tracking-tight">Privacy & Credentials</CardTitle>
              <CardDescription className="text-zinc-500 font-medium">
                Adjust your authentication methods and manage account data visibility.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
               <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[2rem] bg-white/[0.01]">
                <p className="text-zinc-600 font-black uppercase tracking-widest text-[10px]">Security protocols configuration under construction</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
