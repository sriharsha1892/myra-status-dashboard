'use client';

import { memo, useMemo } from 'react';
import {
  FileText,
  Calendar,
  DollarSign,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Clock,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CONTRACT_TYPES,
  RENEWAL_STATUSES,
  PAYMENT_TERMS,
} from '@/lib/validation/schemas/trialOrganization';

type ContractType = (typeof CONTRACT_TYPES)[number];
type RenewalStatus = (typeof RENEWAL_STATUSES)[number];
type PaymentTerm = (typeof PAYMENT_TERMS)[number];

interface Contract {
  id: string;
  org_id: string;
  contract_type: ContractType | null;
  contract_start_date: string;
  contract_end_date: string;
  contract_value: number | null;
  mrr: number | null;
  arr: number | null;
  currency: string;
  payment_terms: PaymentTerm | null;
  auto_renewal: boolean;
  renewal_status: RenewalStatus | null;
  renewal_probability: number | null;
  renewal_notes: string | null;
  signed_date: string | null;
}

interface ContractCardProps {
  contract: Contract;
  className?: string;
  onEdit?: () => void;
}

const contractTypeConfig: Record<ContractType, { label: string; color: string }> = {
  annual: { label: 'Annual', color: 'bg-blue-100 text-blue-800' },
  multi_year: { label: 'Multi-Year', color: 'bg-purple-100 text-purple-800' },
  month_to_month: { label: 'Month-to-Month', color: 'bg-gray-100 text-gray-800' },
  pilot: { label: 'Pilot', color: 'bg-amber-100 text-amber-800' },
};

const renewalStatusConfig: Record<RenewalStatus, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  upcoming: {
    label: 'Upcoming',
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
  },
  in_negotiation: {
    label: 'In Negotiation',
    icon: RefreshCw,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
  },
  renewed: {
    label: 'Renewed',
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
  },
  churned: {
    label: 'Churned',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
  },
  expanded: {
    label: 'Expanded',
    icon: TrendingUp,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 border-emerald-200',
  },
};

