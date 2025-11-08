
'use client'

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import type { TaskWithDetails, Project, Client, Profile } from '@/lib/types';

const TasksClient = dynamic(() => import('./tasks-client'), {
    ssr: false,
    loading: () => (
        <div className="p-6 h-full">
            <div className="flex items-center justify-between pb-4 mb-4 border-b">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-40" />
                </div>
            </div>
            <div className="space-y-8">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <div className="border rounded-lg">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                </div>
            </div>
        </div>
    )
});

interface TasksPageLoaderProps {
    initialTasks: TaskWithDetails[];
    projects: Project[];
    clients: Client[];
    profiles: Profile[];
    currentUserProfile: Profile | null;
    initialSelectedTask: TaskWithDetails | null;
}

export default function TasksPageLoader(props: TasksPageLoaderProps) {
    return <TasksClient {...props} />;
}
