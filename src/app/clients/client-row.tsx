
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TableCell, TableRow } from '@/components/ui/table';
import { cn, getInitials } from '@/lib/utils';
import { MoreVertical, Phone, Folder, CheckSquare, Pencil, Trash2 } from 'lucide-react';
import type { Client, Industry } from '@/lib/types';


const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="m12,0C5.373,0,0,5.373,0,12s5.373,12,12,12,12-5.373,12-12S18.627,0,12,0h0Zm.157,18.863h-.003c-1.174,0-2.328-.295-3.352-.854l-3.719.976.996-3.635c-.614-1.063-.937-2.27-.937-3.507.002-3.868,3.148-7.014,7.015-7.014,1.876,0,3.638.731,4.962,2.057,1.324,1.326,2.054,3.088,2.053,4.963-.001,3.868-3.149,7.014-7.015,7.014h0Zm.002-12.85c-3.216,0-5.832,2.615-5.833,5.83,0,1.102.308,2.175.891,3.103l.139.221-.589,2.151,2.206-.579.213.126c.895.531,1.921.812,2.968.813h.002c3.214,0,5.829-2.616,5.83-5.83,0-1.558-.605-3.023-1.706-4.125-1.101-1.102-2.565-1.709-4.122-1.71h0Zm3.429,8.337c-.146.41-.846.783-1.183.833-.302.045-.684.064-1.104-.069-.255-.081-.581-.188-.999-.369-1.758-.759-2.907-2.53-2.994-2.647-.088-.117-.716-.95-.716-1.813s.453-1.287.614-1.462c.161-.175.351-.219.467-.219s.234.001.336.006c.107.006.252-.041.394.301.146.351.497,1.214.541,1.302.044.088.073.19.015.307-.059.117-.088.19-.175.292-.088.102-.184.229-.263.307-.088.087-.179.182-.077.358.102.176.454.749.975,1.214.67.597,1.234.782,1.41.87.175.088.277.073.38-.044.103-.117.438-.512.555-.687.117-.176.234-.146.395-.088.16.059,1.022.482,1.198.57.175.088.292.131.336.204.044.073.044.424-.102.833h0Zm0,0" fill="#4CAF50"/>
    </svg>
  );

const industryColorMap = new Map<string, { light: string; dark: string }>();

const colors = [
  { light: 'bg-blue-100 text-blue-800', dark: 'dark:bg-blue-900/50 dark:text-blue-300' },
  { light: 'bg-red-100 text-red-800', dark: 'dark:bg-red-900/50 dark:text-red-300' },
  { light: 'bg-green-100 text-green-800', dark: 'dark:bg-green-900/50 dark:text-green-300' },
  { light: 'bg-yellow-100 text-yellow-800', dark: 'dark:bg-yellow-900/50 dark:text-yellow-300' },
  { light: 'bg-purple-100 text-purple-800', dark: 'dark:bg-purple-900/50 dark:text-purple-300' },
  { light: 'bg-pink-100 text-pink-800', dark: 'dark:bg-pink-900/50 dark:text-pink-300' },
  { light: 'bg-indigo-100 text-indigo-800', dark: 'dark:bg-indigo-900/50 dark:text-indigo-300' },
  { light: 'bg-orange-100 text-orange-800', dark: 'dark:bg-orange-900/50 dark:text-orange-300' },
];

const getIndustryColor = (industry: string, allIndustries: Industry[]) => {
  if (!industryColorMap.has(industry)) {
    const index = allIndustries.findIndex(i => i.name === industry);
    industryColorMap.set(industry, colors[index % colors.length]);
  }
  return industryColorMap.get(industry) || colors[0];
};

export const ClientRow = ({ 
    client, 
    industries,
    onEdit, 
    onDeleteConfirm,
    onRowClick
}: { 
    client: Client, 
    industries: Industry[],
    onEdit: (client: Client) => void,
    onDeleteConfirm: (client: Client) => void,
    onRowClick: (client: Client) => void
}) => {
  const industryColor = getIndustryColor(client.industry, industries);
  const displayIndustry = client.industry.replace(/\s*\(.*\)\s*/g, '');
  
  return (
    <TableRow 
        className="border-b border-gray-200 hover:bg-gray-50 group cursor-pointer"
        onClick={() => onRowClick(client)}
    >
        <TableCell>
            <div className="flex items-center gap-3">
                 <Avatar className="h-10 w-10">
                    <AvatarImage src={client.avatar} alt={client.name} />
                    <AvatarFallback>{getInitials(client.name)}</AvatarFallback>
                </Avatar>
                <span className="font-medium text-gray-800">{client.name}</span>
            </div>
        </TableCell>
        <TableCell>
            <Badge variant="outline" className={`border-0 ${industryColor.light} ${industryColor.dark}`}>{displayIndustry}</Badge>
        </TableCell>
        <TableCell>
            <div className="flex items-center gap-2 text-gray-600">
                <Phone className="h-4 w-4" />
                <span>{client.contact}</span>
            </div>
        </TableCell>
        <TableCell>
            <div className="flex items-center gap-2 text-gray-600">
                <Folder className="h-4 w-4" />
                <span className="font-medium">{client.projects_count ?? 0}</span>
            </div>
        </TableCell>
        <TableCell>
            <div className="flex items-center gap-2 text-gray-600">
                <CheckSquare className="h-4 w-4" />
                <span className="font-medium">{client.tasks_count ?? 0}</span>
            </div>
        </TableCell>
        <TableCell>
            {client.whatsapp && (
                <a href={client.whatsapp} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                    <WhatsAppIcon className="h-6 w-6" />
                </a>
            )}
        </TableCell>
        <TableCell>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(client); }}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-600"
                  onClick={(e) => { e.stopPropagation(); onDeleteConfirm(client); }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
    </TableRow>
  )
};
