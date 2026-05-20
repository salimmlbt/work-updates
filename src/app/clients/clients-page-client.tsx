
'use client';

import { useState, useMemo, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  MoreVertical,
  Briefcase,
  Folder,
  CheckSquare,
  Share,
  FileText,
  Pencil,
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getInitials, cn } from '@/lib/utils';
import { AddClientDialog } from './add-client-dialog';
import { EditClientDialog } from './edit-client-dialog';
import type { Client, Industry, Project, Task, ContentSchedule } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { deleteClient } from '@/app/actions';
import { ClientDetailSheet } from './client-detail-sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, parseISO } from 'date-fns';

type ClientWithStats = Client & {
    total_projects: number;
    completed_projects: number;
    total_tasks: number;
    completed_tasks: number;
    posting_tasks: number;
    extras: number;
    task_completion_percentage: number;
    total_schedules: number;
    completed_schedules: number;
}

const ClientCard = ({ client, onEdit, onDeleteConfirm, onRowClick }: { client: ClientWithStats, onEdit: (client: ClientWithStats) => void, onDeleteConfirm: (client: ClientWithStats) => void, onRowClick: (client: ClientWithStats) => void }) => {
    const pieData = [
        { name: 'Completed', value: client.task_completion_percentage },
        { name: 'Remaining', value: 100 - client.task_completion_percentage },
    ];
    const COLORS = ['#3b82f6', 'rgba(255, 255, 255, 0.05)'];

    return (
        <Card className="relative overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-2xl hover:shadow-[0_0_30px_rgba(56,189,248,0.1)] transition-all duration-300 flex flex-col rounded-2xl group">
             {/* Top Glow Bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-12 w-12 border border-white/10">
                    <AvatarImage src={client.avatar} alt={client.name} />
                    <AvatarFallback className="bg-zinc-800 text-zinc-400">{getInitials(client.name)}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="text-lg text-white font-bold tracking-tight">{client.name}</CardTitle>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">{client.industry}</p>
                </div>
            </CardHeader>
            <CardContent className="flex-grow grid grid-cols-2 gap-4">
                <div className="relative w-32 h-32 mx-auto">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={60}
                                startAngle={90}
                                endAngle={450}
                                paddingAngle={0}
                                dataKey="value"
                                stroke="none"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-black text-sky-400 tracking-tighter">{client.task_completion_percentage}%</span>
                        <span className="text-[10px] uppercase font-bold text-zinc-500">Done</span>
                    </div>
                </div>
                <div className="space-y-2 text-xs font-medium">
                    <div className="flex items-center gap-2 text-zinc-400">
                        <Folder className="h-4 w-4 text-purple-400" />
                        <span>Projects: <span className="text-white">{client.completed_projects}/{client.total_projects}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400">
                        <CheckSquare className="h-4 w-4 text-blue-400" />
                        <span>Tasks: <span className="text-white">{client.completed_tasks}/{client.total_tasks}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400">
                        <Calendar className="h-4 w-4 text-cyan-400" />
                        <span>Schedules: <span className="text-white">{client.completed_schedules}/{client.total_schedules}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400">
                        <Share className="h-4 w-4 text-emerald-400" />
                        <span>Posting: <span className="text-white">{client.posting_tasks}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400">
                        <FileText className="h-4 w-4 text-orange-400" />
                        <span>Extras: <span className="text-white">{client.extras}</span></span>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center bg-white/[0.02] border-t border-white/5 py-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-sky-400 hover:bg-white/5" onClick={(e) => e.stopPropagation()}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(client); }}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-400 focus:text-red-400 focus:bg-red-950/30" onClick={(e) => { e.stopPropagation(); onDeleteConfirm(client); }}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="link" className="text-sky-400 hover:text-sky-300 text-xs font-bold uppercase tracking-wider" onClick={() => onRowClick(client)}>View Details &rarr;</Button>
            </CardFooter>
        </Card>
    );
};


export default function ClientsPageClient({ initialClients, industries, allProjects, allTasks, selectedDate, prevMonth, nextMonth }: { initialClients: ClientWithStats[], industries: Industry[], allProjects: Project[], allTasks: Task[], selectedDate: string, prevMonth: string, nextMonth: string }) {
  const router = useRouter();
  const [clients, setClients] = useState<ClientWithStats[]>(initialClients);
  const [isAddClientOpen, setAddClientOpen] = useState(false);
  const [isEditClientOpen, setEditClientOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientToEdit, setClientToEdit] = useState<ClientWithStats | null>(null);
  const [clientToDelete, setClientToDelete] = useState<ClientWithStats | null>(null);
  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [selectedClient, setSelectedClient] = useState<ClientWithStats | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    setClients(initialClients);
  }, [initialClients]);


  const handleClientAdded = (newClient: Client) => {
     const newClientWithStats: ClientWithStats = {
      ...newClient,
      total_projects: 0,
      completed_projects: 0,
      total_tasks: 0,
      completed_tasks: 0,
      posting_tasks: 0,
      extras: 0,
      task_completion_percentage: 0,
      total_schedules: 0,
      completed_schedules: 0,
    };
    setClients(prevClients => [newClientWithStats, ...prevClients]);
  };

  const handleClientUpdated = (updatedClient: Client) => {
    setClients(prevClients => 
      prevClients.map(c => c.id === updatedClient.id ? { ...c, ...updatedClient } : c)
    );
  };

  const handleEditClick = (client: ClientWithStats) => {
    setClientToEdit(client);
    setEditClientOpen(true);
  }

  const handleDeleteConfirm = (client: ClientWithStats) => {
    setClientToDelete(client);
    setDeleteAlertOpen(true);
  }

  const handleDelete = () => {
    if (!clientToDelete) return;
    
    startTransition(async () => {
      const result = await deleteClient(clientToDelete.id);
      if (result.error) {
        toast({
          title: "Error deleting client",
          description: result.error,
          variant: 'destructive'
        })
      } else {
        toast({
          title: "Client deleted",
          description: `Successfully deleted ${clientToDelete.name}.`
        })
        setClients(prev => prev.filter(c => c.id !== clientToDelete.id));
        setDeleteAlertOpen(false);
        setClientToDelete(null);
      }
    });
  }

  const handleRowClick = (client: ClientWithStats) => {
    setSelectedClient(client);
    setIsSheetOpen(true);
  }


  const filteredClients = useMemo(() => {
    return clients.filter(client =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [clients, searchQuery]);

  return (
    <div className="bg-[#0f0f0f] p-4 md:p-8 lg:p-10 h-full w-full flex flex-col text-zinc-100">
      <header className="flex items-center justify-between pb-6 mb-6 border-b border-white/10">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-white">Clients</h1>
          <Button onClick={() => setAddClientOpen(true)} className="rounded-full bg-sky-600 hover:bg-sky-500 text-white shadow-[0_0_20px_rgba(56,189,248,0.3)]">
            <Plus className="mr-2 h-4 w-4" />
            Add new client
          </Button>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/5 rounded-full p-1 border border-white/10">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-zinc-400 hover:text-white" onClick={() => router.push(`/clients?month=${prevMonth}`)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-black w-32 text-center text-zinc-200">
                {format(parseISO(selectedDate), 'MMMM yyyy')}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-zinc-400 hover:text-white" onClick={() => router.push(`/clients?month=${nextMonth}`)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  type="text"
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 bg-white/5 border-white/10 text-white focus-visible:ring-sky-500/50 rounded-full pl-10 w-64"
                />
            </div>
            
            <Button variant="outline" className="rounded-full bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border-sky-500/20">
                <Filter className="mr-2 h-4 w-4" />
                Filter by industry
            </Button>
        </div>
      </header>

      <main className="flex-1 overflow-auto custom-scrollbar">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredClients.map(client => (
                <ClientCard 
                    key={client.id} 
                    client={client}
                    onEdit={handleEditClick}
                    onDeleteConfirm={handleDeleteConfirm}
                    onRowClick={handleRowClick}
                />
            ))}
            
            {filteredClients.length === 0 && (
                <div className="col-span-full py-32 text-center">
                    <p className="text-zinc-600 italic text-sm">No clients found matching your search.</p>
                </div>
            )}
        </div>
      </main>

      <AddClientDialog 
        isOpen={isAddClientOpen}
        setIsOpen={setAddClientOpen}
        onClientAdded={handleClientAdded}
        industries={industries}
      />
      {clientToEdit && (
        <EditClientDialog
            isOpen={isEditClientOpen}
            setIsOpen={setEditClientOpen}
            client={clientToEdit}
            onClientUpdated={handleClientUpdated}
            industries={industries}
        />
      )}
       <AlertDialog open={isDeleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
            <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription className="text-zinc-400">
                    This action cannot be undone. This will permanently delete the client
                    "{clientToDelete?.name}" and all associated data.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel className="bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700" onClick={() => setClientToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={handleDelete}
                    className={cn(buttonVariants({ variant: "destructive" }))}
                    disabled={isPending}
                >
                   {isPending ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {selectedClient && (
            <ClientDetailSheet
                client={selectedClient}
                isOpen={isSheetOpen}
                onOpenChange={setIsSheetOpen}
                projects={allProjects}
                tasks={allTasks}
            />
        )}
        
        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.1);
          }
        `}</style>
    </div>
  );
}
