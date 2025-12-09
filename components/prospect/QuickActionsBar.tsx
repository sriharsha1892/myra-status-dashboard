'use client';

import { Phone, Mail, Video, FileText, MessageSquare, Calendar, Sparkles } from 'lucide-react';

interface QuickActionsBarProps {
  onLogCall?: () => void;
  onSendEmail?: () => void;
  onScheduleMeeting?: () => void;
  onAddNote?: () => void;
  onLogActivity?: () => void;
  onAIAssist?: () => void;
}

export default function QuickActionsBar({
  onLogCall,
  onSendEmail,
  onScheduleMeeting,
  onAddNote,
  onLogActivity,
  onAIAssist,
}: QuickActionsBarProps) {
  const actions = [
    { icon: Phone, label: 'Log Call', onClick: onLogCall, color: 'text-green-600 hover:bg-green-50' },
    { icon: Mail, label: 'Email', onClick: onSendEmail, color: 'text-blue-600 hover:bg-blue-50' },
    { icon: Video, label: 'Meeting', onClick: onScheduleMeeting, color: 'text-purple-600 hover:bg-purple-50' },
    { icon: MessageSquare, label: 'Note', onClick: onAddNote, color: 'text-amber-600 hover:bg-amber-50' },
    { icon: Calendar, label: 'Activity', onClick: onLogActivity, color: 'text-indigo-600 hover:bg-indigo-50' },
    { icon: Sparkles, label: 'AI Assist', onClick: onAIAssist, color: 'text-pink-600 hover:bg-pink-50' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>
        </div>
      </div>

      {/* Actions Grid */}
      <div className="p-3 grid grid-cols-3 gap-2">
        {actions.map(({ icon: Icon, label, onClick, color }) => (
          <button
            key={label}
            onClick={onClick}
            disabled={!onClick}
            className={`
              flex flex-col items-center gap-1.5 p-3 rounded-lg transition-all
              ${onClick ? `${color} cursor-pointer` : 'text-gray-300 cursor-not-allowed'}
              disabled:opacity-50
            `}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
