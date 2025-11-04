'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface MobileFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    status: string;
    priority: string;
    category: string;
  };
  onApply: (filters: { status: string; priority: string; category: string }) => void;
}

const STATUSES = ['All', 'New', 'In Progress', 'Waiting on User', 'Resolved', 'Closed'];
const PRIORITIES = ['All', 'Critical', 'High', 'Medium', 'Low'];
const CATEGORIES = ['All', 'Security', 'Tool Functioning', 'Feature Set', 'Usage', 'Requests', 'Data Quality', 'Performance', 'Feature Request', 'Other'];

export default function MobileFilters({ isOpen, onClose, filters, onApply }: MobileFiltersProps) {
  const [localFilters, setLocalFilters] = useState(filters);

  if (!isOpen) return null;

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleClear = () => {
    const clearedFilters = { status: 'All', priority: 'All', category: 'All' };
    setLocalFilters(clearedFilters);
    onApply(clearedFilters);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-2xl z-50 md:hidden animate-slide-up max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-4 space-y-6">
          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map(status => (
                <button key={status} onClick={() => setLocalFilters({ ...localFilters, status })}
                  className={'px-3 py-2 text-sm font-medium rounded-lg border transition-colors ' + (localFilters.status === status ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50')}>
                  {status}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">Priority</label>
            <div className="grid grid-cols-2 gap-2">
              {PRIORITIES.map(priority => (
                <button key={priority} onClick={() => setLocalFilters({ ...localFilters, priority })}
                  className={'px-3 py-2 text-sm font-medium rounded-lg border transition-colors ' + (localFilters.priority === priority ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50')}>
                  {priority}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">Category</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(category => (
                <button key={category} onClick={() => setLocalFilters({ ...localFilters, category })}
                  className={'px-3 py-2 text-sm font-medium rounded-lg border transition-colors ' + (localFilters.category === category ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50')}>
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-3">
          <button onClick={handleClear} className="flex-1 h-11 px-4 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
            Clear All
          </button>
          <button onClick={handleApply} className="flex-1 h-11 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
}
