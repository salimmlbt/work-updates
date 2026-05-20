'use client'

import dynamic from 'next/dynamic';
import { PageSkeleton } from '@/components/dashboard/page-skeleton';
import type { TaskWithDetails, Project, Client, Profile, WorkTypeStatusConfig } from '@/lib/types';

const TasksClient = dynamic(() => import('./tasks-client'), {
    ssr: false,
    loading: () => <PageSkeleton />
});

interface TasksPageLoaderProps {
    initialTasks: TaskWithDetails[];
    projects: Project[];
    clients: Client[];
    profiles: Profile[];
    currentUserProfile: Profile | null;
    highlightedTaskId?: string;
    workTypeStatusConfig: WorkTypeStatusConfig;
}

export default function TasksPageLoader(props: TasksPageLoaderProps) {
    return <TasksClient {...props} />;
}