const formatCurrency = (amount: number | null, currency: string = 'USD'): string => {
  if (amount === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getDaysUntilRenewal = (endDate: string): number => {
  const end = new Date(endDate);
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getRenewalUrgency = (daysUntil: number): { color: string; label: string } => {
  if (daysUntil < 0) return { color: 'text-red-600', label: 'Expired' };
  if (daysUntil <= 30) return { color: 'text-red-600', label: 'Critical' };
  if (daysUntil <= 60) return { color: 'text-amber-600', label: 'Urgent' };
  if (daysUntil <= 90) return { color: 'text-yellow-600', label: 'Approaching' };
  return { color: 'text-green-600', label: 'Healthy' };
};

export const ContractCard = memo(function ContractCard({
  contract,
  className,
  onEdit,
}: ContractCardProps) {
  const daysUntilRenewal = useMemo(
    () => getDaysUntilRenewal(contract.contract_end_date),
    [contract.contract_end_date]
  );
  const renewalUrgency = getRenewalUrgency(daysUntilRenewal);
  const typeConfig = contract.contract_type
    ? contractTypeConfig[contract.contract_type]
    : null;
  const renewalConfig = contract.renewal_status
    ? renewalStatusConfig[contract.renewal_status]
    : null;

  return (
    <div
      className={cn(
        'rounded-lg border bg-white p-5 shadow-sm',
        renewalConfig?.bgColor || 'border-gray-200',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <FileText className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Contract Details</h3>
            {typeConfig && (
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium',
                  typeConfig.color
                )}
              >
                {typeConfig.label}
              </span>
            )}
          </div>
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Edit
          </button>
        )}
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <DollarSign className="w-4 h-4 mx-auto text-gray-400 mb-1" />
          <div className="text-lg font-bold text-gray-900">
            {formatCurrency(contract.mrr, contract.currency)}
          </div>
          <div className="text-xs text-gray-500">MRR</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <TrendingUp className="w-4 h-4 mx-auto text-gray-400 mb-1" />
          <div className="text-lg font-bold text-gray-900">
            {formatCurrency(contract.arr, contract.currency)}
          </div>
          <div className="text-xs text-gray-500">ARR</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <FileText className="w-4 h-4 mx-auto text-gray-400 mb-1" />
          <div className="text-lg font-bold text-gray-900">
            {formatCurrency(contract.contract_value, contract.currency)}
          </div>
          <div className="text-xs text-gray-500">Contract Value</div>
        </div>
      </div>

      {/* Contract Dates */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <Calendar className="w-4 h-4 text-gray-400" />
        <span className="text-gray-600">
          {formatDate(contract.contract_start_date)} - {formatDate(contract.contract_end_date)}
        </span>
        {contract.auto_renewal && (
          <span className="ml-auto text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
            Auto-Renewal
          </span>
        )}
      </div>

      {/* Renewal Countdown */}
      <div
        className={cn(
          'flex items-center justify-between p-3 rounded-lg border mb-4',
          daysUntilRenewal <= 30 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
        )}
      >
        <div className="flex items-center gap-2">
          <Clock className={cn('w-4 h-4', renewalUrgency.color)} />
          <span className="text-sm font-medium text-gray-700">
            Renewal in
          </span>
        </div>
        <div className="text-right">
          <span className={cn('text-lg font-bold', renewalUrgency.color)}>
            {daysUntilRenewal < 0 ? 'Expired' : `${daysUntilRenewal} days`}
          </span>
          <span
            className={cn(
              'ml-2 text-xs px-2 py-0.5 rounded-full',
              daysUntilRenewal <= 30
                ? 'bg-red-100 text-red-700'
                : daysUntilRenewal <= 60
                ? 'bg-amber-100 text-amber-700'
                : 'bg-green-100 text-green-700'
            )}
          >
            {renewalUrgency.label}
          </span>
        </div>
      </div>

      {/* Renewal Status & Probability */}
      {(renewalConfig || contract.renewal_probability !== null) && (
        <div className="space-y-3">
          {renewalConfig && (
            <div className="flex items-center gap-2">
              <renewalConfig.icon className={cn('w-4 h-4', renewalConfig.color)} />
              <span className="text-sm font-medium text-gray-700">
                Status:
              </span>
              <span className={cn('text-sm font-semibold', renewalConfig.color)}>
                {renewalConfig.label}
              </span>
            </div>
          )}

          {contract.renewal_probability !== null && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Renewal Probability</span>
                <span
                  className={cn(
                    'text-sm font-bold',
                    contract.renewal_probability >= 70
                      ? 'text-green-600'
                      : contract.renewal_probability >= 40
                      ? 'text-amber-600'
                      : 'text-red-600'
                  )}
                >
                  {contract.renewal_probability}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    contract.renewal_probability >= 70
                      ? 'bg-green-500'
                      : contract.renewal_probability >= 40
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  )}
                  style={{ width: `${contract.renewal_probability}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {contract.renewal_notes && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Renewal Notes</p>
          <p className="text-sm text-gray-700">{contract.renewal_notes}</p>
        </div>
      )}
    </div>
  );
});

// Compact version for lists
interface ContractBadgeProps {
  contract: Contract;
  className?: string;
}

export const ContractBadge = memo(function ContractBadge({
  contract,
  className,
}: ContractBadgeProps) {
  const daysUntilRenewal = getDaysUntilRenewal(contract.contract_end_date);
  const renewalUrgency = getRenewalUrgency(daysUntilRenewal);
  const typeConfig = contract.contract_type
    ? contractTypeConfig[contract.contract_type]
    : null;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-white',
        className
      )}
    >
      {typeConfig && (
        <span className={cn('text-xs px-2 py-0.5 rounded-full', typeConfig.color)}>
          {typeConfig.label}
        </span>
      )}
      <span className="text-sm text-gray-600">
        {formatCurrency(contract.arr, contract.currency)}/yr
      </span>
      <span className="text-gray-300">|</span>
      <span className={cn('text-sm font-medium', renewalUrgency.color)}>
        {daysUntilRenewal < 0
          ? 'Expired'
          : daysUntilRenewal === 0
          ? 'Today'
          : `${daysUntilRenewal}d`}
      </span>
    </div>
  );
});

// Empty state when no contract exists
interface NoContractCardProps {
  onCreateContract?: () => void;
  className?: string;
}

export const NoContractCard = memo(function NoContractCard({
  onCreateContract,
  className,
}: NoContractCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border-2 border-dashed border-gray-200 p-6 text-center',
        className
      )}
    >
      <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <h3 className="text-sm font-medium text-gray-900 mb-1">No Contract</h3>
      <p className="text-xs text-gray-500 mb-4">
        This organization doesn't have an active contract yet.
      </p>
      {onCreateContract && (
        <button
          onClick={onCreateContract}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FileText className="w-4 h-4" />
          Create Contract
        </button>
      )}
    </div>
  );
});

// Renewal countdown widget for dashboards
interface RenewalCountdownProps {
  contracts: Contract[];
  daysThreshold?: number;
  className?: string;
}

export const RenewalCountdown = memo(function RenewalCountdown({
  contracts,
  daysThreshold = 90,
  className,
}: RenewalCountdownProps) {
  const upcomingRenewals = useMemo(() => {
    return contracts
      .map((c) => ({
        ...c,
        daysUntil: getDaysUntilRenewal(c.contract_end_date),
      }))
      .filter((c) => c.daysUntil >= 0 && c.daysUntil <= daysThreshold)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [contracts, daysThreshold]);

  const critical = upcomingRenewals.filter((c) => c.daysUntil <= 30).length;
  const urgent = upcomingRenewals.filter((c) => c.daysUntil > 30 && c.daysUntil <= 60).length;
  const approaching = upcomingRenewals.filter((c) => c.daysUntil > 60).length;

  return (
    <div className={cn('rounded-lg border bg-white p-4', className)}>
      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <RefreshCw className="w-4 h-4 text-gray-400" />
        Upcoming Renewals ({upcomingRenewals.length})
      </h3>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 rounded-lg bg-red-50">
          <div className="text-xl font-bold text-red-600">{critical}</div>
          <div className="text-xs text-red-600">Critical (30d)</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-amber-50">
          <div className="text-xl font-bold text-amber-600">{urgent}</div>
          <div className="text-xs text-amber-600">Urgent (60d)</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-green-50">
          <div className="text-xl font-bold text-green-600">{approaching}</div>
          <div className="text-xs text-green-600">Approaching (90d)</div>
        </div>
      </div>

      {upcomingRenewals.slice(0, 5).map((contract) => {
        const urgency = getRenewalUrgency(contract.daysUntil);
        return (
          <div
            key={contract.id}
            className="flex items-center justify-between py-2 border-t border-gray-100"
          >
            <span className="text-sm text-gray-700 truncate flex-1">
              {contract.org_id}
            </span>
            <span className={cn('text-sm font-medium ml-2', urgency.color)}>
              {contract.daysUntil}d
            </span>
          </div>
        );
      })}
    </div>
  );
});
