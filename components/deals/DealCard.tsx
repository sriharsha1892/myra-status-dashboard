'use client';

import { Building2, User, Calendar, DollarSign, Clock, ExternalLink } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import Avatar from '@/components/Avatar';
import Link from 'next/link';

interface DealCardProps {
  deal: {
    org_id: string;
    org_name: string;
    org_domain?: string;
    deal_status: string;
    opportunity_value: number | null;
    deal_value: number | null;
    deal_currency: string;
    expected_close_date: string | null;
    win_probability: number | null;
    status_updated_at: string | null;
    account_manager?: string;
    primary_contact?: string;
    primary_contact_email?: string;
    parent_company?: string;
  };
  onDragStart?: (e: React.DragEvent, dealId: string) => void;
  isDragging?: boolean;
}

export default function DealCard({ deal, onDragStart, isDragging }: DealCardProps) {
  const daysInStage = deal.status_updated_at
    ? differenceInDays(new Date(), new Date(deal.status_updated_at))
    : null;

  const formatCurrency = (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const displayValue = deal.deal_status === 'won'
    ? deal.deal_value
    : deal.opportunity_value;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, deal.org_id)}
      className={`
        bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing
        ${isDragging ? 'opacity-50 rotate-2 scale-105' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <Avatar name={deal.org_name} size="sm" type="org" />
        <div className="flex-1 min-w-0">
          <Link
            href={`/support/trials/${deal.org_id}`}
            className="text-sm font-semibold text-gray-900 hover:text-blue-600 truncate block"
          >
            {deal.org_name}
          </Link>
          {deal.org_domain && (
            <p className="text-xs text-gray-500 truncate">{deal.org_domain}</p>
          )}
        </div>
        <Link
          href={`/support/trials/${deal.org_id}`}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ExternalLink className="w-4 h-4 text-gray-400" />
        </Link>
      </div>

      {/* Deal Value */}
      {displayValue && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-green-50 rounded-lg">
          <DollarSign className="w-4 h-4 text-green-600" />
          <span className="text-sm font-bold text-green-700">
            {formatCurrency(displayValue, deal.deal_currency)}
          </span>
          {deal.win_probability !== null && (
            <span className="ml-auto text-xs text-green-600 font-medium">
              {deal.win_probability}%
            </span>
          )}
        </div>
      )}

      {/* Info Row */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        {deal.account_manager && (
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span className="truncate max-w-[100px]">{deal.account_manager}</span>
          </div>
        )}

        {daysInStage !== null && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{daysInStage}d</span>
          </div>
        )}

        {deal.expected_close_date && (
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{format(new Date(deal.expected_close_date), 'MMM dd')}</span>
          </div>
        )}

        {deal.parent_company && (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
            deal.parent_company === 'GMI'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-blue-100 text-blue-700'
          }`}>
            {deal.parent_company === 'Mordor Intelligence' ? 'MI' : deal.parent_company}
          </span>
        )}
      </div>

      {/* Primary Contact */}
      {deal.primary_contact && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
              <User className="w-3 h-3 text-gray-500" />
            </div>
            <span className="text-xs text-gray-600 truncate">{deal.primary_contact}</span>
          </div>
        </div>
      )}
    </div>
  );
}
