
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

export const dynamic = 'force-dynamic';

export default async function AccessibilityPage() {
    const supabase = await createServerClient();
    const { data: setting } = await supabase.from('app_settings').select('value').eq('key', 'lunch_start_time').single();
    const lunchStartTime = (setting?.value as string | undefined) || '13:00';

  return (
    <div className="p-4 md:p-8 lg:p-10">
      <Tabs defaultValue="set-times" className="space-y-4">
        <TabsList className="bg-transparent p-0 border-b rounded-none gap-6">
          <TabsTrigger
            value="set-times"
            className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent text-muted-foreground px-1 pb-2"
          >
            Set Times
          </TabsTrigger>
          <TabsTrigger
            value="cache-timer"
            className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent text-muted-foreground px-1 pb-2"
          >
            Cache Timer
          </TabsTrigger>
          <TabsTrigger
            value="types"
            className="data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent text-muted-foreground px-1 pb-2"
          >
            Types
          </TabsTrigger>
        </TabsList>
        <TabsContent value="set-times" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Set Times</CardTitle>
                    <CardDescription>
                        Configure various time-related settings for the application.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SetTimesForm currentLunchTime={lunchStartTime} />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="cache-timer" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Cache Timer</CardTitle>
              <CardDescription>
                Manage cache settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Cache timer settings will be here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="types" className="mt-6">
          <Tabs defaultValue="industry-type" className="space-y-4">
            <TabsList>
              <TabsTrigger value="industry-type">Industry type</TabsTrigger>
              <TabsTrigger value="work-type">Work type</TabsTrigger>
            </TabsList>
            <TabsContent value="industry-type">
              <Card>
                <CardHeader>
                  <CardTitle>Industry Types</CardTitle>
                  <CardDescription>Manage the types of industries for clients.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Industry type management will be here.</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="work-type">
              <Card>
                <CardHeader>
                  <CardTitle>Work Types</CardTitle>
                  <CardDescription>Manage the default work types for teams.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Work type management will be here.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
