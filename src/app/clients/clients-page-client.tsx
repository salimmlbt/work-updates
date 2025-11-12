
'use client';

import { useState, useMemo, useTransition } from 'react';
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
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getInitials, cn } from '@/lib/utils';
import { AddClientDialog } from './add-client-dialog';
import { EditClientDialog } from './edit-client-dialog';
import type { Client, Industry, Project, Task } from '@/lib/types';
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

type ClientWithStats = Client & {
    total_projects: number;
    completed_projects: number;
    total_tasks: number;
    completed_tasks: number;
    posting_tasks: number;
    extras: number;
    task_completion_percentage: number;
}

const ClientCard = ({ client, onEdit, onDeleteConfirm, onRowClick }: { client: ClientWithStats, onEdit: (client: ClientWithStats) => void, onDeleteConfirm: (client: ClientWithStats) => void, onRowClick: (client: ClientWithStats) => void }) => {
    const pieData = [
        { name: 'Completed', value: client.task_completion_percentage },
        { name: 'Remaining', value: 100 - client.task_completion_percentage },
    ];
    const COLORS = ['#3b82f6', '#e5e7eb'];

    return (
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col">
            <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-12 w-12">
                    <AvatarImage src={client.avatar} alt={client.name} />
                    <AvatarFallback>{getInitials(client.name)}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="text-lg">{client.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{client.industry}</p>
                </div>
            </CardHeader>
            <CardContent className="flex-grow grid grid-cols-2 gap-4">
                <div className="relative w-28 h-28">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={45}
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
                        <span className="text-2xl font-bold text-primary">{client.task_completion_percentage}%</span>
                        <span className="text-xs text-muted-foreground">Completed</span>
                    </div>
                </div>
                <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                        <Folder className="h-4 w-4 text-purple-500" />
                        <span>Projects: {client.completed_projects}/{client.total_projects}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-blue-500" />
                        <span>Tasks: {client.completed_tasks}/{client.total_tasks}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Share className="h-4 w-4 text-green-500" />
                        <span>Posting: {client.posting_tasks}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-orange-500" />
                        <span>Extras: {client.extras}</span>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(client); }}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={(e) => { e.stopPropagation(); onDeleteConfirm(client); }}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="link" onClick={() => onRowClick(client)}>View Details &rarr;</Button>
            </CardFooter>
        </Card>
    );
};


export default function ClientsPageClient({ initialClients, industries, allProjects, allTasks }: { initialClients: ClientWithStats[], industries: Industry[], allProjects: Project[], allTasks: Task[] }) {
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
    <>
    <div className="bg-background p-6 rounded-lg h-full w-full">
      <header className="flex items-center justify-between pb-4 mb-4 border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Clients</h1>
          <Button onClick={() => setAddClientOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add new client
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {isSearchOpen ? (
              <Input
                type="text"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => {if(!searchQuery) setIsSearchOpen(false)}}
                className="h-9"
                autoFocus
              />
            ) : (
              <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(true)}>
                <Search className="h-5 w-5" />
              </Button>
            )}
          <Button variant="outline"><Briefcase className="mr-2 h-4 w-4" />Filter by industry</Button>
        </div>
      </header>

      <main>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredClients.map(client => (
                <ClientCard 
                    key={client.id} 
                    client={client}
                    onEdit={handleEditClick}
                    onDeleteConfirm={handleDeleteConfirm}
                    onRowClick={handleRowClick}
                />
            ))}
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
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the client
                    "{clientToDelete?.name}" and all associated data.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setClientToDelete(null)}>Cancel</AlertDialogCancel>
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
    </div>
    </>
  );
}
