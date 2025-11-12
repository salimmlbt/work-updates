
'use client';

import { useState, useMemo, useTransition } from 'react';
import {
  Plus,
  Search,
  MoreVertical,
  Phone,
  Briefcase,
  CheckSquare,
  Folder,
  ChevronDown,
  Pencil,
  Trash2,
  User,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getInitials, cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { ClientRow } from './client-row';


export default function ClientsPageClient({ initialClients, industries, allProjects, allTasks }: { initialClients: Client[], industries: Industry[], allProjects: Project[], allTasks: Task[] }) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [isAddClientOpen, setAddClientOpen] = useState(false);
  const [isEditClientOpen, setEditClientOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);


  const handleClientAdded = (newClient: Client) => {
    setClients(prevClients => [newClient, ...prevClients]);
  };

  const handleClientUpdated = (updatedClient: Client) => {
    setClients(prevClients => 
      prevClients.map(c => c.id === updatedClient.id ? updatedClient : c)
    );
  };

  const handleEditClick = (client: Client) => {
    setClientToEdit(client);
    setEditClientOpen(true);
  }

  const handleDeleteConfirm = (client: Client) => {
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

  const handleRowClick = (client: Client) => {
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
        <div className="mb-8">
            <button className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-3">
                <ChevronDown className="w-5 h-5" />
                All Clients
                <span className="text-sm font-normal text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{filteredClients.length}</span>
            </button>
            <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow className="border-b-0 hover:bg-transparent">
                        <TableHead className="w-1/4">Client Name</TableHead>
                        <TableHead className="w-1/5">Industry</TableHead>
                        <TableHead className="w-1/4">Contact Number</TableHead>
                        <TableHead>Projects</TableHead>
                        <TableHead>Tasks</TableHead>
                        <TableHead>WhatsApp</TableHead>
                        <TableHead className="w-[5%]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredClients.map(client => (
                        <ClientRow 
                            key={client.id} 
                            client={client}
                            industries={industries}
                            onEdit={handleEditClick}
                            onDeleteConfirm={handleDeleteConfirm}
                            onRowClick={handleRowClick}
                        />
                    ))}
                </TableBody>
                </Table>
            </div>
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
