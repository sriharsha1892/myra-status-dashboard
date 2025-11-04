'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Search, Link as LinkIcon, Loader2 } from 'lucide-react';

type Ticket = Database['public']['Tables']['tickets']['Row'];

interface LinkTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTicketId: string;
  currentTicketNumber: string;
  onLinkCreated: (linkedTicketId: string, linkType: string, shouldMerge: boolean) => void;
}

const LINK_TYPES = [
  { value: 'related', label: 'Relates to', description: 'General relationship' },
  { value: 'blocks', label: 'Blocks', description: 'Current ticket blocks target' },
  { value: 'blocked_by', label: 'Blocked by', description: 'Current ticket is blocked by target' },
  { value: 'duplicate', label: 'Duplicate of', description: 'Mark current as duplicate' },
];

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'New':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'In Progress':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'Waiting on User':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'Resolved':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'Closed':
      return 'bg-gray-100 text-gray-600 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
};

export function LinkTicketModal({
  isOpen,
  onClose,
  currentTicketId,
  currentTicketNumber,
  onLinkCreated,
}: LinkTicketModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Ticket[]>([]);
  const [selectedLinkType, setSelectedLinkType] = useState('related');
  const [searching, setSearching] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const supabase = createClient();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Search with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('tickets')
          .select('*')
          .neq('id', currentTicketId)
          .or(`ticket_number.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,organization.ilike.%${searchQuery}%`)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        setSearchResults(data || []);
      } catch (error) {
        console.error('Error searching tickets:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, currentTicketId, supabase]);

  const handleSelectTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
  };

  const handleLink = () => {
    if (selectedTicket) {
      const shouldMerge = selectedLinkType === 'duplicate';
      onLinkCreated(selectedTicket.id, selectedLinkType, shouldMerge);
      handleClose();
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedTicket(null);
    setSelectedLinkType('related');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="large">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <LinkIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Link Ticket</h2>
            <p className="text-sm text-gray-600">
              Link {currentTicketNumber} to another ticket
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Link Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {LINK_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedLinkType(type.value)}
                  className={`p-3 border rounded-lg text-left transition-all ${
                    selectedLinkType === type.value
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-sm text-gray-900">
                    {type.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {type.description}
                  </div>
                </button>
              ))}
            </div>
            {selectedLinkType === 'duplicate' && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800">
                  <strong>Note:</strong> Marking as duplicate will allow you to merge the tickets, combining all comments and watchers.
                </p>
              </div>
            )}
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search for ticket
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter ticket number, description, or organization..."
                className="pl-10"
                fullWidth
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
              )}
            </div>
          </div>

          {/* Search Results */}
          {searchQuery.length >= 2 && (
            <div className="border border-gray-200 rounded-lg max-h-80 overflow-y-auto">
              {searching ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Searching tickets...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-500">No tickets found</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Try different search terms
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {searchResults.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => handleSelectTicket(ticket)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                        selectedTicket?.id === ticket.id ? 'bg-blue-50 hover:bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-900">
                              {ticket.ticket_number}
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${getStatusConfig(
                                ticket.status
                              )}`}
                            >
                              {ticket.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            {ticket.organization}
                          </p>
                          <p className="text-xs text-gray-500 line-clamp-2">
                            {ticket.description}
                          </p>
                        </div>
                        {selectedTicket?.id === ticket.id && (
                          <div className="flex-shrink-0">
                            <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                                <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected Ticket Preview */}
          {selectedTicket && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-medium text-blue-900 mb-1">
                Selected Ticket
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-blue-900">
                  {selectedTicket.ticket_number}
                </span>
                <span className="text-sm text-blue-700">
                  - {selectedTicket.organization}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleLink}
            disabled={!selectedTicket}
            leftIcon={<LinkIcon className="w-4 h-4" />}
          >
            {selectedLinkType === 'duplicate' ? 'Continue to Merge' : 'Link Ticket'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
