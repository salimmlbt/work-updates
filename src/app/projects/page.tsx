
import { createServerClient } from '@/lib/supabase/server';
import ProjectsClient from './projects-client';
import ProjectTypes from './project-types';
import type { Profile, Client } from '@/lib/types';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Project } from '@/lib/types';
import type { User } from '@supabase/supabase-js';

type ProjectWithOwner = Project & {
    owner: {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
    } | null;
    client: {
        id: string;
        name: string;
    } | null;
};

interface ProjectsPageProps {
  initialProjects: ProjectWithOwner[];
  currentUser: User | null;
  profiles: Profile[];
  clients: Client[];
}

const ProjectSidebar = ({ activeView, setActiveView }: { activeView: string, setActiveView: (view: string) => void }) => {
    const navItems = [
        { id: 'general', label: 'General' },
        { id: 'project-type', label: 'Project Type' },
    ];
    return (
        <aside className="md:col-span-1">
            <h2 className="text-lg font-bold mb-4">Projects</h2>
            <nav className="space-y-1">
                {navItems.map(item => (
                    <div
                        key={item.id}
                        role="button"
                        onClick={() => setActiveView(item.id)}
                        className={cn(
                            buttonVariants({ variant: 'ghost' }),
                            'w-full justify-start text-left h-auto pr-8 group',
                            activeView === item.id
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                                : 'hover:bg-accent'
                        )}
                    >
                       {item.label}
                    </div>
                ))}
            </nav>
        </aside>
    )
}


export default function ProjectsPage({ initialProjects = [], currentUser, profiles, clients }: ProjectsPageProps) {
  const [activeView, setActiveView] = useState('general');

  return (
    <div className="p-4 md:p-8 lg:p-10">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
        <ProjectSidebar activeView={activeView} setActiveView={setActiveView} />
        <main className="md:col-span-3">
            {activeView === 'general' && (
                <ProjectsClient 
                  initialProjects={initialProjects as any} 
                  currentUser={currentUser} 
                  profiles={profiles as Profile[] ?? []}
                  clients={clients as Client[] ?? []}
                />
            )}
            {activeView === 'project-type' && (
                <ProjectTypes />
            )}
        </main>
      </div>
    </div>
  );
}
