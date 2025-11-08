
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function NotificationsPage() {
  return (
    <div className="p-4 md:p-8 lg:p-10">
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            This page is for displaying notification settings and history. For real-time updates, please use the bell icon in the sidebar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Full notification history will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
