
'use client'

import { useState, useTransition, useEffect } from 'react';
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
    <div className="relative h-full flex flex-col rounded-3xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="p-6 bg-white/70 backdrop-blur-md border-b">
        <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
          Leave Management
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          View and track your leave history
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : leaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-2xl bg-slate-50 border border-dashed text-slate-400">
            <FileText className="h-12 w-12 mb-4 opacity-30" />
            <p className="font-medium">No leave requests yet</p>
          </div>
        ) : (
          <div className="space-y-4">

            {leaves.map((leave) => (
              <div
                key={leave.id}
                className="
                  group bg-white/80 backdrop-blur-sm
                  rounded-2xl p-5
                  shadow-sm hover:shadow-lg
                  transition-all duration-200
                  border border-slate-200/60
                "
              >
                <div className="flex items-start justify-between gap-4">

                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-900">
                        {leave.leave_type}
                      </span>
                      {getStatusBadge(leave.status)}
                    </div>

                    <p className="text-sm text-slate-500">
                      {format(parseISO(leave.start_date), 'dd MMM')} – {format(parseISO(leave.end_date), 'dd MMM yyyy')}
                    </p>

                    {leave.reason && (
                      <p className="text-xs text-slate-400 italic max-w-md line-clamp-1">
                        {leave.reason}
                      </p>
                    )}
                  </div>

                  {(leave.status === 'Pending' || leave.status === 'Approved') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="
                        text-rose-600 hover:bg-rose-50 hover:text-rose-700
                        rounded-full px-4
                      "
                      onClick={() => handleCancel(leave.id)}
                      disabled={isPending}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  )}

                </div>
              </div>
            ))}

          </div>
        )}
      </div>

      {/* Floating CTA */}
      <div className="absolute bottom-6 right-6">
        <Button
          size="lg"
          className="
            rounded-full h-14 px-7 gap-2
            shadow-xl
            bg-gradient-to-r from-blue-600 to-purple-600
            hover:from-blue-700 hover:to-purple-700
          "
          onClick={() => setIsApplyDialogOpen(true)}
        >
          <Plus className="h-5 w-5" />
          Apply Leave
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
