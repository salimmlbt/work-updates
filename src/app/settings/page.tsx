
'use client'

import { useState } from 'react'
import { User, Palette, Bell, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const settingsNav = [
  { title: 'My Profile', id: 'profile', icon: User },
  { title: 'Appearance', id: 'appearance', icon: Palette },
  { title: 'Notifications', id: 'notifications', icon: Bell },
  { title: 'Security & Privacy', id: 'security', icon: Lock },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <div className="p-4 md:p-8 lg:p-10">
        
        <div className="flex flex-col md:flex-row gap-8">
            <aside className="w-full md:w-1/4 lg:w-1/5">
                <nav className="flex flex-col gap-1">
                    {settingsNav.map((item) => (
                    <Button
                        key={item.id}
                        variant="ghost"
                        className={cn(
                            "justify-start",
                            activeTab === item.id && "bg-accent text-accent-foreground"
                        )}
                        onClick={() => setActiveTab(item.id)}
                    >
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.title}
                    </Button>
                    ))}
                </nav>
            </aside>

            <main className="flex-1">
                {activeTab === 'profile' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>My Profile</CardTitle>
                      <CardDescription>Update your personal information.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" defaultValue="John Doe" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" defaultValue="john.doe@example.com" />
                        </div>
                         <Separator />
                        <Button>Save Changes</Button>
                    </CardContent>
                  </Card>
                )}
                 {activeTab === 'appearance' && (
                  <Card>
                     <CardHeader>
                      <CardTitle>Appearance</CardTitle>
                      <CardDescription>Customize the look and feel of the application.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p>Appearance settings will be here.</p>
                    </CardContent>
                  </Card>
                )}
                 {activeTab === 'notifications' && (
                  <Card>
                     <CardHeader>
                      <CardTitle>Notifications</CardTitle>
                      <CardDescription>Manage your notification preferences.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p>Notification settings will be here.</p>
                    </CardContent>
                  </Card>
                )}
                 {activeTab === 'security' && (
                  <Card>
                     <CardHeader>
                      <CardTitle>Security & Privacy</CardTitle>
                      <CardDescription>Adjust your security and privacy settings.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p>Security & Privacy settings will be here.</p>
                    </CardContent>
                  </Card>
                )}
            </main>
        </div>
    </div>
  )
}
