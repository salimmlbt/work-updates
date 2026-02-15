
'use client'

import { useState, useTransition, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, XCircle, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { Leave } from '@/lib/types';
import { cancelLeave } from './actions';
import { useToast } from '@/hooks/use-toast';
import { ApplyLeaveDialog } from './apply-leave-dialog';
import { createClient } from '@/lib/supabase/client';

export function LeaveSection() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const supabase = createClient();

  const fetchLeaves = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('leaves')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setLeaves(data as Leave[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleCancel = (id: string) => {
    startTransition(async () => {
      const result = await cancelLeave(id);
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      } else {
        toast({ title: 'Cancelled', description: 'Leave request has been cancelled.' });
        fetchLeaves();
      }
    });
  };

  const getStatusBadge = (status: Leave['status']) => {
    switch (status) {
      case 'Approved': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Approved</Badge>;
      case 'Rejected': return <Badge variant="destructive">Rejected</Badge>;
      case 'Cancelled': return <Badge variant="secondary">Cancelled</Badge>;
      default: return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Pending</Badge>;
    }
  };

  return (
    <div className="relative h-full flex flex-col">
      <CardHeader>
        <CardTitle>Leave Management</CardTitle>
        <CardDescription>View and track your leave history.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : leaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-slate-50/50 rounded-xl border-2 border-dashed">
            <FileText className="h-12 w-12 mb-4 opacity-20" />
            <p>No leave requests found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {leaves.map((leave) => (
              <div key={leave.id} className="flex items-center justify-between p-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition-all">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900">{leave.leave_type}</span>
                    {getStatusBadge(leave.status)}
                  </div>
                  <p className="text-sm text-slate-500 font-medium">
                    {format(parseISO(leave.start_date), 'dd MMM')} - {format(parseISO(leave.end_date), 'dd MMM yyyy')}
                  </p>
                  {leave.reason && <p className="text-xs text-slate-400 italic line-clamp-1 max-w-md">{leave.reason}</p>}
                </div>
                {(leave.status === 'Pending' || leave.status === 'Approved') && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    onClick={() => handleCancel(leave.id)}
                    disabled={isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Floating Action Button */}
      <div className="absolute bottom-8 right-8">
        <Button 
          size="lg" 
          className="rounded-full shadow-lg h-14 px-6 gap-2"
          onClick={() => setIsApplyDialogOpen(true)}
        >
          <Plus className="h-5 w-5" />
          Apply for Leave
        </Button>
      </div>

      <ApplyLeaveDialog 
        isOpen={isApplyDialogOpen} 
        setIsOpen={setIsApplyDialogOpen} 
        onSuccess={fetchLeaves} 
      />
    </div>
  );
}
