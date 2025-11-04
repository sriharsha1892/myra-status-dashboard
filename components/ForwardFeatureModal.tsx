// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface ForwardFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  featureId: string;
  featureTitle: string;
  onSuccess: () => void;
}

interface RoadmapItem {
  id: string;
  title: string;
  status: string;
  priority: string;
}

export default function ForwardFeatureModal({
  isOpen,
  onClose,
  orgId,
  featureId,
  featureTitle,
  onSuccess,
}: ForwardFeatureModalProps) {
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState('');
  const [contextNotes, setContextNotes] = useState('');
  const [customerImpact, setCustomerImpact] = useState('');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [loading, setLoading] = useState(false);
  const [roadmapLoading, setRoadmapLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      fetchRoadmapItems();
    }
  }, [isOpen]);

  const fetchRoadmapItems = async () => {
    setRoadmapLoading(true);
    try {
      const { data, error } = await supabase
        .from('org_product_roadmap')
        .select('id, title, status, priority')
        .eq('org_id', orgId)
        .order('target_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      setRoadmapItems(data || []);
    } catch (error: any) {
      console.error('Error fetching roadmap:', error);
      toast.error('Failed to load roadmap items');
    } finally {
      setRoadmapLoading(false);
    }
  };

  const handleForward = async () => {
    if (!selectedRoadmapId || !contextNotes.trim()) {
      toast.error('Please select a roadmap item and add context notes');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('roadmap_forwards').insert({
        org_id: orgId,
        feature_request_id: featureId,
        roadmap_item_id: selectedRoadmapId,
        context_notes: contextNotes,
        customer_impact: customerImpact || null,
        urgency,
        forwarded_by: (await supabase.auth.getUser()).data.user?.id,
      });

      if (error) throw error;

      toast.success('Feature forwarded successfully!');
      onSuccess();
      onClose();
      setContextNotes('');
      setCustomerImpact('');
      setUrgency('medium');
      setSelectedRoadmapId('');
    } catch (error: any) {
      console.error('Error forwarding feature:', error);
      toast.error('Failed to forward feature');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Forward Feature Request</h2>
            <p className="text-sm text-blue-100 mt-1">Connect "{featureTitle}" to a roadmap item</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-all"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Feature Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900 font-medium">Feature: {featureTitle}</p>
          </div>

          {/* Roadmap Item Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Select Roadmap Item *
            </label>
            <select
              value={selectedRoadmapId}
              onChange={(e) => setSelectedRoadmapId(e.target.value)}
              disabled={roadmapLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">
                {roadmapLoading ? 'Loading roadmap items...' : 'Choose a roadmap item...'}
              </option>
              {roadmapItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>

          {/* Context Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Context & Rationale *
            </label>
            <textarea
              value={contextNotes}
              onChange={(e) => setContextNotes(e.target.value)}
              placeholder="Why should this feature be included in this roadmap item? What's the business justification?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">
              {contextNotes.length}/300 characters
            </p>
          </div>

          {/* Customer Impact */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Customer Impact
            </label>
            <textarea
              value={customerImpact}
              onChange={(e) => setCustomerImpact(e.target.value)}
              placeholder="How does this feature impact the customer? What problem does it solve?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
            />
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Urgency
            </label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high', 'critical'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setUrgency(level)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    urgency === level
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleForward}
            disabled={loading || !selectedRoadmapId || !contextNotes.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 transition-all"
          >
            {loading ? 'Forwarding...' : 'Forward to Admin'}
          </button>
        </div>
      </div>
    </div>
  );
}
