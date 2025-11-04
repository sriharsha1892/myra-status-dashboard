'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { AlertTriangle, GitMerge, MessageSquare, Eye, Check } from 'lucide-react';

type Ticket = Database['public']['Tables']['tickets']['Row'];
type TicketComment = Database['public']['Tables']['ticket_comments']['Row'];

interface MergeTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTicket: Ticket;
  targetTicket: Ticket;
  onConfirmMerge: () => void;
  onSkipMerge: () => void;
}

export function MergeTicketsModal({
  isOpen,
  onClose,
  currentTicket,
  targetTicket,
  onConfirmMerge,
  onSkipMerge,
}: MergeTicketsModalProps) {
  const [shouldMerge, setShouldMerge] = useState(true);
  const [currentComments, setCurrentComments] = useState<TicketComment[]>([]);
  const [targetComments, setTargetComments] = useState<TicketComment[]>([]);
  const [currentWatchers, setCurrentWatchers] = useState<string[]>([]);
  const [targetWatchers, setTargetWatchers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      fetchMergePreview();
    }
  }, [isOpen, currentTicket.id, targetTicket.id]);

  const fetchMergePreview = async () => {
    setLoading(true);
    try {
      // Fetch comments for both tickets
      const [currentCommentsRes, targetCommentsRes] = await Promise.all([
        supabase
          .from('ticket_comments')
          .select('*')
          .eq('ticket_id', currentTicket.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('ticket_comments')
          .select('*')
          .eq('ticket_id', targetTicket.id)
          .order('created_at', { ascending: true }),
      ]);

      setCurrentComments(currentCommentsRes.data || []);
      setTargetComments(targetCommentsRes.data || []);

      // Fetch watchers for both tickets
      const [currentWatchersRes, targetWatchersRes] = await Promise.all([
        supabase
          .from('ticket_watchers')
          .select('user_id')
          .eq('ticket_id', currentTicket.id),
        supabase
          .from('ticket_watchers')
          .select('user_id')
          .eq('ticket_id', targetTicket.id),
      ]);

      setCurrentWatchers(currentWatchersRes.data?.map(w => w.user_id) || []);
      setTargetWatchers(targetWatchersRes.data?.map(w => w.user_id) || []);
    } catch (error) {
      console.error('Error fetching merge preview:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalComments = currentComments.length + targetComments.length;
  const uniqueWatchers = new Set([...currentWatchers, ...targetWatchers]);
  const totalWatchers = uniqueWatchers.size;

  const handleConfirm = () => {
    if (shouldMerge) {
      onConfirmMerge();
    } else {
      onSkipMerge();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="large">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
            <GitMerge className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Merge Duplicate Tickets</h2>
            <p className="text-sm text-gray-600">
              Combine data from both tickets
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center">
            <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-2"></div>
            <p className="text-sm text-gray-500">Loading merge preview...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Merge Option Checkbox */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    checked={shouldMerge}
                    onChange={(e) => setShouldMerge(e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">
                    Merge tickets and combine all data
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    If unchecked, tickets will only be linked without merging data
                  </p>
                </div>
              </label>
            </div>

            {shouldMerge && (
              <>
                {/* Tickets Being Merged */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900">Tickets</h3>

                  {/* Target Ticket (Parent) */}
                  <div className="p-4 border-2 border-purple-200 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-purple-600 text-white">Parent Ticket</Badge>
                      <span className="text-sm font-semibold text-gray-900">
                        {targetTicket.ticket_number}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">
                      {targetTicket.organization}
                    </p>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {targetTicket.description}
                    </p>
                  </div>

                  {/* Current Ticket (Child) */}
                  <div className="p-4 border border-gray-200 bg-white rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-gray-500 text-white">Will be Closed</Badge>
                      <span className="text-sm font-semibold text-gray-900">
                        {currentTicket.ticket_number}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">
                      {currentTicket.organization}
                    </p>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {currentTicket.description}
                    </p>
                  </div>
                </div>

                {/* Merge Preview */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900">What will be merged</h3>

                  <div className="space-y-2">
                    {/* Comments */}
                    <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <MessageSquare className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900">
                          {totalComments} comment{totalComments !== 1 ? 's' : ''} will be merged
                        </p>
                        <p className="text-xs text-blue-700">
                          {currentComments.length} from {currentTicket.ticket_number} + {targetComments.length} from {targetTicket.ticket_number}
                        </p>
                      </div>
                      <Check className="w-5 h-5 text-blue-600" />
                    </div>

                    {/* Watchers */}
                    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <Eye className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-900">
                          {totalWatchers} watcher{totalWatchers !== 1 ? 's' : ''} will be combined
                        </p>
                        <p className="text-xs text-green-700">
                          All unique watchers from both tickets
                        </p>
                      </div>
                      <Check className="w-5 h-5 text-green-600" />
                    </div>

                    {/* Ticket Numbers */}
                    <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <GitMerge className="w-5 h-5 text-purple-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-purple-900">
                          Both ticket numbers will be preserved
                        </p>
                        <p className="text-xs text-purple-700">
                          {targetTicket.ticket_number} will show "merged from {currentTicket.ticket_number}"
                        </p>
                      </div>
                      <Check className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-900">
                        Warning: This action cannot be undone
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        {currentTicket.ticket_number} will be marked as closed and all its data will be merged into {targetTicket.ticket_number}.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {!shouldMerge && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  The tickets will be linked as duplicates without merging data. Both tickets will remain open and separate.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={loading}
            leftIcon={shouldMerge ? <GitMerge className="w-4 h-4" /> : undefined}
            className={shouldMerge ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            {shouldMerge ? 'Merge & Link' : 'Link Only'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
