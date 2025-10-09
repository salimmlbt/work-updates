
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProjectTypes() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
        <aside className="md:col-span-1">
            <h2 className="text-lg font-bold mb-4">Project Type</h2>
            {/* Sidebar content will go here */}
        </aside>
        <main className="md:col-span-3">
            <Card>
                <CardHeader>
                    <CardTitle>Project Types</CardTitle>
                    <CardDescription>
                        Manage your project types here.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Details about project types will be displayed here.</p>
                </CardContent>
            </Card>
        </main>
    </div>
  );
}
