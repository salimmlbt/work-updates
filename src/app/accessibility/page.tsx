
import { createServerClient } from '@/lib/supabase/server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AccessibilityClient } from './accessibility-client';

export const dynamic = 'force-dynamic';

async function getSettings() {
    const supabase = createServerClient();
    const { data: delayData } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'attachment_deletion_delay')
        .single();
    
    // Default to 5 minutes (300 seconds) if not set
    const delay = delayData?.value ? parseInt(delayData.value as string, 10) : 300;

    return {
        attachmentDeletionDelay: delay
    };
}


export default async function AccessibilityPage() {
  const settings = await getSettings();

  return (
    <div className="p-4 md:p-8 lg:p-10">
      <Card>
        <CardHeader>
          <CardTitle>Accessibility</CardTitle>
          <CardDescription>
            Manage accessibility and automation settings for the application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AccessibilityClient initialDelay={settings.attachmentDeletionDelay} />
        </CardContent>
      </Card>
    </div>
  );
}
