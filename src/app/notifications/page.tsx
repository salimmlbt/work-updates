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
            Here are your recent notifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Notification content will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
